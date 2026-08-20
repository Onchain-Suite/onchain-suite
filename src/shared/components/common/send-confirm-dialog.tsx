"use client";

import { ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/** One glanceable row in the confirmation summary (e.g. "Recipients · 1,240"). */
export interface SendConfirmDetail {
  label: string;
  value: ReactNode;
}

interface SendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short question, e.g. "Send this campaign?" */
  title: string;
  /** One-line context under the title. */
  description?: string;
  /** Minimal set of what's about to happen - keep it to the essentials. */
  details: SendConfirmDetail[];
  /** Optional cautionary line under the summary (e.g. irreversibility). */
  note?: string;
  confirmLabel: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  /** Disables the buttons and shows a spinner on the confirm action. */
  confirming?: boolean;
  onConfirm: () => void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Shared "are you sure you want to send" guard shown before any outbound action
 * that reaches real contacts - campaign sends (email + in-app), automation
 * activation, and form publishing. Renders a minimal summary of what's about to
 * happen (name, recipients, timing) so the user confirms with the facts in view.
 *
 * Presentational only: the parent owns the mutation and passes `confirming`;
 * `onConfirm` fires the send, and the parent closes the dialog when it settles.
 */
export function SendConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  note,
  confirmLabel,
  confirmingLabel,
  cancelLabel = "Cancel",
  confirming = false,
  onConfirm,
  icon: Icon = PaperAirplaneIcon,
}: SendConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let a backdrop/escape close swallow an in-flight send.
        if (confirming) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription>{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {details.length > 0 ? (
          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-sm text-muted-foreground">
                  {detail.label}
                </dt>
                <dd className="min-w-0 truncate text-right text-sm font-medium text-foreground">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {note ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {note}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirming}>
            {confirming ? (
              <>
                <ArrowPathIcon
                  aria-hidden="true"
                  className={cn("mr-2 h-4 w-4 animate-spin")}
                />
                {confirmingLabel ?? "Sending…"}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendConfirmDialog;
