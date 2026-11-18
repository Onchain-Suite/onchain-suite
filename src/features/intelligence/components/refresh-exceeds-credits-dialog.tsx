"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

const BILLING_HREF = "/settings?tab=billing";

/**
 * Asks before a refresh that may not fit in the Onchain credits left. Shows the
 * backend's message as sent (it carries the wallet count and credit numbers),
 * and offers to refresh what fits or to top up / upgrade in billing.
 */
export function RefreshExceedsCreditsDialog({
  message,
  pending,
  onRefreshWhatFits,
  onClose,
}: {
  /** The backend's message; the dialog is open while this is set. */
  message: string | null;
  pending: boolean;
  onRefreshWhatFits: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={message !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Not enough Onchain credits</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Link
            href={BILLING_HREF}
            onClick={onClose}
            className={buttonVariants({ variant: "outline" })}
          >
            Go to billing
          </Link>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              // Stay open until the request settles; success closes it.
              e.preventDefault();
              onRefreshWhatFits();
            }}
          >
            {pending ? "Refreshing…" : "Refresh what fits"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
