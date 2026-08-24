"use client";

import {
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";

import type { AudienceProfile, AudienceTag } from "../audience.service";
import { audienceService, TagBacksListsError } from "../audience.service";
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

// A tag object may carry its contact count and last-updated timestamp under a
// few different field names depending on the backend build; read defensively.
const TAG_COUNT_FIELDS = [
  "contactCount",
  "contactsCount",
  "memberCount",
  "membersCount",
  "profileCount",
  "profilesCount",
  "count",
  "size",
];
const TAG_UPDATED_FIELDS = [
  "updatedAt",
  "updated_at",
  "lastUpdated",
  "lastUsedAt",
  "modifiedAt",
  "createdAt",
  "created_at",
];

function readNumberField(
  obj: Record<string, unknown>,
  fields: string[]
): number | null {
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (
      typeof v === "string" &&
      v.trim() !== "" &&
      Number.isFinite(Number(v))
    ) {
      return Number(v);
    }
  }
  return null;
}
function readStringField(
  obj: Record<string, unknown>,
  fields: string[]
): string | undefined {
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/** Human-readable "updated" label: relative when recent, a date when older. */
function formatUpdated(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const MIN = 60_000;
  const HR = 3_600_000;
  const DAY = 86_400_000;
  const asDate = () =>
    d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (diff < MIN && diff >= 0) return "just now";
  if (diff < HR && diff >= 0) {
    const m = Math.floor(diff / MIN);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY && diff >= 0) {
    const h = Math.floor(diff / HR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diff < 7 * DAY && diff >= 0) {
    const dd = Math.floor(diff / DAY);
    return `${dd} day${dd === 1 ? "" : "s"} ago`;
  }
  return asDate();
}

/**
 * Tags tab: a table of tags with per-tag contact counts and last-updated time.
 * Counts and timestamps come from the tag objects when the API supplies them,
 * and the count falls back to `listProfiles({ tag }).meta`. Tags in this app are
 * applied manually (via the contacts tag popover), so the rule reads "Manual".
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

  // Rename/delete target a tag by its stable id (renaming by name would break
  // the list criteria that point at the id), so resolve name → id from the tag
  // objects the API returns.
  const tagObjectsQuery = useQuery({
    queryKey: ["audience", "tag-objects"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await audienceService.listTags();
      const items: AudienceTag[] = Array.isArray(res)
        ? res
        : (res.items ?? res.data ?? []);
      return items;
    },
  });
  const tagIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tagObjectsQuery.data ?? []) {
      if (typeof t.id === "string" && t.id && typeof t.name === "string") {
        map.set(t.name, t.id);
      }
    }
    return map;
  }, [tagObjectsQuery.data]);

  // Contact count + last-updated time carried on each tag object (when present).
  const tagMetaByName = useMemo(() => {
    const map = new Map<string, { count: number | null; updatedAt?: string }>();
    for (const t of tagObjectsQuery.data ?? []) {
      if (typeof t.name !== "string") continue;
      const obj = t as Record<string, unknown>;
      map.set(t.name, {
        count: readNumberField(obj, TAG_COUNT_FIELDS),
        updatedAt: readStringField(obj, TAG_UPDATED_FIELDS),
      });
    }
    return map;
  }, [tagObjectsQuery.data]);

  // Rename dialog + delete confirmations (two-step: plain confirm, then a
  // second "delete anyway" when the tag backs lists).
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [backedLists, setBackedLists] = useState<
    { id: string; name: string }[] | null
  >(null);

  const invalidateTags = () => {
    queryClient
      .invalidateQueries({ queryKey: ["audience", "tags"] })
      .catch(() => undefined);
    queryClient
      .invalidateQueries({ queryKey: ["audience", "tag-objects"] })
      .catch(() => undefined);
    queryClient
      .invalidateQueries({ queryKey: ["audience", "tag-counts"] })
      .catch(() => undefined);
  };

  const renameMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      audienceService.renameTag(input.id, input.name),
    onSuccess: () => {
      setRenameTarget(null);
      setRenameValue("");
      toast.success("Tag renamed");
      invalidateTags();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (/TAG_NAME_TAKEN|already exists/i.test(msg)) {
        toast.error("A tag with that name already exists.");
        return;
      }
      toast.error(msg || "Couldn't rename tag");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string; force?: boolean }) =>
      audienceService.deleteTag(
        input.id,
        input.force ? { force: true } : undefined
      ),
    onSuccess: () => {
      setDeleteTarget(null);
      setBackedLists(null);
      toast.success("Tag deleted");
      invalidateTags();
      queryClient
        .invalidateQueries({ queryKey: ["audience", "segments"] })
        .catch(() => undefined);
    },
    onError: (e) => {
      // The tag defines one or more lists: surface them and offer a forced
      // delete rather than silently failing or auto-retrying.
      if (e instanceof TagBacksListsError) {
        setBackedLists(e.lists);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Couldn't delete tag");
    },
  });

  const startRename = (tag: string) => {
    const id = tagIdByName.get(tag);
    if (!id) {
      toast.error("We couldn't resolve that tag. Refresh and try again.");
      return;
    }
    setRenameTarget({ id, name: tag });
    setRenameValue(tag);
  };
  const startDelete = (tag: string) => {
    const id = tagIdByName.get(tag);
    if (!id) {
      toast.error("We couldn't resolve that tag. Refresh and try again.");
      return;
    }
    setBackedLists(null);
    setDeleteTarget({ id, name: tag });
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
                <th className="w-8 py-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const meta = tagMetaByName.get(tag);
                const objCount = meta?.count;
                const count =
                  typeof objCount === "number" ? objCount : counts[tag];
                const updated = formatUpdated(meta?.updatedAt);
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
                      {typeof count === "number"
                        ? count.toLocaleString()
                        : countsQuery.isLoading || tagObjectsQuery.isLoading
                          ? "…"
                          : "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                      {updated ? (
                        <span title={meta?.updatedAt}>{updated}</span>
                      ) : tagObjectsQuery.isLoading ? (
                        "…"
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-4 pr-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Actions for ${tag}`}
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                          >
                            <EllipsisHorizontalIcon
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              startRename(tag);
                            }}
                          >
                            <PencilSquareIcon
                              className="size-4"
                              aria-hidden="true"
                            />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => {
                              e.preventDefault();
                              startDelete(tag);
                            }}
                          >
                            <TrashIcon className="size-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Rename a tag (in place - the id is stable). */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open && !renameMutation.isPending) {
            setRenameTarget(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename tag</DialogTitle>
            <DialogDescription>
              This renames the tag everywhere it&apos;s used - lists built on it
              keep working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="rename-tag-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="rename-tag-name"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameTarget) {
                  const next = renameValue.trim();
                  if (next && next !== renameTarget.name) {
                    renameMutation.mutate({ id: renameTarget.id, name: next });
                  }
                }
              }}
              className="h-10 rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={renameMutation.isPending}
              onClick={() => {
                setRenameTarget(null);
                setRenameValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                renameMutation.isPending ||
                renameValue.trim().length === 0 ||
                renameValue.trim() === renameTarget?.name
              }
              onClick={() => {
                if (!renameTarget) return;
                const next = renameValue.trim();
                if (!next) return;
                renameMutation.mutate({ id: renameTarget.id, name: next });
              }}
            >
              {renameMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete a tag - two-step: a plain confirm, then a second "delete
          anyway" that names the lists the tag backs. */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
            setBackedLists(null);
          }
        }}
      >
        <AlertDialogContent>
          {backedLists && backedLists.length > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  This tag defines who is in{" "}
                  {backedLists.length === 1 ? "a list" : "some lists"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  “{deleteTarget?.name}” defines who is in:{" "}
                  {backedLists.map((l) => l.name).join(", ")}. Deleting it
                  empties{" "}
                  {backedLists.length === 1 ? "that list" : "those lists"}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Keep the tag
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (deleteTarget) {
                      deleteMutation.mutate({
                        id: deleteTarget.id,
                        force: true,
                      });
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete anyway"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete “{deleteTarget?.name}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the tag from every contact that carries it. The
                  contacts themselves stay in your audience.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (deleteTarget) {
                      deleteMutation.mutate({ id: deleteTarget.id });
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete tag"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
