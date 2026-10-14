import type {
  CategoryId,
  Chapter,
} from "@/onchain-suite-website/types/retention-playbook";

/** DOM id of a section inside a chapter: "defi-retention-triggers". */
export const sectionAnchor = (chapterId: string, sectionId: string) =>
  `${chapterId}-${sectionId}`;

export interface TocSection {
  id: string;
  label: string;
}

export interface TocChapter {
  id: string;
  number: string;
  label: string;
  /** Set on the three playbooks; only the chosen one is on the page. */
  category?: CategoryId;
  sections: TocSection[];
}

/** Contents for the rail and mobile bar, in page order. */
export function buildToc(
  chapters: (Chapter & { category?: CategoryId; tocLabel?: string })[]
): TocChapter[] {
  return chapters.map((c) => ({
    id: c.id,
    number: c.number,
    label: c.tocLabel ?? c.title,
    category: c.category,
    sections: c.sections.map((s) => ({
      id: sectionAnchor(c.id, s.id),
      label: s.title,
    })),
  }));
}

/**
 * The anchors the reader moves through, in order: each chapter's opening,
 * then its sections. The opening counts too, so a reader on a chapter's title
 * and contents box already sees that chapter as current.
 */
export function trackedIds(toc: TocChapter[]): string[] {
  return toc.flatMap((c) => [c.id, ...c.sections.map((s) => s.id)]);
}

/** Tracked anchors actually on the page: playbooks other than the chosen one are hidden. */
export function visibleIds(
  toc: TocChapter[],
  category: CategoryId | null
): string[] {
  return trackedIds(toc.filter((c) => !c.category || c.category === category));
}

/** The chapter that holds a tracked anchor. */
export function chapterOf(
  toc: TocChapter[],
  id: string | null
): TocChapter | undefined {
  if (!id) {
    return undefined;
  }
  return toc.find((c) => c.id === id || c.sections.some((s) => s.id === id));
}

/** Label of a tracked anchor, for the mobile bar. */
export function labelOf(
  toc: TocChapter[],
  id: string | null
): string | undefined {
  const chapter = chapterOf(toc, id);
  if (!chapter) {
    return undefined;
  }
  return chapter.sections.find((s) => s.id === id)?.label ?? chapter.label;
}
