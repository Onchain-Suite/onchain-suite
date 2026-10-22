/**
 * Rewrite actions for selected text.
 *
 * Each action is a deterministic edit that does what its name says on ordinary
 * copy: it never invents content, it only tidies, trims or changes register.
 * (There is no copy-rewrite endpoint on the backend; the only LLM copywriting
 * path is internal to retention recommendations.) Merge tags pass through
 * intact: they are protected before any rule runs.
 */

export type RewriteId = "fix" | "shorten" | "friendlier" | "direct";

export const REWRITES: { id: RewriteId; label: string; hint: string }[] = [
  {
    id: "fix",
    label: "Fix spelling and grammar",
    hint: "Typos, spacing, capitals",
  },
  {
    id: "shorten",
    label: "Make it shorter",
    hint: "Cuts filler and the last sentence",
  },
  {
    id: "friendlier",
    label: "Make it friendlier",
    hint: "Contractions, warmer verbs",
  },
  { id: "direct", label: "Make it more direct", hint: "Drops hedging" },
];

const TYPOS: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  wich: "which",
  seperate: "separate",
  definately: "definitely",
  untill: "until",
  occured: "occurred",
  accross: "across",
  tommorow: "tomorrow",
  thier: "their",
  alot: "a lot",
  adress: "address",
  begining: "beginning",
  beleive: "believe",
  calender: "calendar",
  existance: "existence",
  goverment: "government",
  independant: "independent",
  neccessary: "necessary",
  occassion: "occasion",
  publically: "publicly",
  reccomend: "recommend",
  succesful: "successful",
  truely: "truly",
  wierd: "weird",
  exclusivly: "exclusively",
  availible: "available",
  recieved: "received",
};

const FILLER =
  /\b(really|very|just|actually|basically|literally|simply|quite|totally|definitely)\s+/gi;
const HEDGES =
  /\b(we think that|we think|we believe|it seems that|perhaps|maybe|possibly|might want to|feel free to|kind of|sort of)\s+/gi;

const caseLike = (from: string, to: string) =>
  from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;

/**
 * A fragment is one formatted run inside a paragraph (the text either side of
 * a bold word or a link). It keeps its edge spaces, and only starts with a
 * capital if it starts a sentence, so rewriting run by run keeps the
 * formatting without breaking the prose.
 */
export interface RewriteOptions {
  fragment?: boolean;
  startsSentence?: boolean;
}

function tidy(s: string, o: RewriteOptions = {}): string {
  let out = s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    // A missing space after punctuation, but never inside a domain like acme.xyz.
    .replace(/([,!?;])(?=[A-Za-z])/g, "$1 ")
    .replace(/\.(?=[A-Z][a-z])/g, ". ")
    .replace(/\bi\b/g, "I")
    .replace(
      /([.!?]\s+)([a-z])/g,
      (_, a: string, b: string) => a + b.toUpperCase()
    );
  if (!o.fragment || o.startsSentence) {
    out = out.replace(
      /^(\s*)([a-z])/,
      (_, a: string, b: string) => a + b.toUpperCase()
    );
  }
  return o.fragment ? out : out.trim();
}

function fix(s: string, o: RewriteOptions = {}): string {
  return tidy(
    s.replace(/\b[A-Za-z]+\b/g, (w) =>
      TYPOS[w.toLowerCase()] ? caseLike(w, TYPOS[w.toLowerCase()]) : w
    ),
    o
  );
}

function sentences(s: string): string[] {
  return (
    s
      .match(/[^.!?]+[.!?]*\s*/g)
      ?.map((x) => x.trim())
      .filter(Boolean) ?? [s]
  );
}

function shorten(s: string, o: RewriteOptions = {}): string {
  const lean = fix(s.replace(FILLER, ""), o);
  if (o.fragment) return lean; // the cut across runs is shortenCut's job
  const parts = sentences(lean);
  // Keeps about three in five sentences, rounded, so a two-sentence paragraph loses one.
  return parts.length > 1
    ? parts.slice(0, Math.max(1, Math.round(parts.length * 0.6))).join(" ")
    : lean;
}

/**
 * For a whole paragraph: how many characters to keep so that it ends after
 * about three in five of its sentences, or null when there is nothing to cut.
 */
export function shortenCut(text: string): number | null {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const keep = Math.max(1, Math.round(parts.length * 0.6));
  if (parts.length < 2 || keep >= parts.length) return null;
  return parts.slice(0, keep).join("").trimEnd().length;
}

const CONTRACT: [RegExp, string][] = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bit is\b/gi, "it's"],
  [/\byou are\b/gi, "you're"],
  [/\bwe are\b/gi, "we're"],
  [/\bwe will\b/gi, "we'll"],
  [/\byou will\b/gi, "you'll"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bis not\b/gi, "isn't"],
  [/\bpurchase\b/gi, "get"],
  [/\butilize\b/gi, "use"],
  [/\bcommence\b/gi, "start"],
  [/\bassist\b/gi, "help"],
];

function friendlier(s: string, o: RewriteOptions = {}): string {
  return fix(
    CONTRACT.reduce(
      (out, [re, to]) => out.replace(re, (m) => caseLike(m, to)),
      s
    ),
    o
  );
}

function direct(s: string, o: RewriteOptions = {}): string {
  return fix(s.replace(HEDGES, "").replace(FILLER, ""), o);
}

const ACTIONS: Record<RewriteId, (s: string, o?: RewriteOptions) => string> = {
  fix,
  shorten,
  friendlier,
  direct,
};

export function rewrite(
  id: RewriteId,
  text: string,
  o: RewriteOptions = {}
): string {
  // Tags are protected so no rule can split, recase or re-space one.
  const tags: string[] = [];
  const safe = text.replace(/\{\{[^}]*\}\}/g, (t) => {
    tags.push(t);
    return `${tags.length - 1}`;
  });
  return ACTIONS[id](safe, o).replace(
    /(\d+)/g,
    (_, n: string) => tags[Number(n)]
  );
}
