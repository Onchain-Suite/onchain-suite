"use client";

import {
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import type { DomainStatus } from "../../utils/domain-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";

/**
 * Removes a sender domain behind the app's own confirmation dialog (replacing a
 * native window.confirm). Every delete confirms, since it is destructive; the
 * copy warns about lost branded sending only when the domain is verified.
 */
export function DeleteDomainButton({
  domain,
  status,
  pending,
  onConfirm,
}: {
  domain: string;
  status: DomainStatus;
  pending: boolean;
  onConfirm: () => void;
}) {
  const description =
    status === "verified"
      ? "This domain is verified and in use. Removing it stops every email that sends from it, scheduled sends included, until another domain is verified. Your DNS records stay where they are, so adding it again verifies quickly."
      : "This removes the domain and the DNS records generated for it. You can add it again later.";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={`Remove ${domain}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <TrashIcon aria-hidden="true" className="h-4 w-4" />
          {pending ? "Removing…" : "Remove domain"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-destructive/30 text-destructive"
            aria-hidden="true"
          >
            <ExclamationTriangleIcon className="size-4" aria-hidden="true" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {domain}?</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove domain
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
