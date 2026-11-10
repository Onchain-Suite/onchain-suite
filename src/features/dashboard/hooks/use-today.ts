"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { type TodayInput, todayItems } from "../utils/today";
import { useSetupSteps } from "./use-setup-steps";
import { analyticsService } from "@/features/analytics/analytics.service";
import { automationService } from "@/features/automation/automation.service";
import { pickLoops, toLoopRow } from "@/features/automation/utils/loop-rows";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { inboxService } from "@/features/inbox/inbox.service";
import { notificationsService } from "@/features/notifications/notifications.service";

/** Loops shown in "Running on its own", and paused Loops turned into to-dos. */
const LOOP_LIMIT = 5;

/**
 * Everything Home's "today" view reads, in parallel. Each query shares its key
 * with the screen that owns the data (Inbox, Campaigns, the bell, Analytics),
 * so Home adds no request those screens would not make, and a change there
 * shows up here. Every read fails quietly: its item or panel is just absent.
 */
export function useToday() {
  const common = { retry: false, refetchOnWindowFocus: false } as const;

  const unreadCount = useQuery({
    ...common,
    queryKey: ["inbox", "unread-count"],
    queryFn: () => inboxService.getUnreadCount(),
    staleTime: 60_000,
  });
  const hasUnread = (unreadCount.data?.unreadCount ?? 0) > 0;
  const latestUnread = useQuery({
    ...common,
    queryKey: ["home", "latest-unread"],
    queryFn: () =>
      inboxService.listThreads({ folder: "INBOX", unread: true, limit: 1 }),
    enabled: hasUnread,
    staleTime: 60_000,
  });

  const paused = useQuery({
    ...common,
    // Under "automations", so every Loop mutation (which invalidates that
    // prefix) refreshes Home too: a resumed Loop leaves the list at once.
    queryKey: ["automations", "home", "paused"],
    queryFn: () =>
      automationService.listAutomations({
        status: "paused",
        limit: LOOP_LIMIT,
      }),
    staleTime: 60_000,
  });
  const live = useQuery({
    ...common,
    queryKey: ["automations", "home", "active"],
    queryFn: () =>
      automationService.listAutomations({
        status: "active",
        limit: LOOP_LIMIT,
      }),
    staleTime: 60_000,
  });

  const campaigns = useQuery({
    ...common,
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
  });

  const notifications = useQuery({
    ...common,
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsService.list({ page: 1, limit: 50 }),
  });

  const overview = useQuery({
    ...common,
    queryKey: ["dashboard", "overview"],
    queryFn: () => analyticsService.getDashboardOverview(),
    staleTime: 60_000,
  });

  const { steps, isLoading: stepsLoading } = useSetupSteps();
  const domainStep = steps.find((s) => s.id === "domain");

  const liveLoops = useMemo(
    () =>
      pickLoops(live.data)
        .map(toLoopRow)
        .filter((r) => r !== null),
    [live.data]
  );

  const items = useMemo(() => {
    const latest = latestUnread.data?.items?.[0];
    const input: TodayInput = {
      unread: {
        count: unreadCount.data?.unreadCount ?? 0,
        latest: latest
          ? {
              id: latest.id,
              from:
                typeof latest.from === "string"
                  ? latest.from
                  : typeof latest.fromEmail === "string"
                    ? latest.fromEmail
                    : undefined,
              snippet:
                typeof latest.snippet === "string" ? latest.snippet : undefined,
            }
          : undefined,
      },
      pausedLoops: pickLoops(paused.data)
        .map(toLoopRow)
        .filter((r) => r !== null)
        .map((r) => ({
          id: r.id,
          name: r.name,
          entries: r.entries + r.optInEmailsSent,
        })),
      campaigns: (campaigns.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        recipients: c.recipients,
        scheduledFor: c.scheduledFor,
      })),
      domainVerified: stepsLoading || !domainStep ? undefined : domainStep.done,
    };
    return todayItems(input);
  }, [
    unreadCount.data,
    latestUnread.data,
    paused.data,
    campaigns.data,
    stepsLoading,
    domainStep,
  ]);

  return {
    items,
    // The list waits for the reads that decide what is on it, so it never
    // jumps from "All clear" to a full list.
    isLoading: unreadCount.isLoading || paused.isLoading || campaigns.isLoading,
    liveLoops,
    liveLoading: live.isLoading,
    lately: (notifications.data ?? []).slice(0, 4),
    latelyLoading: notifications.isLoading,
    overview: overview.data,
  };
}
