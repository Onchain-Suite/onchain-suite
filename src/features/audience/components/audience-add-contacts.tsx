"use client";

import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { type AudienceProfile, audienceService } from "../audience.service";

const RESULTS_LIMIT = 25;

/** A readable label for a contact row: name, else email, else a short wallet. */
function profileLabel(p: AudienceProfile): string {
  if (p.name?.trim()) return p.name.trim();
  if (p.email?.trim()) return p.email.trim();
  const wallet = p.wallet ?? p.walletAddress ?? p.wallets?.[0]?.address;
  if (typeof wallet === "string" && wallet.length > 10) {
    return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  }
  return typeof wallet === "string" && wallet ? wallet : p.id;
}

/**
 * Add existing contacts to a (manual) list. A search box over the org's
 * contacts, multi-select, then one call to `POST /audience/segments/{id}/members`.
 * Inline panel (no modal), matching the Audience feature's convention.
 */
export function AudienceAddContacts({
  segmentId,
  onClose,
}: {
  segmentId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["audience", "add-contacts", debounced],
    queryFn: ({ signal }) =>
      audienceService.listProfiles(
        { q: debounced || undefined, limit: RESULTS_LIMIT },
        undefined,
        { signal }
      ),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const results = useMemo<AudienceProfile[]>(() => {
    const raw = searchQuery.data as
      | { items?: AudienceProfile[]; data?: AudienceProfile[] }
      | AudienceProfile[]
      | undefined;
    if (Array.isArray(raw)) return raw;
    return raw?.items ?? raw?.data ?? [];
  }, [searchQuery.data]);

  const selectedIds = Object.keys(selected);

  const addMutation = useMutation({
    mutationFn: (ids: string[]) =>
      audienceService.addSegmentMembers(segmentId, ids),
    onSuccess: async (_res, ids) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["audience", "segment-members", segmentId],
        }),
        queryClient.invalidateQueries({ queryKey: ["audience", "segments"] }),
      ]);
      toast.success(
        `Added ${ids.length} contact${ids.length === 1 ? "" : "s"} to the list.`
      );
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't add those contacts."
      ),
  });

  const toggle = (p: AudienceProfile) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = profileLabel(p);
      return next;
    });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Add contacts</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <XMarkIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search contacts by name, email or wallet…"
        className="mt-3"
        autoComplete="off"
      />

      {selectedIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary"
            >
              {selected[id]}
              <button
                type="button"
                aria-label={`Remove ${selected[id]}`}
                onClick={() =>
                  setSelected((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  })
                }
              >
                <XMarkIcon className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border/60">
        {searchQuery.isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {debounced ? "No contacts match that search." : "No contacts yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {results.map((p) => {
              const on = Boolean(selected[p.id]);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      )}
                    >
                      {on ? (
                        <CheckIcon className="size-3.5" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {profileLabel(p)}
                      </span>
                      {p.email && p.name ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.email}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={selectedIds.length === 0 || addMutation.isPending}
          onClick={() => addMutation.mutate(selectedIds)}
        >
          <PlusIcon className="mr-1.5 size-4" aria-hidden="true" />
          {addMutation.isPending
            ? "Adding…"
            : `Add ${selectedIds.length || ""} contact${selectedIds.length === 1 ? "" : "s"}`.trim()}
        </Button>
      </div>
    </div>
  );
}
