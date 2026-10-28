import type { ReactNode } from "react";

import "../styles/book.css";
import { renderBlocks } from "@/onchain-suite-website/components/retention-playbook/blocks/block-list";
import type { ViewerPart } from "@/onchain-suite-website/components/retention-playbook/book/book-types";
import { BookViewer } from "@/onchain-suite-website/components/retention-playbook/book/book-viewer";
import { PricingSheet } from "@/onchain-suite-website/components/retention-playbook/book/pricing-sheet";
import { PdfButton } from "@/onchain-suite-website/components/retention-playbook/pdf-button";
import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import { WalkthroughButton } from "@/onchain-suite-website/components/retention-playbook/walkthrough-button";
import type { ClientStrategy } from "@/onchain-suite-website/data/clients";
import {
  type BookPart,
  bookParts,
  partKey,
  partTitle,
} from "@/onchain-suite-website/utils/book-pages";
import { createGlossaryTracker } from "@/onchain-suite-website/utils/glossary-marker";
import { pdfPathForSlug } from "@/onchain-suite-website/utils/retention-playbook-params";

/** One fixed page's frame: the running head, then the page's own content. */
function Sheet({
  head,
  children,
  className = "",
}: {
  head: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rp-bk-page ${className}`}>
      <p className="rp-bk-head" aria-hidden="true">
        {head}
      </p>
      <div className="rp-chapter rp-bk-body">{children}</div>
    </div>
  );
}

/** A fixed page, rendered here; sections and the contents are left to the viewer. */
function fixedPage(part: BookPart, strategy: ClientStrategy): ReactNode {
  const { chapter, slug } = strategy;
  const head = `${chapter.title} · OnchainSuite`;
  switch (part.kind) {
    case "cover":
      return (
        <div className="rp-bk-page rp-bk-cover">
          <p className="rp-bk-kicker">OnchainSuite</p>
          <div>
            <p className="rp-bk-k">Growth and retention strategy</p>
            <h1 className="rp-bk-title">{chapter.title}</h1>
            <p className="rp-bk-dek">{chapter.dek}</p>
          </div>
          <div>
            {strategy.preparedFor && (
              <p className="rp-bk-for">Prepared for {strategy.preparedFor}</p>
            )}
            <div className="rp-bk-actions">
              <PdfButton href={pdfPathForSlug(slug)} strategy={chapter.id} />
            </div>
            <p className="rp-bk-hint">
              Turn the page with the arrows, the keyboard, or a swipe.
            </p>
          </div>
        </div>
      );
    case "overview": {
      const g = createGlossaryTracker();
      return (
        <Sheet head={head}>
          <h2 className="rp-bk-h">Overview</h2>
          {part.paragraphs.map((p) => (
            <p key={p} className="rp-p">
              <RichText segments={g.mark(p)} />
            </p>
          ))}
        </Sheet>
      );
    }
    case "figure":
      return (
        <Sheet head={head} className="rp-bk-figure">
          {renderBlocks(part.blocks, createGlossaryTracker())}
        </Sheet>
      );
    case "pricing":
      return strategy.pricing ? (
        <Sheet head={head}>
          <h2 className="rp-bk-h">Your plan and price</h2>
          <PricingSheet pricing={strategy.pricing} />
        </Sheet>
      ) : null;
    case "close":
      return (
        <Sheet head={head} className="rp-bk-close">
          <h2 className="rp-bk-h">Next steps</h2>
          <p className="rp-p">
            This book is the strategy. Copy and timing come after the approach
            is agreed, and a thirty-minute walkthrough is the quickest way
            there.
          </p>
          <div className="rp-bk-actions">
            <WalkthroughButton section="next-step" size="hero" />
            <PdfButton href={pdfPathForSlug(slug)} strategy={chapter.id} />
          </div>
        </Sheet>
      );
    default:
      return null;
  }
}

/**
 * A client's strategy as a book. Every page and every section item is
 * rendered here, on the server; the viewer measures the items, lays them out
 * across pages and turns them.
 */
export function StrategyBook({ strategy }: { strategy: ClientStrategy }) {
  const parts: ViewerPart[] = bookParts(
    strategy.chapter,
    Boolean(strategy.pricing)
  ).map((part, i) => {
    const key = partKey(part, i);
    if (part.kind === "contents") return { kind: "contents", key };
    if (part.kind === "section") {
      // One glossary tracker per section, so a term is marked on first use.
      const g = createGlossaryTracker();
      return {
        kind: "flow",
        key,
        title: part.section.title,
        items: part.items.map((blocks, n) => ({
          key: `${key}-${n}`,
          node: renderBlocks(blocks, g),
        })),
      };
    }
    return {
      kind: "page",
      key,
      title: partTitle(part),
      node: fixedPage(part, strategy),
    };
  });
  return <BookViewer title={strategy.chapter.title} parts={parts} />;
}
