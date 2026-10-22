import type { ChainedCommands, Editor, Range } from "@tiptap/core";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state";

import { type MenuItem, SOCIAL_DEFAULT } from "./extensions";

/*
 * Every block the editor can insert, in one list: the Insert panel shows it
 * as buttons and the "/" menu filters it as you type. Adding a block here adds
 * it to both.
 */

const run =
  (apply: (c: ChainedCommands) => ChainedCommands) =>
  (editor: Editor, range?: Range) => {
    const c = editor.chain().focus();
    apply(range ? c.deleteRange(range) : c).run();
  };

const para = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

/* A new button, image or other atom comes in selected, so its settings open
   straight away instead of leaving the cursor in the paragraph after it. */
const selectInserted =
  (type: string) =>
  ({ tr }: { tr: Transaction }) => {
    let at = -1;
    tr.doc.descendants((n, pos) => {
      if (n.type.name === type && pos + n.nodeSize <= tr.selection.from + 1)
        at = pos;
    });
    if (at >= 0) tr.setSelection(NodeSelection.create(tr.doc, at));
    return true;
  };

/* New columns: select the first column's placeholder, so typing replaces it. */
const selectFirstColumn = ({ tr }: { tr: Transaction }) => {
  let at = -1;
  tr.doc.descendants((n, pos) => {
    if (n.type.name === "columns" && pos < tr.selection.from) at = pos;
  });
  const first = at >= 0 ? tr.doc.nodeAt(at)?.firstChild?.firstChild : null;
  if (first?.isTextblock) {
    // columns > column > paragraph: its text starts three positions in.
    const start = at + 3;
    tr.setSelection(
      TextSelection.create(tr.doc, start, start + first.content.size)
    );
  }
  return true;
};

const atom = (type: string, attrs?: Record<string, unknown>) =>
  run((c) =>
    c
      .insertContent({ type, ...(attrs ? { attrs } : {}) })
      .command(selectInserted(type))
  );

export const BLOCKS: MenuItem[] = [
  {
    id: "text",
    label: "Text",
    icon: "type",
    keywords: "paragraph body",
    run: run((c) => c.setParagraph()),
  },
  {
    id: "h1",
    label: "Heading 1",
    icon: "heading-1",
    keywords: "title h1",
    run: run((c) => c.setHeading({ level: 1 })),
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: "heading-2",
    keywords: "subtitle h2",
    run: run((c) => c.setHeading({ level: 2 })),
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: "heading-3",
    keywords: "h3",
    run: run((c) => c.setHeading({ level: 3 })),
  },
  {
    id: "bullets",
    label: "Bulleted list",
    icon: "list",
    keywords: "ul unordered",
    run: run((c) => c.toggleBulletList()),
  },
  {
    id: "numbers",
    label: "Numbered list",
    icon: "list-ordered",
    keywords: "ol ordered",
    run: run((c) => c.toggleOrderedList()),
  },
  {
    id: "quote",
    label: "Quote",
    icon: "quote",
    keywords: "blockquote",
    run: run((c) => c.toggleBlockquote()),
  },
  {
    id: "button",
    label: "Button",
    icon: "square-mouse-pointer",
    keywords: "cta link",
    run: atom("emailButton", { label: "Click me", href: "", align: "left" }),
  },
  {
    id: "image",
    label: "Image",
    icon: "image",
    keywords: "picture photo",
    run: atom("emailImage", { src: "", alt: "", caption: "", href: "" }),
  },
  {
    id: "columns",
    label: "Two columns",
    icon: "columns",
    keywords: "layout grid",
    run: run((c) =>
      c
        .insertContent({
          type: "columns",
          content: [
            { type: "column", content: [para("Left column")] },
            { type: "column", content: [para("Right column")] },
          ],
        })
        .command(selectFirstColumn)
    ),
  },
  {
    id: "divider",
    label: "Divider",
    icon: "minus",
    keywords: "hr rule line",
    run: run((c) => c.setHorizontalRule()),
  },
  {
    id: "spacer",
    label: "Spacer",
    icon: "unfold-vertical",
    keywords: "gap space",
    run: atom("spacer", { height: 24 }),
  },
  {
    id: "social",
    label: "Social links",
    icon: "share",
    keywords: "x discord farcaster",
    run: atom("socialLinks", { links: SOCIAL_DEFAULT }),
  },
  {
    id: "section",
    label: "Section for a tag",
    icon: "users",
    keywords: "dynamic conditional audience personalise tag segment",
    /* Wraps the current block, so "make this paragraph VIP-only" is one step.
       The tag is picked in the panel; until then everyone sees it. */
    run: (editor, range) => {
      const c = editor.chain().focus();
      const base = range ? c.deleteRange(range) : c;
      if (!base.wrapIn("tagSection", { tag: "", mode: "only" }).run()) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "tagSection",
            attrs: { tag: "", mode: "only" },
            content: [para("Only contacts with this tag see this.")],
          })
          .run();
      }
    },
  },
  {
    id: "code",
    label: "Code block",
    icon: "code",
    keywords: "snippet",
    run: run((c) => c.toggleCodeBlock()),
  },
  {
    id: "html",
    label: "Custom HTML",
    icon: "code-xml",
    keywords: "raw embed",
    run: atom("htmlBlock"),
  },
];
