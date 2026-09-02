"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { usePagination } from "../../hooks/use-pagination";
import { ListPager } from "../list-pager";
import { SettingsCard, StatusPill } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

const sendersKey = (orgId: string | null) =>
  ["account", "senders", orgId] as const;

const SENDERS_PER_PAGE = 5;

export function SenderIdentitiesCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "" });

  const sendersQuery = useQuery({
    queryKey: sendersKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      senderIdentitiesService.listSenderIdentities(organizationId ?? undefined),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: sendersKey(organizationId) });

  const addMutation = useMutation({
    mutationFn: async () => {
      const email = draft.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email on a verified domain");
      }
      return senderIdentitiesService.createSenderIdentity(
        { email, name: draft.name.trim() || undefined },
        organizationId ?? undefined
      );
    },
    onSuccess: async () => {
      await invalidate();
      setAdding(false);
      setDraft({ email: "", name: "" });
      toast.success("Sender added");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to add sender"),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) =>
      senderIdentitiesService.setDefaultSenderIdentity(
        id,
        organizationId ?? undefined
      ),
    onSuccess: async () => {
      await invalidate();
      toast.success("Default sender updated");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to set default"),
  });

  const recheckMutation = useMutation({
    mutationFn: (id: string) =>
      senderIdentitiesService.recheckSenderIdentity(
        id,
        organizationId ?? undefined
      ),
    onSuccess: async () => {
      await invalidate();
      toast.success("Recheck started");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to recheck"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      senderIdentitiesService.deleteSenderIdentity(
        id,
        organizationId ?? undefined
      ),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sender removed");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove sender"),
  });

  const senders = sendersQuery.data ?? [];
  const pager = usePagination(senders, SENDERS_PER_PAGE);

  return (
    <SettingsCard
      title="Sender addresses"
      description="From-addresses on your verified domains"
      action={
        !adding ? (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            disabled={!organizationId}
          >
            <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Add sender
          </Button>
        ) : null
      }
    >
      {adding ? (
        <form
          className="mb-4 grid gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <Input
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            placeholder="hello@yourdomain.com"
            type="email"
          />
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Display name (optional)"
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add sender"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {sendersQuery.isLoading ? (
        <div className="space-y-3">
          {["a", "b"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : senders.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No senders yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a From-address on a verified domain to start sending.
          </p>
        </div>
      ) : senders.length > 0 ? (
        <ul className="divide-y divide-border/50">
          {pager.items.map((sender) => (
            <li
              key={sender.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {sender.email}
                  </span>
                  {sender.isDefault ? (
                    <StatusPill tone="neutral">Default</StatusPill>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {sender.name}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill
                  tone={
                    sender.status === "verified"
                      ? "success"
                      : sender.status === "failed"
                        ? "danger"
                        : "pending"
                  }
                >
                  {sender.status.charAt(0).toUpperCase() +
                    sender.status.slice(1)}
                </StatusPill>
                {!sender.isDefault && sender.status === "verified" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => defaultMutation.mutate(sender.id)}
                    disabled={defaultMutation.isPending}
                  >
                    Make default
                  </Button>
                ) : null}
                {sender.status !== "verified" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => recheckMutation.mutate(sender.id)}
                    disabled={recheckMutation.isPending}
                  >
                    Recheck
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMutation.mutate(sender.id)}
                  disabled={removeMutation.isPending}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <ListPager pagination={pager} label="senders" />
    </SettingsCard>
  );
}

export default SenderIdentitiesCard;
