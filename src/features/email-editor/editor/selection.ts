import type { Node as PMNode } from "@tiptap/pm/model";
import { type EditorState, NodeSelection } from "@tiptap/pm/state";

/** The email nodes edited from the panel rather than in place. */
export const ATOMS = new Set([
  "emailButton",
  "emailImage",
  "spacer",
  "socialLinks",
  "htmlBlock",
]);

export interface SelectedNode {
  node: PMNode;
  pos: number;
}

/** What the inspector should show for a selection: an atom, the tag section around it, or neither. */
export function selectedParts(state: EditorState | undefined): {
  atom: SelectedNode | null;
  section: SelectedNode | null;
} {
  const sel = state?.selection;
  if (!sel) return { atom: null, section: null };
  const atom =
    sel instanceof NodeSelection && ATOMS.has(sel.node.type.name)
      ? { node: sel.node, pos: sel.from }
      : null;
  if (sel instanceof NodeSelection && sel.node.type.name === "tagSection") {
    return { atom, section: { node: sel.node, pos: sel.from } };
  }
  for (let d = sel.$from.depth; d > 0; d--) {
    const n = sel.$from.node(d);
    if (n.type.name === "tagSection")
      return { atom, section: { node: n, pos: sel.$from.before(d) } };
  }
  return { atom, section: null };
}
