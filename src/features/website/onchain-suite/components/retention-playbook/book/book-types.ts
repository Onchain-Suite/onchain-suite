import type { ReactNode } from "react";

/**
 * What the server hands the book viewer. A fixed part is one page, already
 * rendered. A flow is a section's items, rendered, which the viewer lays out
 * across as many pages as they need once it has measured them. The contents
 * page is drawn by the viewer, because only it knows the page numbers.
 */
export type ViewerPart =
  | { kind: "page"; key: string; title?: string; node: ReactNode }
  | { kind: "contents"; key: string }
  | {
      kind: "flow";
      key: string;
      title: string;
      items: { key: string; node: ReactNode }[];
    };
