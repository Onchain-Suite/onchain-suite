"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import type { AudienceProfile } from "../audience.service";
import { audienceService } from "../audience.service";
import { MemberTable, toDetailMemberFromProfile } from "./member-table";

const MEMBERS_PER_PAGE = 25;

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
  // A tag selected from the table opens its in-page member detail.
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const openTag = (tag: string) => {
    setSelectedTag(tag);
    setDetailPage(1);
  };

  const tagMembersQuery = useQuery({
    queryKey: ["audience", "tag-members", selectedTag, detailPage],
    enabled: Boolean(selectedTag),
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    queryFn: () =>
      audienceService.listProfiles({
        tag: selectedTag as string,
        page: detailPage,
        limit: MEMBERS_PER_PAGE,
        include: "wallets,attributes,tags",
      }),
  });

  const tagDetail = useMemo(() => {
    const res = tagMembersQuery.data;
    const obj = (res && !Array.isArray(res) ? res : {}) as {
      items?: AudienceProfile[];
      data?: AudienceProfile[];
      meta?: { totalItems?: number; totalPages?: number };
    };
    const items = Array.isArray(res) ? res : (obj.items ?? obj.data ?? []);
    return {
      members: items.map(toDetailMemberFromProfile),
      total: obj.meta?.totalItems ?? items.length,
      totalPages: obj.meta?.totalPages ?? 1,
    };
  }, [tagMembersQuery.data]);
  const tagMembers = tagDetail.members;

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

  if (selectedTag) {
    const { total } = tagDetail;
    const totalPages = Math.max(1, tagDetail.totalPages);
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedTag(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to tags
        </button>
        <div>
          <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-semibold tracking-tight text-foreground">
            {selectedTag}
            <span className="text-sm font-normal text-muted-foreground">
              Tag · {total.toLocaleString()} contact{total === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every wallet with this tag. Addresses show only for imported
            contacts - ZK-linked emails stay protected, so you can message them
            without ever seeing who they are.
          </p>
        </div>
        {tagMembersQuery.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading contacts...
          </div>
        ) : tagMembersQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load contacts for this tag.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-lg"
              onClick={() => tagMembersQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : tagMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No contacts carry this tag yet.
          </div>
        ) : (
          <>
            <MemberTable members={tagMembers} />
            {totalPages > 1 ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(detailPage - 1) * MEMBERS_PER_PAGE + 1}–
                  {Math.min(detailPage * MEMBERS_PER_PAGE, total)} of{" "}
                  {total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={detailPage <= 1}
                    onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={detailPage >= totalPages}
                    onClick={() =>
                      setDetailPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

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
          No tags yet - create one, or select contacts and apply a tag to group
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
                    role="button"
                    tabIndex={0}
                    onClick={() => openTag(tag)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openTag(tag);
                    }}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
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
                          : "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                      -
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
