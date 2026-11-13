"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { SettingsCard } from "@/features/settings/components/settings-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const CONFIRM_WORD = "DELETE";

const extractErrorCode = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!isJsonObject(data)) return "";
  const nested = isJsonObject(data.error) ? data.error : data;
  const code = nested.code ?? nested.errorCode;
  return typeof code === "string" ? code : "";
};

/**
 * Self-serve account deletion (`DELETE /auth/account`, docs/backend.md
 * 2026-07-29). Sole-member workspaces are deleted with the account; owning a
 * workspace that still has other members returns 400
 * TRANSFER_OWNERSHIP_REQUIRED - surfaced with a clear next step.
 */
export default function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  // Every workspace this account belongs to. Deleting the account removes
  // the person from ALL of them, not only the ones it deletes: on 2026-11-13
  // a user who wanted one workspace gone deleted his account (the only button
  // that did it) and lost access to two other teams' workspaces. Name them.
  const workspaces = (useOrgSwitcherContextOptional()?.organizations ?? [])
    .map((org) => org.name?.trim())
    .filter((name): name is string => Boolean(name));

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete("/auth/account");
    },
    onSuccess: async () => {
      toast.success("Your account has been deleted");
      await signOut();
    },
    onError: (error: unknown) => {
      const code = extractErrorCode(error);
      if (
        code === "TRANSFER_OWNERSHIP_REQUIRED" ||
        (error instanceof Error &&
          error.message.includes("TRANSFER_OWNERSHIP_REQUIRED"))
      ) {
        toast.error(
          "You own a workspace that still has other members. Transfer ownership (Settings → Account → Team members) or remove the members first, then try again."
        );
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    },
  });

  return (
    <SettingsCard
      title="Danger zone"
      description="Permanently delete your account. You lose access to every workspace you belong to."
      className="border-destructive/40"
      action={
        <Button
          variant="destructive"
          className="shrink-0 rounded-xl"
          onClick={() => {
            setConfirmText("");
            setOpen(true);
          }}
        >
          Delete account
        </Button>
      }
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-destructive"
        />
        <p className="max-w-xl text-sm text-muted-foreground">
          Deleting your account removes your profile, removes you from every
          workspace you belong to, and deletes the workspaces where you are the
          only member. To leave or delete one workspace without losing the
          others, ask its owner or support instead.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Delete your account?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes your account and any workspace where you
              are the only member. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {workspaces.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-foreground">
                You will lose access to{" "}
                {workspaces.length === 1
                  ? "this workspace"
                  : `all ${workspaces.length} of these workspaces`}
                :
              </p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {workspaces.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">
                Getting back in later needs each workspace&apos;s owner to
                invite you again.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirm">
              Type <span className="font-semibold">{CONFIRM_WORD}</span> to
              confirm
            </Label>
            <Input
              id="delete-account-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteAccountMutation.isPending}
            >
              Keep my account
            </Button>
            <Button
              variant="destructive"
              disabled={
                confirmText.trim() !== CONFIRM_WORD ||
                deleteAccountMutation.isPending
              }
              onClick={() => deleteAccountMutation.mutate()}
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}
