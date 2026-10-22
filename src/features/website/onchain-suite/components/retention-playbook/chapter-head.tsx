import type { ReactNode } from "react";

import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

/** A sector page's opening: the title, one line of standfirst, and one action. */
export function ChapterHead({
  chapter,
  action,
}: {
  chapter: Chapter;
  /** The one thing a reader can do up here, e.g. download the PDF. */
  action?: ReactNode;
}) {
  return (
    <header className="rp-chap-head">
      <h1
        className="rp-chap-title"
        id={`${chapter.id}-title`}
        tabIndex={-1}
        data-jump-focus
      >
        {chapter.title}
      </h1>
      <p className="rp-chap-dek">{chapter.dek}</p>
      {action && <div className="rp-chap-action">{action}</div>}
    </header>
  );
}
