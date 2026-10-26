import type { GlossaryKey } from "@/onchain-suite-website/types/retention-playbook";

/**
 * One run of text: plain, bold, hand-underlined, a glossary term, or a mix
 * (a bold glossary term, an underlined glossary term).
 */
export interface RichSegment {
  text: string;
  bold?: boolean;
  underline?: boolean;
  term?: GlossaryKey;
}

/**
 * Word forms that count as a use of each glossary term. "trigger" only matches
 * the noun-like singular, so the verb in "the price that triggers liquidation"
 * is left alone, and "suppression" only matches the noun, not "suppress".
 * When two terms overlap ("retention trigger" holds "trigger"), the earlier
 * match wins, which is the longer term.
 */
export const GLOSSARY_PATTERNS: Record<GlossaryKey, RegExp> = {
  "zero-knowledge-proof": /\bzero-knowledge proofs?\b/i,
  "in-app-message": /\bin-app messages?\b/i,
  "health-factor": /\bhealth factors?\b/i,
  "retention-trigger": /\bretention triggers?\b/i,
  "capture-point": /\bcapture points?\b/i,
  "frequency-cap": /\bfrequency caps?\b/i,
  suppression: /\bsuppression\b/i,
  segment: /\bsegments?\b/i,
  loop: /\bloops?\b/i,
  // Not "Automation Trigger API", which is a product name.
  trigger: /\btrigger\b(?! API)/i,
  cohort: /\bcohorts?\b/i,
  holdout: /\bholdouts?\b/i,
};

/**
 * Splits inline markers into segments: `**bold**` and `==underline==` (drawn
 * by hand on scroll). Markers do not nest. An unclosed marker stays as text.
 */
export function parseInline(text: string): RichSegment[] {
  const out: RichSegment[] = [];
  const re = /\*\*(.+?)\*\*|==(.+?)==/g;
  let last = 0;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    if (m.index > last) {
      out.push({ text: text.slice(last, m.index) });
    }
    out.push(
      m[1] !== undefined
        ? { text: m[1], bold: true }
        : { text: m[2], underline: true }
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ text: text.slice(last) });
  }
  return out;
}

interface Hit {
  key: GlossaryKey;
  index: number;
  length: number;
}

function earliestHit(
  text: string,
  keys: GlossaryKey[],
  patterns: Record<GlossaryKey, RegExp>
): Hit | null {
  let best: Hit | null = null;
  for (const key of keys) {
    const m = patterns[key].exec(text);
    if (!m) {
      continue;
    }
    const isEarlier = !best || m.index < best.index;
    const isLongerTie =
      best !== null && m.index === best.index && m[0].length > best.length;
    if (isEarlier || isLongerTie) {
      best = { key, index: m.index, length: m[0].length };
    }
  }
  return best;
}

/**
 * Marks the first use of each glossary term. Create one tracker per page
 * section and call `mark` in reading order: a term already marked earlier in
 * the same section stays plain text.
 */
export function createGlossaryTracker(
  patterns: Record<GlossaryKey, RegExp> = GLOSSARY_PATTERNS
) {
  const seen = new Set<GlossaryKey>();

  function markRun(run: RichSegment): RichSegment[] {
    const out: RichSegment[] = [];
    let rest = run.text;
    for (;;) {
      const unseen = (Object.keys(patterns) as GlossaryKey[]).filter(
        (k) => !seen.has(k)
      );
      const hit =
        unseen.length > 0 ? earliestHit(rest, unseen, patterns) : null;
      if (!hit) {
        break;
      }
      if (hit.index > 0) {
        out.push({ ...run, text: rest.slice(0, hit.index) });
      }
      out.push({
        ...run,
        text: rest.slice(hit.index, hit.index + hit.length),
        term: hit.key,
      });
      seen.add(hit.key);
      rest = rest.slice(hit.index + hit.length);
    }
    if (rest.length > 0) {
      out.push({ ...run, text: rest });
    }
    return out;
  }

  return {
    mark(text: string): RichSegment[] {
      return parseInline(text).flatMap(markRun);
    },
  };
}

export type GlossaryTracker = ReturnType<typeof createGlossaryTracker>;

/** Marks a list of bold-label points in order: each label, then its line. */
export function markPoints(
  g: GlossaryTracker,
  points: { label: string; text: string }[]
) {
  return points.map((p) => ({
    key: p.label,
    label: g.mark(p.label),
    text: g.mark(p.text),
  }));
}

/** Marks Loop rows in reading order: starts when, what it sends, stops when. */
export function markLoops(
  g: GlossaryTracker,
  loops: {
    name: string;
    startsWhen: string;
    sends: string;
    stopsWhen: string;
  }[]
) {
  return loops.map((l) => ({
    name: l.name,
    startsWhen: g.mark(l.startsWhen),
    sends: g.mark(l.sends),
    stopsWhen: g.mark(l.stopsWhen),
  }));
}
