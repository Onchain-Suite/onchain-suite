"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

export const UNENGAGED_EXPLANATION =
  "By default we skip contacts with no opens or clicks in 180 days, or 11 sends in a row without one. Mailing them anyway raises bounces and spam complaints, which can push future emails into spam for everyone.";

/**
 * "Include unengaged contacts" for one send (a campaign, or an automation's
 * email steps). Off by default. Turning it ON goes through a confirm, because
 * it is the one choice here that can hurt the sender's reputation; turning it
 * off again needs no confirm.
 *
 * Controlled: `checked` is "include unengaged" (so for an automation, pass
 * `!sunset`). `onChange` fires only after the confirm.
 */
export function UnengagedContactsToggle({
  checked,
  onChange,
  disabled,
  excludedCount,
  className,
}: {
  checked: boolean;
  onChange: (include: boolean) => void;
  disabled?: boolean;
  /** How many contacts the exclusion skips right now, when known. */
  excludedCount?: number | null;
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const request = (next: boolean) => {
    if (next) setConfirmOpen(true);
    else onChange(false);
  };

  const countLine =
    typeof excludedCount === "number" && excludedCount > 0
      ? checked
        ? `${excludedCount.toLocaleString()} unengaged contacts will get this send.`
        : `${excludedCount.toLocaleString()} unengaged contacts are skipped.`
      : null;

  return (
    <div
      className={
        className ??
        "flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
      }
    >
      <div>
        <p className="text-sm font-medium text-foreground">
          Include unengaged contacts
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {UNENGAGED_EXPLANATION}
        </p>
        {countLine ? (
          <p className="mt-1 text-xs text-muted-foreground">{countLine}</p>
        ) : null}
        {checked ? (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            On: unengaged contacts get this send.
          </p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={request}
        aria-label="Include unengaged contacts"
      />

      <UnengagedConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          onChange(true);
        }}
      />
    </div>
  );
}

/** The deliverability warning shown before a send is opened up to unengaged contacts. */
export function UnengagedConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Include unengaged contacts?</AlertDialogTitle>
          <AlertDialogDescription>
            These contacts have not opened or clicked in a long time. Inbox
            providers watch how people react to your mail, and sending to people
            who ignore it can lower your sender reputation and land later emails
            in spam. Only do this if you know the list is still good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep skipping them</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Include them
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
