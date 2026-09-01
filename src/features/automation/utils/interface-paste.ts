/**
 * Parse an ABI or IDL the way people actually have one to hand.
 *
 * WHY STRICT JSON.parse IS THE WRONG GATE
 *
 * An ABI lives in three places and only two of them are JSON. Etherscan gives
 * you JSON; Foundry's `out/*.json` gives you JSON; but the copy most developers
 * reach for first is the one already in their frontend —
 *
 *     export const goldgardHookAbi = [
 *       { type: "function", name: "premiumBps", inputs: [], ... },
 *     ] as const;
 *
 * — which is a TypeScript object literal: unquoted keys, trailing commas, often
 * single quotes and comments. `JSON.parse` rejects it at the first key with
 * "Expected property name or '}' at position 10", which is accurate and tells
 * the user nothing about what to do. They then have to hand-edit a
 * thousand-line file to add quotes. That is a terrible way to spend an evening
 * and an excellent way to introduce a typo we then store for everyone.
 *
 * WHY THIS IS A SCANNER AND NOT `eval` OR `new Function`
 *
 * The obvious way to read a JS literal is to execute it. This text is pasted
 * from an explorer, a chat message, or a repo nobody here has read — executing
 * it would be arbitrary code execution triggered by a paste. So this walks the
 * characters and rewrites them instead. It cannot run anything.
 *
 * WHY IT IS ALSO NOT A REGEX
 *
 * Every transform here is conditional on NOT being inside a string, and a
 * string in an ABI can contain `:`, `,`, `//` and braces — a `name` can be any
 * identifier the author chose. A regex has no notion of that context, so it
 * would corrupt exactly the fields we most need intact. The scanner tracks
 * string state, which is the whole reason it exists.
 */

export type JsonishResult =
  | { ok: true; value: unknown; usedFallback: boolean }
  | { ok: false; message: string };

const IDENT_START = /[A-Za-z_$]/;
const IDENT_BODY = /[A-Za-z0-9_$]/;

/**
 * Rewrite a JS-style object literal into JSON. Returns the text unchanged in
 * every case it does not recognise — this only ever removes syntax JSON cannot
 * express, never reinterprets a value.
 */
function toJson(source: string): string {
  let text = source.trim();

  // `export const fooAbi = [...] as const;` — strip the declaration wrapper so
  // a straight copy of the whole line works. Anchored, so a stray "const" in a
  // string is untouched.
  text = text.replace(
    /^(?:export\s+)?(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?::[^=]+)?=\s*/,
    ""
  );
  text = text.replace(/\s*as\s+const\s*;?\s*$/, "");
  text = text.replace(/;\s*$/, "");

  let out = "";
  let i = 0;

  /** Index of the next character that is not whitespace or a comment. */
  const nextMeaningful = (from: number): number => {
    let j = from;
    while (j < text.length) {
      const c = text[j];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        j += 1;
      } else if (c === "/" && text[j + 1] === "/") {
        while (j < text.length && text[j] !== "\n") j += 1;
      } else if (c === "/" && text[j + 1] === "*") {
        j += 2;
        while (j < text.length && !(text[j] === "*" && text[j + 1] === "/"))
          j += 1;
        j += 2;
      } else {
        return j;
      }
    }
    return j;
  };

  while (i < text.length) {
    const c = text[i];

    // Comments: dropped entirely. Common in hand-maintained ABI files.
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/"))
        i += 1;
      i += 2;
      continue;
    }

    // Double-quoted string: copied through verbatim, escapes included. This is
    // the branch that makes everything else safe.
    if (c === '"') {
      out += c;
      i += 1;
      while (i < text.length) {
        out += text[i];
        if (text[i] === "\\") {
          i += 1;
          if (i < text.length) out += text[i];
          i += 1;
          continue;
        }
        if (text[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    // Single-quoted string: re-emitted as a JSON string. An inner `"` has to be
    // escaped, and an escaped `\'` becomes a plain `'`, which JSON forbids
    // escaping.
    if (c === "'") {
      out += '"';
      i += 1;
      while (i < text.length && text[i] !== "'") {
        if (text[i] === "\\") {
          const next = text[i + 1];
          out += next === "'" ? "'" : text[i] + (next ?? "");
          i += 2;
          continue;
        }
        out += text[i] === '"' ? '\\"' : text[i];
        i += 1;
      }
      i += 1;
      out += '"';
      continue;
    }

    // Bare identifier. Quoted only when it is a KEY — i.e. followed by `:` —
    // so `true`, `false` and `null` stay literals rather than turning into
    // strings, which would change what the value means.
    if (IDENT_START.test(c)) {
      let ident = "";
      while (i < text.length && IDENT_BODY.test(text[i])) {
        ident += text[i];
        i += 1;
      }
      out += text[nextMeaningful(i)] === ":" ? `"${ident}"` : ident;
      continue;
    }

    // Trailing comma before a closing bracket: legal in JS, not in JSON.
    if (c === ",") {
      const next = text[nextMeaningful(i + 1)];
      if (next === "}" || next === "]") {
        i += 1;
        continue;
      }
    }

    out += c;
    i += 1;
  }

  return out;
}

/**
 * Try strict JSON first, then the tolerant path. `usedFallback` lets the UI say
 * that the paste was read as a JS literal, so a normalised save is never
 * silent — the user should know the stored artifact is not byte-identical to
 * what they pasted.
 */
export function parseJsonish(text: string): JsonishResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: "Nothing pasted yet." };

  try {
    return { ok: true, value: JSON.parse(trimmed), usedFallback: false };
  } catch (strictError) {
    try {
      return {
        ok: true,
        value: JSON.parse(toJson(trimmed)),
        usedFallback: true,
      };
    } catch {
      // Report the STRICT error, not the fallback's. The fallback ran over
      // rewritten text, so its positions refer to a string the user has never
      // seen and cannot navigate to.
      return {
        ok: false,
        message:
          strictError instanceof Error ? strictError.message : "Not valid JSON",
      };
    }
  }
}
