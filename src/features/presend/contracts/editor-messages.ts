/**
 * postMessages the hosted email editor (editor.onchainsuite.com, iframed)
 * sends its host when the backend refused to save a design (email-editor PR,
 * 2026-11-21; backend `POST /email-designs/{id}/editor/saved` and
 * `PUT /email-designs/{id}/email` refuse content blocks for a design whose
 * automation is ACTIVE). Types only.
 *
 * Until the editor ships these, the host simply never receives them.
 */

/** A content check the editor's save was refused for. */
export interface EditorSaveBlockCheck {
  code: string;
  message: string;
  fix?: string;
  /** Evidence (e.g. the shortened links). Shown as text, never as links. */
  links?: string[];
}

/** `EMAIL_SAVE_BLOCKED`: the latest edit is NOT persisted. */
export interface EmailSaveBlockedMessage {
  type: "EMAIL_SAVE_BLOCKED";
  campaignId?: string;
  designId?: string;
  /** A manual save or an autosave was refused. */
  source?: "save" | "autosave";
  status?: "saveBlocked";
  /** The refusal's code, e.g. `PRESEND_BLOCKED`. */
  code?: string;
  message?: string;
  rulesetVersion?: string;
  checks?: EditorSaveBlockCheck[];
}

/** `EMAIL_SAVE_BLOCK_CLEARED`: a later save of the same design went through. */
export interface EmailSaveBlockClearedMessage {
  type: "EMAIL_SAVE_BLOCK_CLEARED";
  campaignId?: string;
  designId?: string;
}
