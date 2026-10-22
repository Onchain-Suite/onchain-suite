/**
 * The email body as a document: ProseMirror JSON, as Tiptap's `editor.getJSON()`
 * returns it. This is what the editor saves as a design's `json`, tagged with
 * EMAIL_DOC_FORMAT so a later load can tell it apart from older formats (the
 * legacy block-builder `EmailLayout` JSON, or HTML-only templates).
 *
 * Nothing in here imports Tiptap, so the renderer, the checks and their tests
 * stay cheap to load: the editor's weight only arrives when someone opens it.
 */

export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
}

/** Marks a saved design as this editor's document (v1). */
export const EMAIL_DOC_FORMAT = "os-email-doc@1";

/** What the editor persists as a design's `json`. */
export interface SavedEmailDesign {
  format: typeof EMAIL_DOC_FORMAT;
  doc: DocNode;
  /** The compliance footer, kept outside the editable body so it can't be deleted. */
  footer: string;
}
