/* Shapes for the retention playbook page. The words live in data/ (the shared
   page in retention-playbook.ts, each category in data/playbooks/); these types
   only describe how they are grouped. */

export type CategoryId = "perp-dex" | "prediction-market" | "defi";

export type GlossaryKey =
  | "segment"
  | "loop"
  | "trigger"
  | "in-app-message"
  | "cohort"
  | "holdout"
  | "zero-knowledge-proof"
  | "health-factor"
  | "capture-point"
  | "suppression"
  | "retention-trigger"
  | "frequency-cap";

export type StageTone = "blue" | "orange" | "grey" | "navy";

/** One sector in the playbook map: its page, its name and its one-line focus. */
export interface CategoryCard {
  id: CategoryId;
  /** The page's path segment: /retention-playbook/<slug>. */
  slug: string;
  /** The strategy's full name, e.g. "Perp DEX growth and retention strategy". */
  label: string;
  /** The sector alone, for the tiles under the hero, e.g. "Perp DEXs". */
  sector: string;
  line: string;
}

export interface Stat {
  figure: string;
  text: string;
  source: string;
  /** Link to the source, shown as the source line's href. */
  href?: string;
}

export interface Loop {
  name: string;
  startsWhen: string;
  sends: string;
  stopsWhen: string;
}

export interface ExampleMessage {
  type: string;
  /** "in-app-and-email" adds the email / in-app view toggle. */
  channels: "email" | "in-app-and-email";
  subject: string;
  preview: string;
  body: string[];
  action: string;
}

/** A hand-drawn diagram, described as data and drawn by the sketch kit. */
export type Diagram =
  | {
      type: "ladder";
      steps: { label: string; note: string; tone?: StageTone }[];
    }
  | { type: "flow"; nodes: { label: string; note?: string }[] }
  | { type: "timeline"; points: { when: string; label: string }[] }
  | { type: "stack"; layers: { label: string; note: string }[] }
  /** One centre with the parts around it, and which way each one flows. */
  | {
      type: "hub";
      centre: { label: string; note?: string };
      spokes: {
        label: string;
        note?: string;
        /** Into the centre (default), out of it, or both ways. */
        dir?: "in" | "out" | "both";
        tone?: StageTone;
      }[];
    }
  /** Stages that narrow from top to bottom. */
  | {
      type: "funnel";
      stages: { label: string; note: string; tone?: StageTone }[];
    };

/**
 * One piece of chapter content. Text fields accept `**bold**` and
 * `==underline==` (a hand-drawn underline that draws in on scroll).
 */
export type Block =
  | { kind: "p"; text: string }
  /** One sentence from the section, set large: a pull quote. */
  | { kind: "pull"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "table"; head: string[]; rows: string[][] }
  | {
      kind: "callout";
      tone: "rules" | "warning" | "note";
      title: string;
      text?: string;
      items?: string[];
    }
  /** A handwritten note in the margin, beside the block before it. */
  | { kind: "note"; text: string }
  | { kind: "artifact"; code: string; title: string; diagram: Diagram }
  | { kind: "loops"; loops: Loop[] }
  | { kind: "says"; always: string[]; never: string[] }
  | { kind: "path"; name: string; steps: { when: string; what: string }[] }
  | { kind: "messages"; messages: ExampleMessage[] }
  | { kind: "kpis"; rows: { what: string; window: string }[] }
  | { kind: "stats"; stats: Stat[] };

/** Surgence's house structure: what we will do, how, and why it matters. */
export interface WhatHowWhy {
  what: string;
  how: Block[];
  why: string;
}

export interface ChapterSection {
  id: string;
  title: string;
  blocks?: Block[];
  whw?: WhatHowWhy;
}

export interface Chapter {
  id: string;
  /** Two-digit chapter number shown in the rail, e.g. "01". */
  number: string;
  title: string;
  /** One-line standfirst under the title. */
  dek: string;
  tldr?: string[];
  /** Illustrations shown after the opening paragraphs, before the sections. */
  intro?: Block[];
  sections: ChapterSection[];
}

export interface PlaybookChapter extends Chapter {
  id: CategoryId;
}

export interface GlossaryEntry {
  key: GlossaryKey;
  term: string;
  definition: string;
}
