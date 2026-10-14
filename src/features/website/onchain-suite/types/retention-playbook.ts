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

export type PrivacyIcon = "wallet" | "hidden" | "read-only" | "compliant";

/** A bold lead-in followed by one line, e.g. a rule or a privacy point. */
export interface LabelledPoint {
  label: string;
  text: string;
}

export interface CategoryCard {
  id: CategoryId;
  label: string;
  line: string;
  section: string;
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
  | { type: "stack"; layers: { label: string; note: string }[] };

/**
 * One piece of chapter content. Text fields accept `**bold**` and
 * `==underline==` (a hand-drawn underline that draws in on scroll).
 */
export type Block =
  | { kind: "p"; text: string }
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
  | { kind: "stats"; stats: Stat[] }
  /** The three category cards that open a playbook. */
  | { kind: "picker" };

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
  kicker: string;
  title: string;
  /** One-line standfirst under the title. */
  dek: string;
  tldr?: string[];
  sections: ChapterSection[];
}

export interface PlaybookChapter extends Chapter {
  id: CategoryId;
}

export interface SetupStep {
  text: string;
  need: string;
}

export interface GlossaryEntry {
  key: GlossaryKey;
  term: string;
  definition: string;
}
