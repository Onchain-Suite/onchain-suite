"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DocNode } from "../types/email-doc";
import { buildEmailPayload } from "../utils/email-payload";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import {
  type EmailSaveBlock,
  findEmailSaveBlock,
  publishEditorSaveMessage,
} from "@/features/presend/utils/email-save-block";
import { requestErrorMessage } from "@/features/presend/utils/presend-errors";
import {
  saveBlockFromError,
  saveBlockSignature,
} from "@/features/presend/utils/save-refusal";

const DEBOUNCE_MS = 1200;

export type SaveStatus =
  "idle" | "pending" | "saving" | "saved" | "error" | "blocked";

/**
 * Saves the email onto the campaign (POST /campaigns/{id}/editor/saved) a
 * moment after typing stops. Saves never overlap and never land out of order:
 * one runs at a time and the newest edit always wins. `flush` saves now and
 * resolves true once everything is saved (or nothing needed saving).
 *
 * A save refused by a pre-send block (422 PRESEND_BLOCKED) is not an error to
 * retry blindly: the content itself must change. It keeps the edit dirty (the
 * next change saves again), records the block in the shared store so the
 * campaign wizard and automation builder hold their Send / Publish, and asks
 * for the dialog. Autosave asks again only when the set of blocking codes or
 * links changes, so typing does not re-open it on every keystroke; a manual
 * save (flush) always asks. The next successful save clears the store.
 */
export function useEmailAutosave(campaignId: string, orgId?: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const [block, setBlock] = useState<EmailSaveBlock | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const latest = useRef<{ doc: DocNode; footer: string } | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const blockRef = useRef<EmailSaveBlock | null>(null);

  const onSaved = useCallback(() => {
    // A block may also be left over from an earlier editor visit in this tab.
    const stale =
      blockRef.current ?? findEmailSaveBlock({ campaignIds: [campaignId] });
    blockRef.current = null;
    setBlock(null);
    setDialogOpen(false);
    if (stale) publishEditorSaveMessage({ type: "cleared", campaignId });
  }, [campaignId]);

  const onBlocked = useCallback((next: EmailSaveBlock) => {
    const changed =
      saveBlockSignature(next) !== saveBlockSignature(blockRef.current);
    blockRef.current = next;
    setBlock(next);
    if (changed) publishEditorSaveMessage({ type: "blocked", block: next });
    if (changed || next.source === "save") setDialogOpen(true);
  }, []);

  const save = useCallback(
    async (source: EmailSaveBlock["source"]): Promise<boolean> => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      // Wait for a save already running, then save whatever is newer.
      if (inFlight.current) await inFlight.current;
      if (!dirty.current || !latest.current) return true;
      const payload = buildEmailPayload(
        latest.current.doc,
        latest.current.footer
      );
      dirty.current = false;
      setStatus("saving");
      const run = campaignsService
        .editorSaved(campaignId, payload, orgId)
        .then(() => {
          if (!dirty.current) setStatus("saved");
          setError("");
          onSaved();
          return true;
        })
        .catch((e: unknown) => {
          dirty.current = true;
          const refused = saveBlockFromError(e, { campaignId }, source);
          if (refused) {
            setStatus("blocked");
            setError("");
            onBlocked(refused);
          } else {
            setStatus("error");
            setError(requestErrorMessage(e, "Couldn't save"));
          }
          return false;
        })
        .finally(() => {
          inFlight.current = null;
        });
      inFlight.current = run;
      return run;
    },
    [campaignId, orgId, onSaved, onBlocked]
  );

  const schedule = useCallback(
    (doc: DocNode, footer: string) => {
      latest.current = { doc, footer };
      dirty.current = true;
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        save("autosave").catch(() => undefined);
      }, DEBOUNCE_MS);
    },
    [save]
  );

  const flush = useCallback(() => save("save"), [save]);
  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const isBlocked = useCallback(() => blockRef.current !== null, []);

  /* Leaving with unsaved edits asks first. */
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const label =
    status === "pending" || status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved to this campaign"
        : status === "blocked"
          ? "Not saved"
          : status === "error"
            ? `Not saved. ${error}`
            : "";

  return {
    schedule,
    flush,
    status,
    label,
    block,
    dialogOpen,
    closeDialog,
    isBlocked,
  };
}
