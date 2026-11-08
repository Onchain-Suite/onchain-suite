"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { type DmChannel, dmSendService } from "./dm-send.service";

/** "about 3 hours", "about 71 days": the scale a person plans around. */
export function humanDuration(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  if (s < 90) return "about a minute";
  if (s < 90 * 60) return `about ${Math.round(s / 60)} minutes`;
  if (s < 36 * 3600) return `about ${Math.round(s / 3600)} hours`;
  return `about ${Math.round(s / 86_400)} days`;
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The warning a client must accept before a bulk Telegram, X or Discord DM
 * send. Each platform only allows these messages to people who contacted the
 * client first, and breaking that can get their bot or account banned, so the
 * rule, the risk and this send's own numbers are spelled out, and Send stays
 * disabled until every statement is ticked. The server records exactly these
 * statements as the consent.
 */
export function DmConsentDialog({
  open,
  campaignId,
  channel,
  onOpenChange,
  onQueued,
}: {
  open: boolean;
  campaignId: string | null;
  channel: DmChannel | null;
  onOpenChange: (open: boolean) => void;
  onQueued: () => void;
}) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());

  const preflight = useQuery({
    queryKey: ["campaigns", campaignId, "dm-preflight", channel],
    enabled: open && Boolean(campaignId && channel),
    retry: false,
    staleTime: 0,
    queryFn: () => dmSendService.preflight(campaignId ?? "", channel ?? "x"),
  });

  // A new send (or a reopened dialog) starts with nothing ticked.
  useEffect(() => {
    if (open) setTicked(new Set());
  }, [open, campaignId, channel]);

  const send = useMutation({
    mutationFn: (version: string) =>
      campaignId && channel
        ? dmSendService.launch(campaignId, channel, version)
        : Promise.reject(new Error("Nothing to send.")),
    onSuccess: () => {
      onOpenChange(false);
      onQueued();
    },
  });

  const p = preflight.data;
  const statements = p?.consent.statements ?? [];
  const allTicked =
    p?.consent.accepted === true ||
    (statements.length > 0 && statements.every((_, i) => ticked.has(i)));
  const canSend = Boolean(p && p.reachable > 0 && allTicked && !send.isPending);

  const toggle = (i: number, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(i);
      else next.delete(i);
      return next;
    });

  return (
    <Dialog
      open={open}
      onOpenChange={send.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {p
              ? `Send ${p.consent.platform} DMs to ${p.reachable.toLocaleString()} ${p.reachable === 1 ? "person" : "people"}?`
              : "Before you send DMs"}
          </DialogTitle>
          <DialogDescription>
            Only send to people who messaged you first.
          </DialogDescription>
        </DialogHeader>

        {preflight.isPending ? (
          <p className="text-sm text-muted-foreground">
            Checking your audience…
          </p>
        ) : preflight.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {preflight.error instanceof Error
              ? preflight.error.message
              : "Couldn't load the sending rules."}
          </p>
        ) : p ? (
          <div className="space-y-4">
            <div
              role="note"
              className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-foreground">{p.consent.rule}</p>
                <p className="font-medium text-foreground">{p.consent.risk}</p>
                {p.consent.policyUrl ? (
                  <a
                    href={p.consent.policyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline underline-offset-2"
                  >
                    Read {p.consent.platform}&apos;s rule
                  </a>
                ) : null}
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 text-sm">
              <Fact label="Reaches" value={p.reachable.toLocaleString()} />
              <Fact
                label="Takes"
                value={humanDuration(p.estimatedDurationSeconds)}
              />
              <Fact
                label="Costs"
                value={
                  p.cost && p.cost.estimatedUsd > 0
                    ? `${usd(p.cost.estimatedUsd)}${p.cost.billedTo === "client" ? ` to your ${p.consent.platform} account` : ""}`
                    : `Free on ${p.consent.platform}`
                }
              />
            </dl>

            {p.reachable === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody in this audience can be reached on {p.consent.platform}{" "}
                yet. People have to opt in first.
              </p>
            ) : p.consent.accepted ? (
              <p className="text-sm text-muted-foreground">
                You already accepted these terms for this campaign. Sending
                again resumes it and never messages anyone twice.
              </p>
            ) : (
              <fieldset className="space-y-2.5">
                <legend className="mb-1 text-sm font-medium text-foreground">
                  Tick each one to confirm
                </legend>
                {statements.map((s, i) => (
                  <label
                    key={s}
                    htmlFor={`dm-consent-${i}`}
                    className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground"
                  >
                    <Checkbox
                      id={`dm-consent-${i}`}
                      className="mt-0.5"
                      checked={ticked.has(i)}
                      onCheckedChange={(v) => toggle(i, v === true)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </fieldset>
            )}

            {send.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {send.error instanceof Error
                  ? send.error.message
                  : "The send didn't start."}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={send.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!canSend}
            onClick={() => p && send.mutate(p.consent.version)}
          >
            {send.isPending
              ? "Starting…"
              : p?.consent.accepted
                ? "Resume send"
                : "Send DMs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
