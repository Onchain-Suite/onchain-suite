"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import { audienceService } from "../audience.service";

/** Pull a total-count out of a listProfiles response's meta, if present. */
function totalFromMeta(res: unknown): number | null {
  if (!res || typeof res !== "object" || Array.isArray(res)) return null;
  const { meta } = res as { meta?: unknown };
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const raw = m.totalItems ?? m.total ?? m.count;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tags tab: a table of tags with real per-tag contact counts (each resolved via
 * `listProfiles({ tag }).meta`), plus an inline "New tag" create. Tags in this
 * app are applied manually (via the contacts tag popover), so the rule reads
 * "Manual"; per-tag "updated" isn't exposed by the API yet.
 */
export function AudienceTagsTab({
  tags,
  creating,
  onCancelCreate,
}: {
  tags: string[];
  creating: boolean;
  onCancelCreate: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const countsQuery = useQuery({
    queryKey: ["audience", "tag-counts", tags],
    enabled: tags.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const capped = tags.slice(0, 60);
      const entries = await Promise.all(
        capped.map(async (tag) => {
          try {
            const res = await audienceService.listProfiles({ tag, limit: 1 });
            return [tag, totalFromMeta(res)] as const;
          } catch {
            return [tag, null] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, number | null>;
    },
  });
  const counts = countsQuery.data ?? {};

  const createMutation = useMutation({
    mutationFn: (n: string) => audienceService.createTag({ name: n.trim() }),
    onSuccess: () => {
      setName("");
      onCancelCreate();
      toast.success("Tag created");
      queryClient
        .invalidateQueries({ queryKey: ["audience", "tags"] })
        .catch(() => undefined);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create tag"),
  });

  return (
    <div className="space-y-4">
      {creating ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">New tag</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="new-tag-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="new-tag-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. whale"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={createMutation.isPending}
                onClick={() => {
                  setName("");
                  onCancelCreate();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={createMutation.isPending}
                onClick={() => {
                  const n = name.trim();
                  if (!n) {
                    toast.error("Name your tag.");
                    return;
                  }
                  createMutation.mutate(n);
                }}
              >
                {createMutation.isPending ? "Creating…" : "Create tag"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tags.length === 0 && !creating ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No tags yet — create one, or select contacts and apply a tag to group
          them.
        </div>
      ) : tags.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 text-right font-medium">Contacts</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const count = counts[tag];
                return (
                  <tr
                    key={tag}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-4 font-medium text-foreground">
                      {tag}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        Manual
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {countsQuery.isLoading
                        ? "…"
                        : typeof count === "number"
                          ? count.toLocaleString()
                          : "—"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                      —
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
