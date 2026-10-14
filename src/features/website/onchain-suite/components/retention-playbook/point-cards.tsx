import type { ReactNode } from "react";

import { RichText } from "./rich-text";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

export interface MarkedPoint {
  key: string;
  label: RichSegment[];
  text: RichSegment[];
  icon?: ReactNode;
}

/**
 * Cards with a bold label and one line: numbered (rules), with an icon
 * (privacy) or plain (blockers, metrics).
 */
export function PointCards({
  points,
  numbered = false,
  columns = 3,
}: {
  points: MarkedPoint[];
  numbered?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const List = numbered ? "ol" : "ul";
  return (
    <List className={`rp-points cols-${columns}`}>
      {points.map((p, i) => (
        <li key={p.key} className="rp-point">
          {numbered && (
            <span className="rp-point-n" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          )}
          {p.icon && <span className="rp-point-icon">{p.icon}</span>}
          <p>
            <strong className="rp-point-label">
              <RichText segments={p.label} />
            </strong>{" "}
            <RichText segments={p.text} />
          </p>
        </li>
      ))}
    </List>
  );
}
