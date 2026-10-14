import { Fragment, type ReactNode } from "react";

import { GlossaryTerm } from "./glossary-term";
import { GLOSSARY } from "@/onchain-suite-website/data/retention-playbook";
import type { GlossaryKey } from "@/onchain-suite-website/types/retention-playbook";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

const DEFINITIONS = Object.fromEntries(
  GLOSSARY.entries.map((e) => [e.key, e.definition])
) as Record<GlossaryKey, string>;

function renderSegment(segment: RichSegment, key: number): ReactNode {
  if (segment.term) {
    return (
      <GlossaryTerm
        key={key}
        text={segment.text}
        definition={DEFINITIONS[segment.term]}
        bold={segment.bold}
      />
    );
  }
  if (segment.bold) {
    return <strong key={key}>{segment.text}</strong>;
  }
  return <Fragment key={key}>{segment.text}</Fragment>;
}

/**
 * Renders marked text: plain runs, bold runs, glossary terms, and hand-drawn
 * underlines. Consecutive underlined segments (a term inside an underline
 * splits the run) share one underline, so it draws as a single pen stroke.
 */
export function RichText({ segments }: { segments: RichSegment[] }) {
  // Keys from character offsets: the segments of one string never reorder.
  const out: ReactNode[] = [];
  let group: ReactNode[] = [];
  let groupKey = 0;
  let offset = 0;
  const flush = () => {
    if (group.length > 0) {
      out.push(
        <span key={`ul-${groupKey}`} className="rp-ul" data-draw>
          {group}
        </span>
      );
      group = [];
    }
  };
  for (const segment of segments) {
    const node = renderSegment(segment, offset);
    if (segment.underline) {
      if (group.length === 0) {
        groupKey = offset;
      }
      group.push(node);
    } else {
      flush();
      out.push(node);
    }
    offset += segment.text.length;
  }
  flush();
  return <>{out}</>;
}
