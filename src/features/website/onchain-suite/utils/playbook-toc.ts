import {
  CATEGORIES,
  OVERVIEW,
} from "@/onchain-suite-website/data/retention-playbook";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";
import {
  PLAYBOOK_BASE,
  playbookPath,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/** DOM id of a section inside a chapter: "defi-retention-triggers". */
export const sectionAnchor = (chapterId: string, sectionId: string) =>
  `${chapterId}-${sectionId}`;

/** One entry in the rail: a page on the landing page, a section on a strategy page. */
export interface MapEntry {
  /** A page id ("overview", a category id) or a section's DOM anchor. */
  id: string;
  number: string;
  label: string;
  /** The one-line focus under the name. The overview has none. */
  line?: string;
  /** A page path, or "#anchor" for a section on this page. */
  href: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The landing page's rail: the landing page itself, then one growth and
 * retention strategy per sector, each its own page.
 */
export const PLAYBOOK_MAP: MapEntry[] = [
  { id: OVERVIEW.id, number: "00", label: OVERVIEW.label, href: PLAYBOOK_BASE },
  ...CATEGORIES.map((c, i) => ({
    id: c.id,
    number: pad(i + 1),
    label: c.label,
    line: c.line,
    href: playbookPath(c.id),
  })),
];

/** The page after this one, for the link at the foot of each page. */
export function nextEntry(currentId: string): MapEntry | undefined {
  const i = PLAYBOOK_MAP.findIndex((e) => e.id === currentId);
  return i >= 0 ? PLAYBOOK_MAP[i + 1] : undefined;
}

/**
 * A strategy page's rail, Atlas style: everything in that strategy, in reading
 * order. 00 is the opening, then each section, all on the page.
 */
export function strategyContents(chapter: Chapter): MapEntry[] {
  return [
    {
      id: chapter.id,
      number: "00",
      label: OVERVIEW.label,
      href: `#${chapter.id}`,
    },
    ...chapter.sections.map((s, i) => {
      const id = sectionAnchor(chapter.id, s.id);
      return { id, number: pad(i + 1), label: s.title, href: `#${id}` };
    }),
  ];
}
