"use client";

import type { ReactNode } from "react";

import "./landing-v2.css";
import type { LegalDoc } from "./legal-content";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";

/** Renders a single legal document (Privacy / Terms / DPA / Sub-processors). */
export function LegalDocPage({ doc }: { doc: LegalDoc }) {
  const body: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    const block = doc.blocks[i];
    if (block.t === "li") {
      const items: string[] = [];
      while (i < doc.blocks.length && doc.blocks[i].t === "li") {
        items.push(doc.blocks[i].x);
        i += 1;
      }
      body.push(
        <ul key={`ul-${i}`} className="mt-3 list-disc space-y-2 pl-5">
          {items.map((x, j) => (
            <li key={j} className="text-[15px] leading-relaxed t-muted">
              {x}
            </li>
          ))}
        </ul>
      );
    } else if (block.t === "h") {
      body.push(
        <h2
          key={`h-${i}`}
          className="mt-9 text-[18px] font-semibold tracking-tight t-ink"
        >
          {block.x}
        </h2>
      );
      i += 1;
    } else {
      body.push(
        <p key={`p-${i}`} className="mt-3 text-[15px] leading-relaxed t-muted">
          {block.x}
        </p>
      );
      i += 1;
    }
  }

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
                Legal
              </div>
              <h1 className="mt-3 text-[32px] font-semibold tracking-tight t-ink sm:text-[38px]">
                {doc.title}
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed t-muted">
                {doc.subtitle}
              </p>
              <p className="mt-2 text-[13px] t-muted2">{doc.lastUpdated}</p>
            </Reveal>
            <div className="mt-8">{body}</div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default LegalDocPage;
