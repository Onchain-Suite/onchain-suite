"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { WebhookEndpoint } from "../../contracts/developer";
import { Button } from "@/shared/components/ui/button";

/**
 * Removing an endpoint cannot be undone and its signing secret goes with it,
 * so a stray click on the bin never does it on its own.
 */
export function RemoveEndpointDialog({
  webhook,
  pending,
  onConfirm,
  onClose,
}: {
  webhook: WebhookEndpoint | null;
  pending: boolean;
  onConfirm: (webhook: WebhookEndpoint) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={webhook !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove this endpoint?</DialogTitle>
          <DialogDescription>
            <code className="font-mono break-all text-foreground">
              {webhook?.url}
            </code>{" "}
            stops receiving events now, and its signing secret is deleted. To
            stop deliveries for a while, pause it instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => webhook && onConfirm(webhook)}
          >
            {pending ? "Removing…" : "Remove endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
