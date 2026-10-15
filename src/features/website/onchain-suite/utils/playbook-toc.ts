import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

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
  /**
   * Set when the chapter lives on another page: the rail links there instead
   * of scrolling, and the chapter is left out of the reading count.
   */
  href?: string;
  sections: TocSection[];
}

/** Contents for the rail and mobile bar, in page order. */
export function buildToc(
  chapters: (Chapter & { href?: string; tocLabel?: string })[]
): TocChapter[] {
  return chapters.map((c) => ({
    id: c.id,
    number: c.number,
    label: c.tocLabel ?? c.title,
    href: c.href,
    sections: c.sections.map((s) => ({
      id: sectionAnchor(c.id, s.id),
      label: s.title,
    })),
  }));
}

/**
 * The anchors the reader moves through on this page, in order: each chapter's
 * opening, then its sections. The opening counts too, so a reader on a
 * chapter's title and contents box already sees that chapter as current.
 * Chapters that live on another page have no anchors here.
 */
export function trackedIds(toc: TocChapter[]): string[] {
  return toc
    .filter((c) => !c.href)
    .flatMap((c) => [c.id, ...c.sections.map((s) => s.id)]);
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
