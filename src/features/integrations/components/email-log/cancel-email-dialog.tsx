"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/shared/components/ui/button";

/**
 * Cancelling cannot be undone (the email and its recipients become
 * `canceled`, and no webhook fires), so it is never one click.
 */
export function CancelEmailDialog({
  open,
  subject,
  recipientCount,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  subject: string;
  recipientCount: number;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const who =
    recipientCount === 1 ? "its recipient" : `its ${recipientCount} recipients`;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this scheduled email?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">
              {subject || "(no subject)"}
            </span>{" "}
            will not be sent to {who}. This can&apos;t be undone: to send it
            later, send it again from your server.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Canceling…" : "Cancel email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
