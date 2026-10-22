import {
  type Editor,
  Extension,
  InputRule,
  Node,
  type Range,
} from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";

import type { EditorIconName } from "../components/editor-icon";
import {
  ButtonView,
  HtmlView,
  ImageView,
  SectionView,
  SocialView,
  SpacerView,
} from "../components/node-views";
import {
  defaultFallback,
  findMergeTag,
  MERGE_TAGS,
  tagToken,
} from "../data/merge-tags";

/*
 * The email-specific nodes. Everything else (paragraphs, headings, lists,
 * quotes, code, dividers, bold and links) comes from StarterKit, with its
 * markdown shortcuts: "# " for a heading, "- " for a list, "> " for a quote.
 *
 * Each node here has a renderer in utils/render-email.ts that turns it into
 * inbox HTML. A node added here without one would vanish from what is sent.
 */

export const MergeTag = Node.create({
  name: "mergeTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  /* `fallback` is what someone sees when the value is unknown: "Hi there"
     instead of "Hi ". A recipient tag gets a sensible one when it goes in, and
     it can be changed in Preview. */
  addAttributes() {
    return { key: { default: "" }, fallback: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-merge-tag]",
        getAttrs: (el) => ({
          key: (el as HTMLElement).getAttribute("data-merge-tag"),
          fallback: (el as HTMLElement).getAttribute("data-fallback") ?? "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const key = String(node.attrs.key);
    const fb = String(node.attrs.fallback ?? "");
    return [
      "span",
      {
        "data-merge-tag": key,
        "data-fallback": fb,
        class: "eed-tag",
        title: fb ? `{{ ${key} }}, or “${fb}” if unknown` : `{{ ${key} }}`,
      },
      findMergeTag(key)?.label ?? key,
    ];
  },
  renderText({ node }) {
    return tagToken(String(node.attrs.key), String(node.attrs.fallback ?? ""));
  },
  /* Typing a known tag out in full, {{name}} or {{ name }}, turns it into the
     chip as the braces close. */
  addInputRules() {
    return [
      /* Not nodeInputRule: it would swap only the key for the chip and leave
         the braces. This replaces the whole token, and only for known keys.
         Text can arrive in one chunk (autocomplete, mobile keyboards), and then
         Tiptap's range runs past the cursor, so positions are worked out here:
         `typed` is the text being inserted now, and only the part of the token
         before it is already in the document. */
      new InputRule({
        find: /\{\{\s*([a-z_][a-z0-9_.]*)\s*\}\}$/,
        handler: ({ state, range, match }) => {
          const [token, key] = match;
          if (!key || !findMergeTag(key)) return null;
          const typed = token.length - (range.to - range.from);
          const start = range.to - Math.max(0, token.length - typed);
          const before =
            typed > token.length
              ? (match.input ?? "").slice(-typed, -token.length)
              : "";
          const { tr } = state;
          tr.delete(start, range.to);
          if (before) tr.insertText(before, start);
          tr.insert(
            start + before.length,
            this.type.create({ key, fallback: defaultFallback(key) })
          );
          return undefined;
        },
      }),
    ];
  },
});

const atomNode = (
  name: string,
  attrs: Record<string, { default: unknown }>,
  view: Parameters<typeof ReactNodeViewRenderer>[0],
  parse: string
) =>
  Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      return attrs;
    },
    parseHTML() {
      return [{ tag: parse }];
    },
    renderHTML() {
      return ["div", { [`data-${name}`]: "" }];
    },
    addNodeView() {
      return ReactNodeViewRenderer(view);
    },
  });

export const EmailButton = atomNode(
  "emailButton",
  {
    label: { default: "Open" },
    href: { default: "" },
    align: { default: "left" },
  },
  ButtonView,
  "div[data-emailButton]"
);

export const EmailImage = Node.create({
  name: "emailImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      href: { default: "" },
    };
  },
  /* Pasted and imported <img> tags land here, so a pasted email keeps its pictures. */
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute("src"),
          alt: (el as HTMLElement).getAttribute("alt") ?? "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return ["img", { src: node.attrs.src, alt: node.attrs.alt }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export const Spacer = atomNode(
  "spacer",
  { height: { default: 24 } },
  SpacerView,
  "div[data-spacer]"
);

export const SOCIAL_DEFAULT = [
  { label: "X", url: "https://x.com/" },
  { label: "Discord", url: "https://discord.gg/" },
  { label: "Website", url: "https://" },
];

export const SocialLinks = atomNode(
  "socialLinks",
  { links: { default: SOCIAL_DEFAULT } },
  SocialView,
  "div[data-socialLinks]"
);

export const HtmlBlock = atomNode(
  "htmlBlock",
  { html: { default: '<p style="text-align:center">Your HTML here</p>' } },
  HtmlView,
  "div[data-htmlBlock]"
);

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML() {
    return ["div", { "data-column": "", class: "eed-col" }, 0];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  draggable: true,
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-columns": "", class: `eed-cols eed-cols--${node.childCount}` },
      0,
    ];
  },
});

/** Content only some recipients see: by contact tag, which the backend can test per send. */
export const TagSection = Node.create({
  name: "tagSection",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: true,
  addAttributes() {
    return { tag: { default: "" }, mode: { default: "only" } };
  },
  parseHTML() {
    return [{ tag: "div[data-tag-section]" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-tag-section": node.attrs.tag, "data-mode": node.attrs.mode },
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SectionView);
  },
});

/* ---------------- the "/" and "{{" menus ---------------- */

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon: EditorIconName;
  keywords?: string;
  run: (editor: Editor, range?: Range) => void;
}

export interface MenuState {
  kind: "slash" | "tag";
  items: MenuItem[];
  index: number;
  rect: DOMRect | null;
  pick: (item: MenuItem) => void;
}

/**
 * One suggestion menu: "/" for blocks, "{{" for merge tags. The open menu's
 * state goes to React through `onState`; the keyboard is handled here so
 * arrows and Enter work without the editor losing focus.
 */
function suggestionMenu(
  name: string,
  kind: MenuState["kind"],
  char: string,
  items: (q: string) => MenuItem[]
) {
  return Extension.create<{ onState: (s: MenuState | null) => void }>({
    name,
    addOptions() {
      return { onState: () => {} };
    },
    addProseMirrorPlugins() {
      let state: MenuState | null = null;
      const set = (s: MenuState | null) => {
        state = s;
        this.options.onState(s);
      };
      return [
        Suggestion<MenuItem, MenuItem>({
          editor: this.editor,
          char,
          pluginKey: new PluginKey(name),
          items: ({ query }) => items(query),
          command: ({ editor, range, props }) => props.run(editor, range),
          render: () => ({
            onStart: (p) =>
              set({
                kind,
                items: p.items,
                index: 0,
                rect: p.clientRect?.() ?? null,
                pick: (it) => p.command(it),
              }),
            onUpdate: (p) =>
              set({
                kind,
                items: p.items,
                index: 0,
                rect: p.clientRect?.() ?? null,
                pick: (it) => p.command(it),
              }),
            onKeyDown: ({ event }) => {
              if (!state?.items.length) return false;
              const n = state.items.length;
              if (event.key === "ArrowDown") {
                set({ ...state, index: (state.index + 1) % n });
                return true;
              }
              if (event.key === "ArrowUp") {
                set({ ...state, index: (state.index - 1 + n) % n });
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                state.pick(state.items[state.index]);
                return true;
              }
              if (event.key === "Escape") {
                set(null);
                return true;
              }
              return false;
            },
            onExit: () => set(null),
          }),
        }),
      ];
    },
  });
}

const matches = (q: string, it: MenuItem) =>
  `${it.label} ${it.keywords ?? ""}`.toLowerCase().includes(q.toLowerCase());

export function slashMenu(blocks: MenuItem[]) {
  return suggestionMenu("slashMenu", "slash", "/", (q) =>
    blocks.filter((b) => matches(q, b)).slice(0, 12)
  );
}

export const insertTag = (editor: Editor, key: string, range?: Range) => {
  const c = editor.chain().focus();
  (range ? c.deleteRange(range) : c)
    .insertContent({
      type: "mergeTag",
      attrs: { key, fallback: defaultFallback(key) },
    })
    .run();
};

export const TAG_ITEMS: MenuItem[] = MERGE_TAGS.map((t) => ({
  id: t.key,
  label: t.label,
  hint: `{{ ${t.key} }}`,
  icon: "braces",
  keywords: `${t.key} ${t.group}`,
  run: (editor, range) => insertTag(editor, t.key, range),
}));

export const tagMenu = suggestionMenu("tagMenu", "tag", "{{", (q) =>
  TAG_ITEMS.filter((t) => matches(q, t))
);
