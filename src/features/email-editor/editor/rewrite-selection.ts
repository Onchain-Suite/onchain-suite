import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

import { rewrite, type RewriteId, shortenCut } from "../utils/rewrite";

/** How a merge tag reads to the rewrite rules: as a token they leave alone. */
const tagText = (n: PMNode) => `{{ ${String(n.attrs.key)} }}`;

/** Text of a range as the rewrite actions see it: merge tags as {{ tags }}. */
function rangeText(doc: PMNode, from: number, to: number): string {
  let out = "";
  doc.nodesBetween(from, to, (n, pos) => {
    if (n.isText)
      out += (n.text ?? "").slice(
        Math.max(0, from - pos),
        Math.min(n.nodeSize, to - pos)
      );
    else if (n.type.name === "mergeTag") out += tagText(n);
  });
  return out;
}

/**
 * Rewrites the selection, or the paragraph the cursor is in, run by run, so a
 * bold word or a link keeps its formatting: each run of text is rewritten
 * inside its own marks, and "shorten" then cuts whole trailing sentences.
 * Returns a message for the user; one undo reverts it.
 */
export function rewriteSelection(
  editor: Editor,
  id: RewriteId
): { ok: boolean; message: string } {
  const { state } = editor;
  const { $from, $to } = state.selection;
  let { from, to } = state.selection;
  if (
    !(state.selection instanceof TextSelection) ||
    !$from.parent.isTextblock
  ) {
    return {
      ok: false,
      message: "Put the cursor in some text, or select it, to rewrite",
    };
  }
  if ($from.parent !== $to.parent)
    return {
      ok: false,
      message: "Select text within one paragraph to rewrite it",
    };
  if (from === to) {
    from = $from.start();
    to = $from.end();
  }
  if (!rangeText(state.doc, from, to).trim())
    return { ok: false, message: "Nothing to change there" };

  const { tr } = state;
  const runs: { s: number; e: number; node: PMNode }[] = [];
  state.doc.nodesBetween(from, to, (n, pos) => {
    if (n.isText)
      runs.push({
        s: Math.max(from, pos),
        e: Math.min(to, pos + n.nodeSize),
        node: n,
      });
  });
  // Right to left, so earlier positions are still valid when they are reached.
  for (const { s, e, node } of [...runs].reverse()) {
    const before = rangeText(state.doc, from, s);
    const startsSentence = !before.trim() || /[.!?]\s*$/.test(before);
    const text = state.doc.textBetween(s, e);
    const out = rewrite(id, text, { fragment: true, startsSentence });
    if (out === text) continue;
    if (out) tr.replaceWith(s, e, state.schema.text(out, node.marks));
    else tr.delete(s, e);
  }

  if (id === "shorten") {
    const a = tr.mapping.map(from);
    const b = tr.mapping.map(to);
    const cut = shortenCut(rangeText(tr.doc, a, b));
    if (cut !== null) {
      // Walk to the document position of character `cut`; a merge tag is many
      // characters of text but one position.
      let left = cut;
      let at = a;
      tr.doc.nodesBetween(a, b, (n, pos) => {
        if (left <= 0) return false;
        if (n.isText) {
          const start = Math.max(a, pos);
          const len = Math.min(b, pos + n.nodeSize) - start;
          if (left <= len) {
            at = start + left;
            left = 0;
          } else {
            left -= len;
            at = start + len;
          }
        } else if (n.type.name === "mergeTag") {
          left -= tagText(n).length;
          at = pos + 1;
        }
        return true;
      });
      if (at < b) tr.delete(at, b);
    }
  }

  if (!tr.docChanged) return { ok: false, message: "Nothing to change there" };
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return { ok: true, message: "Rewritten. Undo reverts it" };
}
