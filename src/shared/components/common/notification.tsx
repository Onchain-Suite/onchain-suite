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
import { useEffect, useState } from "react";

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

import { authClient } from "@/lib/auth-client";
import { cn, isJsonObject } from "@/lib/utils";

import type { Notification, NotificationType } from "@/types/notification";

import { audienceService } from "@/features/audience/audience.service";
import {
  loadTrackedImportJobs,
  removeTrackedImportJob,
  updateImportHistoryEntry,
  updateTrackedImportJob,
} from "@/features/audience/imports/import-job-storage";
import {
  loadLocalNotifications,
  markAllLocalNotificationsRead,
  markLocalNotificationRead,
  removeLocalNotification,
  upsertLocalNotification,
} from "@/features/notifications/local-notifications";
import { notificationsService } from "@/features/notifications/notifications.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { buildEmailPayload, emailService } from "@/shared/emails/email.service";

const notificationsQueryKey = ["notifications", "list"] as const;
const localNotificationsQueryKey = ["notifications", "local"] as const;
const importsMonitorQueryKey = ["audience", "imports", "monitor"] as const;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRateLimitedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as { cause?: unknown; message?: unknown };
  const candidate = (err.cause ?? err) as {
    response?: { status?: unknown };
    status?: unknown;
    message?: unknown;
  };
  const status =
    typeof candidate.response?.status === "number"
      ? candidate.response.status
      : typeof candidate.status === "number"
        ? candidate.status
        : null;
  if (status === 429) return true;
  const msg =
    typeof err.message === "string"
      ? err.message
      : typeof candidate.message === "string"
        ? candidate.message
        : "";
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
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

  const localNotificationsQuery = useQuery({
    queryKey: localNotificationsQueryKey,
    queryFn: () => loadLocalNotifications(),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: localNotificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: importsMonitorQueryKey });
    };
    window.addEventListener("onchain.importJobs", handler);
    window.addEventListener("onchain.localNotifications", handler);
    return () => {
      window.removeEventListener("onchain.importJobs", handler);
      window.removeEventListener("onchain.localNotifications", handler);
    };
  }, [queryClient]);

  const { data: session } = authClient.useSession();
  const sessionEmailRaw =
    isJsonObject(session?.user) && typeof session.user.email === "string"
      ? String(session.user.email)
      : "";
  const sessionEmail =
    sessionEmailRaw.trim().length > 0 ? sessionEmailRaw.trim() : null;

  const importsMonitorQuery = useQuery({
    queryKey: importsMonitorQueryKey,
    queryFn: async () => {
      const jobs = loadTrackedImportJobs();
      const updates: Array<{ jobId: string; payload: unknown }> = [];
      for (const job of jobs) {
        try {
          const payload = await audienceService.getImportJob(job.jobId);
          updateTrackedImportJob(job.jobId, {
            lastRateLimitedAt: undefined,
            lastErrorMessage: undefined,
          });
          updates.push({ jobId: job.jobId, payload });
        } catch (error) {
          if (isRateLimitedError(error)) {
            updateTrackedImportJob(job.jobId, {
              lastRateLimitedAt: new Date().toISOString(),
              lastErrorMessage:
                error instanceof Error ? error.message : "Rate limited",
            });
            await wait(2000 + Math.floor(Math.random() * 3000));
          } else {
            updateTrackedImportJob(job.jobId, {
              lastErrorMessage:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch status",
            });
          }
          updates.push({ jobId: job.jobId, payload: null });
        }
      }
      return updates;
    },
    enabled: typeof window !== "undefined",
    retry: false,
    refetchInterval: () => {
      const jobs = loadTrackedImportJobs();
      if (jobs.length === 0) return false;
      const now = Date.now();
      const sawRateLimit = jobs.some((job) => {
        const raw =
          typeof job.lastRateLimitedAt === "string"
            ? job.lastRateLimitedAt
            : "";
        const ts = raw ? new Date(raw).getTime() : Number.NaN;
        return Number.isFinite(ts) && now - ts < 60_000;
      });
      const base = 4000 + jobs.length * 1000;
      return (
        base + (sawRateLimit ? 6000 : 0) + Math.floor(Math.random() * 2000)
      );
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const { data: importsMonitorData } = importsMonitorQuery;

  useEffect(() => {
    if (!Array.isArray(importsMonitorData) || importsMonitorData.length === 0)
      return;

    const run = async () => {
      const trackedJobs = loadTrackedImportJobs();
      for (const entry of importsMonitorData) {
        const { payload, jobId: rawJobId } = entry;
        const jobId = String(rawJobId ?? "");
        if (!jobId) continue;

        const obj = isJsonObject(payload)
          ? (payload as Record<string, unknown>)
          : {};
        const state = String(obj.state ?? "");
        const processedRows =
          typeof obj.processedRows === "number" ? obj.processedRows : undefined;
        const totalRows =
          typeof obj.totalRows === "number" ? obj.totalRows : undefined;
        const createdCount =
          typeof obj.createdCount === "number" ? obj.createdCount : undefined;
        const updatedCount =
          typeof obj.updatedCount === "number" ? obj.updatedCount : undefined;
        const errorCount =
          typeof obj.errorCount === "number" ? obj.errorCount : undefined;

        const jobPatch: Parameters<typeof updateTrackedImportJob>[1] = {
          ...(state ? { state } : {}),
          ...(typeof processedRows === "number" ? { processedRows } : {}),
          ...(typeof totalRows === "number" ? { totalRows } : {}),
          ...(typeof createdCount === "number" ? { createdCount } : {}),
          ...(typeof updatedCount === "number" ? { updatedCount } : {}),
          ...(typeof errorCount === "number" ? { errorCount } : {}),
        };
        if (Object.keys(jobPatch).length > 0) {
          updateTrackedImportJob(jobId, jobPatch);
          updateImportHistoryEntry(jobId, {
            ...(state ? { status: state } : {}),
            ...(typeof processedRows === "number" ? { processedRows } : {}),
            ...(typeof totalRows === "number" ? { totalRows } : {}),
            ...(typeof createdCount === "number" ? { createdCount } : {}),
            ...(typeof updatedCount === "number" ? { updatedCount } : {}),
            ...(typeof errorCount === "number" ? { errorCount } : {}),
          });
        }

        const tracked = trackedJobs.find((x) => String(x.jobId) === jobId);
        const isTerminal =
          state === "completed" || state === "failed" || state === "cancelled";
        if (!tracked || !isTerminal) continue;

        const alreadyNotified =
          typeof tracked.notifiedAt === "string" &&
          tracked.notifiedAt.length > 0;
        if (!alreadyNotified) {
          const isOk = state === "completed" && (errorCount ?? 0) === 0;
          const type: NotificationType = isOk
            ? "success"
            : state === "completed"
              ? "warning"
              : "warning";
          const title =
            state === "completed"
              ? "Audience import finished"
              : "Audience import failed";
          const parts: string[] = [];
          if (typeof processedRows === "number") {
            if (typeof totalRows === "number" && totalRows > 0) {
              parts.push(
                `${processedRows.toLocaleString()} / ${totalRows.toLocaleString()} processed`
              );
            } else {
              parts.push(`${processedRows.toLocaleString()} processed`);
            }
          }
          if (typeof createdCount === "number") {
            parts.push(`${createdCount.toLocaleString()} created`);
          }
          if (typeof updatedCount === "number") {
            parts.push(`${updatedCount.toLocaleString()} updated`);
          }
          if (typeof errorCount === "number" && errorCount > 0) {
            parts.push(`${errorCount.toLocaleString()} errors`);
          }

          upsertLocalNotification({
            id: `local:audience-import:${jobId}`,
            title,
            description: parts.join(" · "),
            time: new Date(),
            read: false,
            type,
          });
          queryClient.setQueryData(
            localNotificationsQueryKey,
            loadLocalNotifications()
          );
          queryClient.invalidateQueries({ queryKey: ["audience", "tags"] });
          queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] });
          updateTrackedImportJob(jobId, {
            notifiedAt: new Date().toISOString(),
          });
        }

        const alreadyEmailed =
          typeof tracked.emailSentAt === "string" &&
          tracked.emailSentAt.length > 0;
        if (!alreadyEmailed && state === "completed") {
          const summaryLines = [
            "Audience import finished.",
            tracked.fileName ? `File: ${tracked.fileName}` : null,
            typeof processedRows === "number"
              ? typeof totalRows === "number" && totalRows > 0
                ? `Processed: ${processedRows.toLocaleString()} / ${totalRows.toLocaleString()}`
                : `Processed: ${processedRows.toLocaleString()}`
              : null,
            typeof createdCount === "number"
              ? `Created: ${createdCount.toLocaleString()}`
              : null,
            typeof updatedCount === "number"
              ? `Updated: ${updatedCount.toLocaleString()}`
              : null,
            typeof errorCount === "number"
              ? `Errors: ${errorCount.toLocaleString()}`
              : null,
            `Job ID: ${jobId}`,
          ].filter((x): x is string => typeof x === "string" && x.length > 0);

          const { html, text } = buildEmailPayload(summaryLines.join("\n"));
          const notifyEmails = Array.isArray(tracked.notifyEmails)
            ? tracked.notifyEmails
            : [];
          const toList = Array.from(
            new Set(
              ["onchainsuite2gmail.com", sessionEmail, ...notifyEmails]
                .filter(
                  (x): x is string =>
                    typeof x === "string" && x.trim().length > 0
                )
                .map((x) => x.trim().toLowerCase())
            )
          );

          for (const to of toList) {
            try {
              await emailService.send({
                to,
                subject: "Onchain Suite: Audience import finished",
                html,
                text,
                tags: ["audience-import"],
              });
            } catch {
              upsertLocalNotification({
                id: `local:audience-import-email:${jobId}:${to}`,
                title: "Import finished (email failed)",
                description: `Failed to send import summary to ${to}`,
                time: new Date(),
                read: false,
                type: "warning",
              });
              queryClient.setQueryData(
                localNotificationsQueryKey,
                loadLocalNotifications()
              );
            }
          }

          updateTrackedImportJob(jobId, {
            emailSentAt: new Date().toISOString(),
          });
        }

        removeTrackedImportJob(jobId);
      }
    };

    run().catch(() => undefined);
  }, [importsMonitorData, queryClient, sessionEmail]);

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

  const localNotifications = localNotificationsQuery.data ?? [];
  const mergedNotifications = [...localNotifications, ...notifications].sort(
    (a, b) => b.time.getTime() - a.time.getTime()
  );

  const unreadCount = mergedNotifications.filter(
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
    if (id.startsWith("local:")) {
      markLocalNotificationRead(id);
      queryClient.setQueryData(
        localNotificationsQueryKey,
        loadLocalNotifications()
      );
      return;
    }
    if (notificationsQuery.isSuccess) {
      markReadMutation.mutate(id);
    }
  };

  const markAllAsRead = () => {
    markAllLocalNotificationsRead();
    queryClient.setQueryData(
      localNotificationsQueryKey,
      loadLocalNotifications()
    );
    if (notificationsQuery.isSuccess) {
      markAllReadMutation.mutate();
    }
  };

  const removeNotification = (id: string) => {
    if (id.startsWith("local:")) {
      removeLocalNotification(id);
      queryClient.setQueryData(
        localNotificationsQueryKey,
        loadLocalNotifications()
      );
      return;
    }
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
          {mergedNotifications.length > 0 ? (
            <DropdownMenuGroup>
              {mergedNotifications.map((notification) => (
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
