"use client";

import { BellIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn, isJsonObject } from "@/lib/utils";

import {
  NOTIFICATION_TONE_TILE,
  resolveNotificationMeta,
} from "@/features/notifications/notification-meta";
import { notificationsService } from "@/features/notifications/notifications.service";

/** Flattened, render-ready view of a backend notification row. */
interface NotificationView {
  id: string;
  eventType: string | undefined;
  title: string;
  description: string;
  time: Date;
  read: boolean;
  /** Rows sharing a key collapse into one grouped entry (imports, contacts). */
  groupKey: string;
}

interface NotificationGroup {
  key: string;
  items: NotificationView[];
}

const readGroupId = (data: unknown): string | undefined => {
  if (!isJsonObject(data)) return undefined;
  const candidate =
    data.groupKey ?? data.jobId ?? data.importId ?? data.importJobId;
  return candidate !== null && candidate !== undefined
    ? String(candidate)
    : undefined;
};

/** Bucket a newest-first list into groups, preserving first-seen order. */
const groupNotifications = (views: NotificationView[]): NotificationGroup[] => {
  const groups: NotificationGroup[] = [];
  const index = new Map<string, NotificationGroup>();
  for (const view of views) {
    const existing = index.get(view.groupKey);
    if (existing) {
      existing.items.push(view);
    } else {
      const group: NotificationGroup = { key: view.groupKey, items: [view] };
      index.set(view.groupKey, group);
      groups.push(group);
    }
  }
  return groups;
};

function NotificationTile({
  eventType,
  className,
}: {
  eventType: string | undefined;
  className?: string;
}) {
  const meta = resolveNotificationMeta(eventType);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        NOTIFICATION_TONE_TILE[meta.tone],
        className
      )}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const notificationsQueryKey = ["notifications", "list"] as const;

  const getCachedNotificationsArray = (
    current: unknown
  ): unknown[] | undefined => {
    if (Array.isArray(current)) return current;
    if (!isJsonObject(current)) return undefined;
    if (Array.isArray(current.items)) return current.items;
    if (Array.isArray(current.data)) return current.data;
    return undefined;
  };

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => notificationsService.list({ page: 1, limit: 50 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const views: NotificationView[] = useMemo(() => {
    if (!notificationsQuery.isSuccess) return [];
    return notificationsQuery.data.map((n) => {
      const eventType = n.type ? String(n.type) : undefined;
      const meta = resolveNotificationMeta(eventType);
      const explicitGroupId = readGroupId(n.data);
      const groupKey = explicitGroupId
        ? `g:${explicitGroupId}`
        : meta.group && eventType
          ? `t:${eventType}`
          : `i:${n.id}`;
      return {
        id: n.id,
        eventType,
        title: String(n.title ?? "Notification"),
        description: String(n.message ?? ""),
        time: n.createdAt ? new Date(String(n.createdAt)) : new Date(),
        read: Boolean(n.read ?? false),
        groupKey,
      };
    });
  }, [notificationsQuery.isSuccess, notificationsQuery.data]);

  const groups = useMemo(() => groupNotifications(views), [views]);
  const unreadCount = useMemo(
    () => views.filter((view) => !view.read).length,
    [views]
  );

  const patchCache = (mutate: (view: Record<string, unknown>) => boolean) => {
    queryClient.setQueryData<unknown>(
      notificationsQueryKey,
      (current: unknown) => {
        const arr = getCachedNotificationsArray(current);
        if (!arr) return current;
        return arr.map((n) => {
          if (!isJsonObject(n)) return n;
          return mutate(n) ? { ...n, read: true } : n;
        });
      }
    );
  };

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => notificationsService.markRead(id))),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<unknown>(notificationsQueryKey);
      const idSet = new Set(ids);
      patchCache((n) => idSet.has(String(n.id ?? "")));
      return { prev };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(notificationsQueryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<unknown>(notificationsQueryKey);
      patchCache(() => true);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(notificationsQueryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const markRead = (ids: string[]) => {
    const unread = ids.filter((id) =>
      views.some((view) => view.id === id && !view.read)
    );
    if (unread.length > 0 && notificationsQuery.isSuccess) {
      markReadMutation.mutate(unread);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-10">
          <BellIcon className="size-6" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-88 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-base font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {groups.length > 0 ? (
            <ul className="divide-y divide-border">
              {groups.map((group) => {
                const [rep] = group.items;
                if (!rep) return null;
                const count = group.items.length;
                const groupUnread = group.items.filter(
                  (item) => !item.read
                ).length;

                if (count === 1) {
                  return (
                    <li key={group.key}>
                      <button
                        type="button"
                        onClick={() => markRead([rep.id])}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                          !rep.read && "bg-primary/[0.04]"
                        )}
                      >
                        <NotificationTile
                          eventType={rep.eventType}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm leading-snug text-foreground">
                            {rep.title}
                          </span>
                          {rep.description ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {rep.description}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatDistanceToNow(rep.time, { addSuffix: true })}
                          </span>
                        </span>
                        {!rep.read ? (
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                }

                const meta = resolveNotificationMeta(rep.eventType);
                const noun = meta.group?.many ?? "updates";
                const isExpanded = expandedKeys.has(group.key);
                return (
                  <li key={group.key}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.key)}
                      aria-expanded={isExpanded}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                        groupUnread > 0 && "bg-primary/[0.04]"
                      )}
                    >
                      <NotificationTile
                        eventType={rep.eventType}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-snug text-foreground">
                            {count.toLocaleString()} {noun}
                          </span>
                          {groupUnread > 0 ? (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {groupUnread} new
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {rep.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDistanceToNow(rep.time, { addSuffix: true })}
                        </span>
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded ? (
                      <ul className="border-t border-border/60 bg-muted/30">
                        {group.items.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => markRead([item.id])}
                              className={cn(
                                "flex w-full items-start gap-3 py-2.5 pr-4 pl-14 text-left transition-colors hover:bg-muted/60",
                                !item.read && "bg-primary/[0.04]"
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm leading-snug text-foreground">
                                  {item.title}
                                </span>
                                {item.description ? (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {item.description}
                                  </span>
                                ) : null}
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {formatDistanceToNow(item.time, {
                                    addSuffix: true,
                                  })}
                                </span>
                              </span>
                              {!item.read ? (
                                <span
                                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <BellIcon
                className="size-9 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re all caught up!
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
