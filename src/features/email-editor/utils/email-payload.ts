import {
  type DocNode,
  EMAIL_DOC_FORMAT,
  type SavedEmailDesign,
} from "../types/email-doc";
import { renderEmailHtml, renderEmailText } from "./render-email";

/** What a save sends: the inbox HTML, the plain-text part, and the design to reopen. */
export type EmailPayload = {
  html: string;
  json: SavedEmailDesign;
  textVersion: string;
};

/**
 * The body and footer as the backend stores them. `html` is the send render
 * (merge tags as tokens, tag sections as `{% if %}`), so what is saved is
 * exactly what goes out; `json` is the editor's own document.
 */
export function buildEmailPayload(doc: DocNode, footer: string): EmailPayload {
  return {
    html: renderEmailHtml(doc, { footer, mode: "send" }),
    json: { format: EMAIL_DOC_FORMAT, doc, footer },
    textVersion: renderEmailText(doc, footer),
  };
}
