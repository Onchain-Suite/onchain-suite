"use client";

import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn, isJsonObject } from "@/lib/utils";

import type { Notification, NotificationType } from "@/types/notification";

import { notificationsService } from "@/features/notifications/notifications.service";

/** Uniform indigo icon-tiles, one glyph per notification type (see reference). */
const NOTIFICATION_ICON: Record<
  NotificationType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  info: SparklesIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  message: ChatBubbleLeftRightIcon,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
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

  const notifications: Notification[] = notificationsQuery.isSuccess
    ? notificationsQuery.data.map((n) => {
        const type = (String(n.type ?? "info") as NotificationType) ?? "info";
        return {
          id: n.id,
          title: String(n.title ?? "Notification"),
          description: String(n.message ?? ""),
          time: n.createdAt ? new Date(String(n.createdAt)) : new Date(),
          read: Boolean(n.read ?? false),
          type:
            type === "info" ||
            type === "success" ||
            type === "warning" ||
            type === "message"
              ? type
              : "info",
        };
      })
    : [];

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<unknown>(notificationsQueryKey);
      queryClient.setQueryData<unknown>(
        notificationsQueryKey,
        (current: unknown) => {
          const arr = getCachedNotificationsArray(current);
          if (!arr) return current;
          return arr.map((n) => {
            if (!isJsonObject(n)) return n;
            return String(n.id ?? "") === id ? { ...n, read: true } : n;
          });
        }
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(notificationsQueryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const markAsRead = (id: string) => {
    if (notificationsQuery.isSuccess) {
      markReadMutation.mutate(id);
    }
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
        <div className="border-b border-border px-4 py-3">
          <p className="text-base font-semibold">Notifications</p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon =
                  NOTIFICATION_ICON[notification.type] ?? SparklesIcon;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                        !notification.read && "bg-primary/[0.04]"
                      )}
                    >
                      <span
                        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                        aria-hidden="true"
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug text-foreground">
                          {notification.title}
                        </span>
                        {notification.description ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {notification.description}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.time, {
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                      {!notification.read ? (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
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
