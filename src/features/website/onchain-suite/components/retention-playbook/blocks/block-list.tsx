import type { ReactNode } from "react";

import { CalloutBox } from "@/onchain-suite-website/components/retention-playbook/blocks/callout-box";
import { DataTable } from "@/onchain-suite-website/components/retention-playbook/blocks/data-table";
import { PathSteps } from "@/onchain-suite-website/components/retention-playbook/blocks/path-steps";
import { SaysPanel } from "@/onchain-suite-website/components/retention-playbook/blocks/says-panel";
import { CategoryCards } from "@/onchain-suite-website/components/retention-playbook/category-cards";
import { LoopCards } from "@/onchain-suite-website/components/retention-playbook/loop-cards";
import { MessagePreview } from "@/onchain-suite-website/components/retention-playbook/message-preview";
import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import { Artifact } from "@/onchain-suite-website/components/retention-playbook/sketch/artifact";
import { MarginNote } from "@/onchain-suite-website/components/retention-playbook/sketch/margin-note";
import { StatCards } from "@/onchain-suite-website/components/retention-playbook/stat-cards";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { Block } from "@/onchain-suite-website/types/retention-playbook";
import {
  type GlossaryTracker,
  markLoops,
} from "@/onchain-suite-website/utils/glossary-marker";

/**
 * Renders one block. A plain function, not a component, so it runs in reading
 * order and the glossary tracker marks each term's first use in this section.
 */
function renderBlock(block: Block, g: GlossaryTracker): ReactNode {
  switch (block.kind) {
    case "p":
      return (
        <p className="rp-p">
          <RichText segments={g.mark(block.text)} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="rp-list">
          {block.items.map((item) => (
            <li key={item}>
              <RichText segments={g.mark(item)} />
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <DataTable
          head={block.head}
          rows={block.rows.map((row) => row.map((cell) => g.mark(cell)))}
        />
      );
    case "kpis":
      return (
        <DataTable
          head={[UI.kpiWhat, UI.kpiWindow]}
          rows={block.rows.map((r) => [g.mark(r.what), g.mark(r.window)])}
        />
      );
    case "callout":
      return (
        <CalloutBox
          tone={block.tone}
          title={block.title}
          text={block.text ? g.mark(block.text) : undefined}
          items={block.items?.map((i) => g.mark(i))}
        />
      );
    case "says":
      return (
        <SaysPanel
          always={block.always.map((i) => g.mark(i))}
          never={block.never.map((i) => g.mark(i))}
        />
      );
    case "path":
      return (
        <PathSteps
          name={block.name}
          steps={block.steps.map((s) => ({
            when: s.when,
            what: g.mark(s.what),
          }))}
        />
      );
    case "loops":
      return <LoopCards loops={markLoops(g, block.loops)} headingLevel={4} />;
    case "messages":
      return (
        <div className="rp-msgs">
          {block.messages.map((m) => (
            <MessagePreview key={m.subject} example={m} />
          ))}
        </div>
      );
    case "stats":
      return <StatCards stats={block.stats} />;
    case "artifact":
      return (
        <Artifact
          code={block.code}
          title={block.title}
          diagram={block.diagram}
        />
      );
    case "picker":
      return <CategoryCards location="summary" />;
    case "note":
      // Notes are paired with the block before them in BlockList.
      return null;
  }
}

/**
 * A run of blocks, rendered eagerly so glossary marking follows reading order
 * even when the caller marks more text after it (What, then How, then Why).
 * A `note` block becomes a margin note on the block before it.
 */
export function renderBlocks(blocks: Block[], g: GlossaryTracker): ReactNode {
  const items: { key: string; block: Block; note?: string }[] = [];
  blocks.forEach((block, i) => {
    const last = items[items.length - 1];
    if (block.kind === "note" && last) {
      last.note = block.text;
    } else {
      items.push({ key: `${block.kind}-${i}`, block });
    }
  });
  const rendered = items.map((item) => ({
    key: item.key,
    note: item.note,
    node: renderBlock(item.block, g),
  }));
  return (
    <>
      {rendered.map((r) =>
        r.note ? (
          <MarginNote key={r.key} text={r.note}>
            {r.node}
          </MarginNote>
        ) : (
          <div key={r.key} className="rp-block">
            {r.node}
          </div>
        )
      )}
    </>
  );
}

/** Component form of renderBlocks, for callers that mark nothing after it. */
export function BlockList({
  blocks,
  g,
}: {
  blocks: Block[];
  g: GlossaryTracker;
}) {
  return renderBlocks(blocks, g);
}
