"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  FingerPrintIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { PasskeyRecord } from "@/lib/passkey";
import {
  deletePasskey,
  isWebAuthnSupported,
  listPasskeys,
  registerPasskey,
  renamePasskey,
} from "@/lib/passkey";

import { Skeleton } from "@/shared/components/ui/skeleton";

const PASSKEYS_QUERY_KEY = ["settings", "passkeys"] as const;

const formatPasskeyDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;

const PasskeyRow = ({
  passkey,
  onRename,
  onDelete,
  renaming,
  deleting,
}: {
  passkey: PasskeyRecord;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  renaming: boolean;
  deleting: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(passkey.name ?? "");
  const createdLabel = formatPasskeyDate(passkey.createdAt);

  const submitRename = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error("Passkey name cannot be empty");
      return;
    }
    setIsEditing(false);
    if (trimmed !== (passkey.name ?? "")) {
      onRename(passkey.id, trimmed);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
      <FingerPrintIcon
        className="h-5 w-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") {
                setIsEditing(false);
                setDraftName(passkey.name ?? "");
              }
            }}
            className="h-8 bg-background"
            autoFocus
            aria-label="Passkey name"
          />
        ) : (
          <>
            <p className="truncate text-sm font-medium text-foreground">
              {passkey.name ?? "Unnamed passkey"}
            </p>
            <p className="text-xs text-muted-foreground">
              {createdLabel ? `Added ${createdLabel}` : "Registered passkey"}
              {passkey.backedUp ? " · Synced" : ""}
            </p>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={submitRename}
              aria-label="Save passkey name"
            >
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsEditing(false);
                setDraftName(passkey.name ?? "");
              }}
              aria-label="Cancel rename"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditing(true)}
              disabled={renaming || deleting}
              aria-label={`Rename passkey ${passkey.name ?? ""}`}
            >
              {renaming ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <PencilIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(passkey.id)}
              disabled={renaming || deleting}
              aria-label={`Delete passkey ${passkey.name ?? ""}`}
            >
              {deleting ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const PasskeysSection = () => {
  const queryClient = useQueryClient();
  // Feature-detect in an effect so SSR and the first client render agree.
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

  const passkeysQuery = useQuery({
    queryKey: PASSKEYS_QUERY_KEY,
    queryFn: ({ signal }) => listPasskeys(signal),
    staleTime: 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (name: string) => registerPasskey(name),
    onSuccess: () => {
      toast.success("Passkey added");
      setIsAdding(false);
      setNewName("");
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to add passkey"));
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renamePasskey(id, name),
    onSuccess: () => {
      toast.success("Passkey renamed");
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to rename passkey"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePasskey(id),
    onSuccess: () => {
      toast.success("Passkey removed");
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to delete passkey"));
    },
  });

  const passkeys = passkeysQuery.data ?? [];

  const handleAddSubmit = () => {
    if (addMutation.isPending) return;
    addMutation.mutate(newName);
  };

  // The empty state carries its own prominent CTA - hide the header button
  // then so there's a single, obvious "Add passkey" affordance.
  const showEmptyState =
    !passkeysQuery.isPending && !passkeysQuery.isError && passkeys.length === 0;
  const showHeaderAddButton =
    webAuthnSupported === true && !isAdding && !showEmptyState;

  return (
    <div className="space-y-4 border-t border-border/40 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Passkeys</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your device&apos;s fingerprint, face, or screen lock.
          </p>
        </div>
        {showHeaderAddButton ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsAdding(true)}
            disabled={addMutation.isPending}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Add passkey
          </Button>
        ) : null}
      </div>

      {webAuthnSupported === false ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card p-4 text-sm text-muted-foreground">
          Passkeys aren&apos;t supported in this browser. Try a recent version
          of Chrome, Safari, or Edge.
        </div>
      ) : null}

      {isAdding ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubmit();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewName("");
              }
            }}
            placeholder="Passkey name (e.g. MacBook Touch ID)"
            className="h-10 bg-background"
            autoFocus
            aria-label="New passkey name"
          />
          <div className="flex shrink-0 justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewName("");
              }}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleAddSubmit}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <FingerPrintIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {addMutation.isPending ? "Waiting for device..." : "Create"}
            </Button>
          </div>
        </div>
      ) : null}

      {passkeysQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : passkeysQuery.isError ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your passkeys - check your connection and retry.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              passkeysQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            No passkeys yet
            {webAuthnSupported
              ? " - add one to sign in without a password."
              : "."}
          </p>
          {webAuthnSupported && !isAdding ? (
            <Button
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setIsAdding(true)}
              disabled={addMutation.isPending}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Add passkey
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <PasskeyRow
              key={passkey.id}
              passkey={passkey}
              onRename={(id, name) => renameMutation.mutate({ id, name })}
              onDelete={(id) => deleteMutation.mutate(id)}
              renaming={
                renameMutation.isPending &&
                renameMutation.variables?.id === passkey.id
              }
              deleting={
                deleteMutation.isPending &&
                deleteMutation.variables === passkey.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PasskeysSection;
