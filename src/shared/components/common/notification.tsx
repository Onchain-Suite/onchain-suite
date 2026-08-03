"use client";

import {
  BellIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  CubeIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn, isJsonObject } from "@/lib/utils";

import type { Notification, NotificationType } from "@/types/notification";

import { notificationsService } from "@/features/notifications/notifications.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

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

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<unknown>(notificationsQueryKey);
      queryClient.setQueryData<unknown>(
        notificationsQueryKey,
        (current: unknown) => {
          const arr = getCachedNotificationsArray(current);
          if (!arr) return current;
          return arr.map((n) => (isJsonObject(n) ? { ...n, read: true } : n));
        }
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
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

  const markAllAsRead = () => {
    if (notificationsQuery.isSuccess) {
      markAllReadMutation.mutate();
    }
  };

  const removeNotification = (id: string) => {
    if (!notificationsQuery.isSuccess) return;
    queryClient.setQueryData<unknown>(
      notificationsQueryKey,
      (current: unknown) => {
        const arr = getCachedNotificationsArray(current);
        if (!arr) return current;
        return arr.filter((n) => {
          if (!isJsonObject(n)) return true;
          return String(n.id ?? "") !== id;
        });
      }
    );
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "info":
        return (
          <InformationCircleIcon
            className="h-4 w-4 text-blue-500"
            aria-hidden="true"
          />
        );
      case "success":
        return (
          <CheckIcon className="h-4 w-4 text-green-500" aria-hidden="true" />
        );
      case "warning":
        return (
          <InformationCircleIcon
            className="h-4 w-4 text-amber-500"
            aria-hidden="true"
          />
        );
      case "message":
        return (
          <ChatBubbleLeftIcon
            className="h-4 w-4 text-indigo-500"
            aria-hidden="true"
          />
        );
      default:
        return (
          <InformationCircleIcon
            className="h-4 w-4 text-blue-500"
            aria-hidden="true"
          />
        );
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto p-0 text-xs font-normal"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length > 0 ? (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-0"
                >
                  <div
                    className={cn(
                      "flex w-full cursor-default gap-2 p-2",
                      !notification.read && "bg-muted/50"
                    )}
                  >
                    <div className="bg-muted mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckIcon
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span className="sr-only">Mark as read</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {notification.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDistanceToNow(notification.time, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CubeIcon
                className="text-muted-foreground/50 h-10 w-10"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium">No notifications</p>
              <p className="text-muted-foreground text-xs">
                You&apos;re all caught up!
              </p>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="cursor-pointer justify-center text-center text-sm font-medium"
        >
          <a href={PRIVATE_ROUTES.NOTIFICATIONS}>View all notifications</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
