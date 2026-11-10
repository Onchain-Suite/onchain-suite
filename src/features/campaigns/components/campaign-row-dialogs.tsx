"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

import { getSelectedOrganizationId } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import type { Campaign } from "../types/campaign";

/**
 * The confirmations behind a campaign row's Delete and Cancel. Each refetches
 * the list on success, so the row leaves or changes status in place.
 */
export function CampaignRowDialogs({
  deleteTarget,
  cancelTarget,
  setDeleteTarget,
  setCancelTarget,
}: {
  deleteTarget: Campaign | null;
  cancelTarget: Campaign | null;
  setDeleteTarget: (c: Campaign | null) => void;
  setCancelTarget: (c: Campaign | null) => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      campaignsService.deleteCampaign(
        id,
        getSelectedOrganizationId() ?? undefined
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      toast.success("Campaign deleted");
      setDeleteTarget(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't delete campaign"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      campaignsService.cancelCampaign(
        id,
        getSelectedOrganizationId() ?? undefined
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      toast.success("Campaign canceled");
      setCancelTarget(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't cancel campaign"),
  });

  return (
    <>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete campaign</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name ?? "this campaign"}
              </span>
              ? This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => {
          if (!o && !cancelMutation.isPending) setCancelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel campaign</DialogTitle>
            <DialogDescription>
              Stop sending{" "}
              <span className="font-medium text-foreground">
                {cancelTarget?.name ?? "this campaign"}
              </span>
              ? Messages already delivered can&apos;t be recalled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Keep sending
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
              }}
            >
              {cancelMutation.isPending ? "Canceling…" : "Cancel campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
