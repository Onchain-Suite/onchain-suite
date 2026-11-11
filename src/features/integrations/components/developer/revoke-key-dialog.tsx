"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { DeveloperKey } from "../../contracts/developer";
import { developerService } from "../../developer.service";
import { Button } from "@/shared/components/ui/button";

const DEVELOPER_KEYS = ["developer", "keys"] as const;

/**
 * Revoking is destructive and immediate, so it goes through a confirm dialog -
 * a stray click should never kill a live key. For zero-downtime rotation the
 * copy points the user at Roll instead.
 */
export function RevokeKeyDialog({
  keyRow,
  onOpenChange,
}: {
  keyRow: DeveloperKey | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => developerService.revokeKey(id),
    onSuccess: () => {
      toast.success("Key revoked.");
      queryClient.invalidateQueries({ queryKey: DEVELOPER_KEYS });
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't revoke key."),
  });

  return (
    <Dialog open={keyRow !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Revoke {keyRow?.name ? `"${keyRow.name}"` : "this key"}?
          </DialogTitle>
          <DialogDescription>
            Any server still authenticating with this key stops working
            immediately, and this can&apos;t be undone. To rotate without
            downtime, use Roll instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => keyRow && mutation.mutate(keyRow.id)}
          >
            {mutation.isPending ? "Revoking…" : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
