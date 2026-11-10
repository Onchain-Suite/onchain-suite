"use client";

import { useDeleteAutomation } from "../hooks/use-automations";
import type { LoopRow } from "../utils/loop-rows";
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

/** Confirms deleting a Loop from the list; it stops all of its triggers. */
export function DeleteLoopDialog({
  pendingDelete,
  setPendingDelete,
}: {
  pendingDelete: LoopRow | null;
  setPendingDelete: (row: LoopRow | null) => void;
}) {
  const deleteAutomation = useDeleteAutomation(() => setPendingDelete(null));
  return (
    <AlertDialog
      open={pendingDelete !== null}
      onOpenChange={(open) => {
        if (!open && !deleteAutomation.isPending) setPendingDelete(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Loop?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.name}
            </span>{" "}
            and stops all of its active triggers. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAutomation.isPending}>
            Keep Loop
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteAutomation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (pendingDelete) deleteAutomation.mutate(pendingDelete.id);
            }}
          >
            {deleteAutomation.isPending ? "Deleting…" : "Delete Loop"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
