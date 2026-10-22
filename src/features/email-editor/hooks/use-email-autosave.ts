"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DocNode } from "../types/email-doc";
import { buildEmailPayload } from "../utils/email-payload";
import { campaignsService } from "@/features/campaigns/campaigns.service";

const DEBOUNCE_MS = 1200;

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Saves the email onto the campaign (POST /campaigns/{id}/editor/saved) a
 * moment after typing stops. Saves never overlap and never land out of order:
 * one runs at a time and the newest edit always wins. `flush` saves now and
 * resolves true once everything is saved (or nothing needed saving).
 */
export function useEmailAutosave(campaignId: string, orgId?: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const latest = useRef<{ doc: DocNode; footer: string } | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
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
        return true;
      })
      .catch((e: unknown) => {
        dirty.current = true;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Couldn't save");
        return false;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, [campaignId, orgId]);

  const schedule = useCallback(
    (doc: DocNode, footer: string) => {
      latest.current = { doc, footer };
      dirty.current = true;
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, DEBOUNCE_MS);
    },
    [save]
  );

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
        : status === "error"
          ? `Not saved. ${error}`
          : "";

  return { schedule, flush: save, status, label };
}
