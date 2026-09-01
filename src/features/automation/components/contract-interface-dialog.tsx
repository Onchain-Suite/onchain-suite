"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { automationService } from "@/features/automation/automation.service";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/**
 * Paste an ABI (EVM) or IDL (Solana) for a contract.
 *
 * WHY THIS EXISTS IN SETTINGS RATHER THAN THE BUILDER
 *
 * An interface is a property of an ADDRESS, not of a flow. Submitting it once
 * here fixes every automation anyone builds on that contract afterwards, which
 * is also why it is stored per (chain, address) and shared across
 * organisations rather than per customer.
 *
 * WHY THE EDITOR IS BIG AND VALIDATES AS YOU TYPE
 *
 * These are thousand-line JSON files pasted from an explorer or `anchor idl
 * fetch`. A one-line input makes a truncated paste invisible, and the failure
 * would only surface later as a picker that names no events. So: a full-height
 * monospace editor, live JSON parsing, and the top-level shape checked before
 * the request is ever made.
 */

/** What we can tell about the pasted text without asking the server. */
type LocalCheck =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "valid"; summary: string };

function inspect(text: string, family: "evm" | "solana"): LocalCheck {
  const trimmed = text.trim();
  if (!trimmed) return { state: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    // The message from JSON.parse names the position, which is the single most
    // useful thing when a paste was truncated.
    return {
      state: "invalid",
      message: error instanceof Error ? error.message : "Not valid JSON",
    };
  }

  if (family === "evm") {
    const abi = Array.isArray(parsed)
      ? parsed
      : (parsed as { abi?: unknown })?.abi;
    if (!Array.isArray(abi)) {
      return {
        state: "invalid",
        message: 'An EVM ABI is a JSON array of fragments, or {"abi": [...]}.',
      };
    }
    const events = abi.filter(
      (entry) => (entry as { type?: string })?.type === "event"
    ).length;
    if (events === 0) {
      // Caught here rather than server-side because it is the commonest
      // mistake — pasting the proxy's ABI, or a function-only fragment.
      return {
        state: "invalid",
        message:
          "That ABI has no events. Automations trigger on events — check you pasted the right contract.",
      };
    }
    return {
      state: "valid",
      summary: `${events} event${events === 1 ? "" : "s"} found`,
    };
  }

  const idl = (parsed as { idl?: unknown })?.idl ?? parsed;
  if (!idl || typeof idl !== "object" || Array.isArray(idl)) {
    return { state: "invalid", message: "An Anchor IDL is a JSON object." };
  }
  const record = idl as { events?: unknown[]; instructions?: unknown[] };
  const events = Array.isArray(record.events) ? record.events.length : 0;
  const instructions = Array.isArray(record.instructions)
    ? record.instructions.length
    : 0;
  if (events + instructions === 0) {
    return {
      state: "invalid",
      message:
        "That IDL declares no events or instructions — check you pasted a program IDL.",
    };
  }
  // Instructions are named as well as events: Solana triggers match an
  // instruction name, so a program with no events block is still usable.
  return {
    state: "valid",
    summary: `${events} event${events === 1 ? "" : "s"}, ${instructions} instruction${
      instructions === 1 ? "" : "s"
    }`,
  };
}

export function ContractInterfaceDialog({
  open,
  onOpenChange,
  chain,
  address,
  label,
  organizationId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  address: string;
  label?: string;
  organizationId?: string;
  /**
   * Called after a successful save. The dialog invalidates its own lookup, but
   * it cannot know what ELSE went stale — the builder's event list is keyed on
   * the trigger as well as the address, and a picker still showing "no events"
   * after a good paste is the exact confusion this flow exists to remove.
   */
  onSubmitted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const family: "evm" | "solana" = chain.toLowerCase().startsWith("solana")
    ? "solana"
    : "evm";
  const check = useMemo(() => inspect(text, family), [text, family]);

  const submit = useMutation({
    mutationFn: () =>
      automationService.submitContractInterface(
        { chain, address, artifact: JSON.parse(text), family },
        organizationId
      ),
    onSuccess: (result) => {
      toast.success(
        `Interface saved — ${result.events.length} event${
          result.events.length === 1 ? "" : "s"
        } named. It now applies to everyone watching this contract.`
      );
      queryClient
        .invalidateQueries({
          queryKey: ["contract-interface", chain, address],
        })
        .catch(() => undefined);
      onSubmitted?.();
      onOpenChange(false);
      setText("");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Could not save that interface"
      ),
  });

  /** Reformat in place — the fastest way to see where a paste went wrong. */
  const format = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      // Nothing to format; the inline error already says so.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Submit {family === "solana" ? "IDL" : "ABI"}
          </DialogTitle>
          <DialogDescription>
            {label ? `${label} · ` : ""}
            <span className="font-mono text-xs">{address}</span>
            <span className="mt-2 block">
              {family === "solana"
                ? "Paste the program's Anchor IDL. Solana has no ABI, so this is the only way to name a program's events and instructions."
                : "Paste the contract ABI. Only needed when the contract isn't verified — verified ones resolve automatically."}{" "}
              Saved against this address and shared with everyone who watches
              it.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            // Big on purpose: these are thousand-line files, and a small box
            // hides a truncated paste until it fails much later.
            className="h-[380px] w-full resize-y rounded-xl border border-border/70 bg-background/60 p-4 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-primary/60"
            placeholder={
              family === "solana"
                ? '{\n  "name": "my_program",\n  "instructions": [ … ],\n  "events": [ … ]\n}'
                : '[\n  {\n    "type": "event",\n    "name": "Transfer",\n    "inputs": [ … ]\n  }\n]'
            }
          />

          <div className="flex min-h-[20px] items-center justify-between gap-3">
            {check.state === "invalid" ? (
              <p className="text-xs text-red-400">{check.message}</p>
            ) : check.state === "valid" ? (
              <p className="text-xs text-emerald-400">{check.summary}</p>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={format}
              disabled={check.state !== "valid"}
            >
              Format
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submit.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => submit.mutate()}
            // Never submittable while the local check fails: the server would
            // reject it anyway, and a round trip to learn what the textarea
            // already knows is a worse experience.
            disabled={check.state !== "valid" || submit.isPending}
          >
            {submit.isPending ? "Saving…" : "Save interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The "this address is covered" marker for a contract row. */
export function InterfaceSubmittedBadge({
  eventCount,
}: {
  eventCount: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400"
      title={`Interface submitted — ${eventCount} event${
        eventCount === 1 ? "" : "s"
      } named`}
    >
      <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
      ABI
    </span>
  );
}

export default ContractInterfaceDialog;
