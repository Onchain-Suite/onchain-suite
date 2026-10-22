/**
 * Pure merge logic for reflecting a saved email design back onto a Send Email
 * node. The builder opens the visual editor in another tab; when the user
 * returns we read the campaign's email content and fold the subject, preview
 * text and (when the design became a template) the template id + name onto the
 * node so the step is "tagged" by the email the user just built.
 *
 * Kept free of React / network so the mapping is unit-tested without mounting
 * the 4.9k-line builder (CLAUDE.md 15.4).
 */

/** The slice of the campaign email-content response the node cares about. */
export interface EmailSyncContent {
  subject?: string | null;
  previewText?: string | null;
  templateId?: string | null;
}

/** A template option from the builder's picker (only id + name are needed). */
export interface EmailTemplateLite {
  id: string;
  name?: string | null;
}

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Compute the Send Email node `data` patch from a saved email design. Returns
 * only the fields that are actually present, so a partial save never blanks a
 * value the node already has.
 *
 * The template name falls back to the subject (then a generic label) so a
 * freshly-created template - whose name has not yet landed in the picker's
 * refetched list - still leaves the node named rather than blank, which was the
 * reason a built email looked "not tagged" on the node.
 */
export function emailNodePatch(
  content: EmailSyncContent,
  templates: EmailTemplateLite[]
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const subject = clean(content.subject);
  const previewText = clean(content.previewText);
  const templateId = clean(content.templateId);

  if (subject) patch.subject = subject;
  if (previewText) patch.previewText = previewText;
  if (templateId) {
    patch.templateId = templateId;
    const named = templates.find((t) => t.id === templateId);
    patch.templateName = clean(named?.name) || subject || "Saved email";
  }
  return patch;
}

/** True when a patch carries at least one saved-email field worth applying. */
export const hasEmailPatch = (patch: Record<string, unknown>): boolean =>
  Object.keys(patch).length > 0;
