"use client";

import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { Skeleton } from "@/shared/components/ui/skeleton";

export type CardSpan = 1 | 2 | "full";

const SPAN: Record<string, string> = {
  "1": "an-b1",
  "2": "an-b2",
  full: "an-bfull",
};

/** One card in the bento: a title, a meta line, the chart, an optional footnote. */
export function AnalyticsCard({
  title,
  meta,
  span = 1,
  foot,
  own = false,
  onEdit,
  children,
}: {
  title: string;
  meta?: ReactNode;
  span?: CardSpan;
  foot?: ReactNode;
  /** A chart someone added, rather than a built-in one. */
  own?: boolean;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`an-card ${SPAN[String(span)]}${own ? " an-card--own" : ""}`}
      aria-label={title}
    >
      <header className="an-card__head">
        <h2>{title}</h2>
        {meta ? <span className="an-card__meta">{meta}</span> : null}
        {onEdit ? (
          <button
            type="button"
            className="an-card__edit"
            aria-label={`Edit ${title}`}
            onClick={onEdit}
          >
            <PencilSquareIcon aria-hidden="true" />
          </button>
        ) : null}
      </header>
      <div className="an-card__body">{children}</div>
      {foot ? <p className="an-card__foot">{foot}</p> : null}
    </section>
  );
}

/** Nothing to draw yet: why, in a sentence, and optionally what it is waiting on. */
export function CardEmpty({
  title,
  reason,
  tag,
}: {
  title?: string;
  reason: string;
  tag?: string;
}) {
  return (
    <div className="an-empty">
      <ChartBarIcon aria-hidden="true" />
      {title ? <b>{title}</b> : null}
      <p>{reason}</p>
      {tag ? <span className="an-empty__tag">{tag}</span> : null}
    </div>
  );
}

export function CardError({ error }: { error: Error }) {
  return (
    <div className="an-empty">
      <ExclamationTriangleIcon aria-hidden="true" className="an-error" />
      <b>Couldn&apos;t load this</b>
      <p className="an-error">
        {error.message.replace(/^\[HTTP \d+\]\s*/, "")}
      </p>
    </div>
  );
}

export function CardLoading() {
  return <Skeleton className="h-[200px] w-full rounded-md" />;
}
