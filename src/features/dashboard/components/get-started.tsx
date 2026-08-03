"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import { useOnboardingTracking } from "../../onboarding-flow/hooks";
import { audienceService } from "@/features/audience/audience.service";
import { automationService } from "@/features/automation/automation.service";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { intelligenceService } from "@/features/intelligence/intelligence.service";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import {
  type DomainAuthMap,
  type SenderDomainRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const ACCOUNT_SETTINGS_HREF = `${PRIVATE_ROUTES.SETTINGS}?tab=account`;

/** Static task definitions — completion is resolved from live org data. */
interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  cta: string;
}

const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: "contract-address",
    title: "Add your contract address",
    description:
      "Register your project's contract addresses so we can track your onchain activity.",
    icon: <DocumentTextIcon aria-hidden="true" className="h-6 w-6" />,
    href: ACCOUNT_SETTINGS_HREF,
    cta: "Add contract",
  },
  {
    id: "verify-domain",
    title: "Verify your sending domain",
    description:
      "Add DNS records for your domain so campaigns are delivered from your brand.",
    icon: <GlobeAltIcon aria-hidden="true" className="h-6 w-6" />,
    href: ACCOUNT_SETTINGS_HREF,
    cta: "Verify domain",
  },
  {
    id: "sender-identity",
    title: "Add a sender identity",
    description:
      "Create a verified From address on your domain for outgoing email.",
    icon: <EnvelopeIcon aria-hidden="true" className="h-6 w-6" />,
    href: ACCOUNT_SETTINGS_HREF,
    cta: "Add sender",
  },
  {
    id: "import-audience",
    title: "Import your audience",
    description:
      "Bring in your existing contacts and wallets to get started faster.",
    icon: <UserGroupIcon aria-hidden="true" className="h-6 w-6" />,
    href: PRIVATE_ROUTES.AUDIENCE,
    cta: "Open audience",
  },
  {
    id: "create-campaign",
    title: "Create your first campaign",
    description:
      "Draft a campaign to reach your audience across email and in-app push.",
    icon: <MegaphoneIcon aria-hidden="true" className="h-6 w-6" />,
    href: PRIVATE_ROUTES.NEW_CAMPAIGN,
    cta: "Create campaign",
  },
  {
    id: "send-campaign",
    title: "Send your first campaign",
    description:
      "Ship a campaign to your audience and watch the engagement roll in.",
    icon: <PaperAirplaneIcon aria-hidden="true" className="h-6 w-6" />,
    href: PRIVATE_ROUTES.CAMPAIGNS,
    cta: "Open campaigns",
  },
  {
    id: "create-automation",
    title: "Create your first automation",
    description:
      "React to onchain events automatically — emails, pushes, and posts on triggers.",
    icon: <BoltIcon aria-hidden="true" className="h-6 w-6" />,
    href: PRIVATE_ROUTES.NEW_AUTOMATION,
    cta: "Build automation",
  },
  {
    id: "run-intelligence-query",
    title: "Run your first intelligence query",
    description:
      "Ask questions about wallets and engagement in plain language or SQL.",
    icon: <CpuChipIcon aria-hidden="true" className="h-6 w-6" />,
    href: PRIVATE_ROUTES.INTELLIGENCE,
    cta: "Open intelligence",
  },
];

/**
 * Cards per carousel page tracks the page grid's column count so one "page"
 * is exactly one screenful: 1 on mobile, 2 at `md`, 3 at `lg+`. Defaults to 3
 * (the SSR markup) and corrects itself after hydration via matchMedia.
 */
function useCardsPerPage() {
  const [cardsPerPage, setCardsPerPage] = useState(3);

  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setCardsPerPage(lgQuery.matches ? 3 : mdQuery.matches ? 2 : 1);
    };
    sync();
    mdQuery.addEventListener("change", sync);
    lgQuery.addEventListener("change", sync);
    return () => {
      mdQuery.removeEventListener("change", sync);
      lgQuery.removeEventListener("change", sync);
    };
  }, []);

  return cardsPerPage;
}

/**
 * True only for an explicit verified status. Checks pending/failed markers
 * first so raw backend values like `PENDING_VERIFICATION` never read as
 * verified.
 */
const isVerifiedStatus = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  if (normalized.includes("PEND") || normalized.includes("FAIL")) return false;
  return normalized.includes("VERIF");
};

const hasVerifiedDomain = (
  domains: SenderDomainRecord[],
  authMap: DomainAuthMap
): boolean => {
  if (domains.some((row) => isVerifiedStatus(row.status))) return true;
  for (const state of authMap.values()) {
    if (state.status === "verified") return true;
    if (state.dkim === true && state.spf === true) return true;
  }
  return false;
};

/**
 * Resolves the active organization id the same way the settings views do:
 * selection cookie first (kept in sync via the `onchain:org-changed` event),
 * then the session's active organization. `undefined` means "not synced yet".
 */
function useOrganizationId() {
  const { data: session } = authClient.useSession();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    const syncSelectedOrgId = () => {
      setSelectedOrgId(getSelectedOrganizationId());
    };

    syncSelectedOrgId();
    window.addEventListener("onchain:org-changed", syncSelectedOrgId);
    return () =>
      window.removeEventListener("onchain:org-changed", syncSelectedOrgId);
  }, []);

  const organizationId = useMemo(() => {
    const selected = selectedOrgId?.trim();
    if (selected) return selected;
    const active = session?.session?.activeOrganizationId;
    return typeof active === "string" && active.trim().length > 0
      ? active.trim()
      : null;
  }, [selectedOrgId, session?.session?.activeOrganizationId]);

  return { organizationId, isSynced: selectedOrgId !== undefined };
}

/** Per-task completion booleans derived from existing service reads. */
function useTaskCompletion(organizationId: string | null) {
  const orgId = organizationId ?? undefined;
  const enabled = Boolean(organizationId);

  const contractQuery = useQuery({
    queryKey: ["get-started", "project-settings", organizationId],
    enabled,
    queryFn: async () => {
      const settings = await projectSettingsService.getProjectSettings(orgId);
      return settings.contractAddresses.length > 0;
    },
  });

  const domainQuery = useQuery({
    queryKey: ["get-started", "domains", organizationId],
    enabled,
    queryFn: async () => {
      const [domains, authMap] = await Promise.all([
        senderIdentitiesService
          .listDomains(orgId)
          .catch((): SenderDomainRecord[] => []),
        senderIdentitiesService
          .getDomainAuthentication(orgId)
          .catch((): DomainAuthMap => new Map()),
      ]);
      return hasVerifiedDomain(domains, authMap);
    },
  });

  const senderQuery = useQuery({
    queryKey: ["get-started", "sender-identities", organizationId],
    enabled,
    queryFn: async () => {
      const identities =
        await senderIdentitiesService.listSenderIdentities(orgId);
      return identities.some((identity) => identity.status === "verified");
    },
  });

  const audienceQuery = useQuery({
    queryKey: ["get-started", "audience-overview", organizationId],
    enabled,
    queryFn: async () => {
      const overview = await audienceService.getOverview(orgId);
      return (overview.total ?? 0) > 0;
    },
  });

  const campaignsQuery = useQuery({
    queryKey: [
      "get-started",
      "campaigns",
      organizationId,
      { page: 1, limit: 50 },
    ],
    enabled,
    queryFn: async () => {
      const campaigns = await campaignsService.listCampaigns(
        { page: 1, limit: 50 },
        orgId
      );
      return {
        hasCampaign: campaigns.length > 0,
        hasSentCampaign: campaigns.some(
          (campaign) =>
            campaign.status === "sent" ||
            campaign.status === "sending" ||
            Boolean(campaign.sentAt)
        ),
      };
    },
  });

  const automationsQuery = useQuery({
    queryKey: ["get-started", "automations", organizationId],
    enabled,
    queryFn: async () => {
      const res = await automationService.listAutomations(
        { page: 1, limit: 1 },
        orgId
      );
      const items = Array.isArray(res)
        ? res
        : "items" in res && Array.isArray(res.items)
          ? res.items
          : "data" in res && Array.isArray(res.data)
            ? res.data
            : [];
      return items.length > 0;
    },
  });

  const intelligenceQuery = useQuery({
    queryKey: ["get-started", "intelligence-history", organizationId],
    enabled,
    queryFn: async () => {
      const res = await intelligenceService.getQueryHistory(orgId);
      const items = Array.isArray(res) ? res : (res.items ?? []);
      return Array.isArray(items) && items.length > 0;
    },
  });

  const queries = [
    contractQuery,
    domainQuery,
    senderQuery,
    audienceQuery,
    campaignsQuery,
    automationsQuery,
    intelligenceQuery,
  ];
  const isLoading = enabled && queries.some((query) => query.isPending);

  const completionById = useMemo<Record<string, boolean>>(
    () => ({
      "contract-address": contractQuery.data === true,
      "verify-domain": domainQuery.data === true,
      "sender-identity": senderQuery.data === true,
      "import-audience": audienceQuery.data === true,
      "create-campaign": campaignsQuery.data?.hasCampaign === true,
      "send-campaign": campaignsQuery.data?.hasSentCampaign === true,
      "create-automation": automationsQuery.data === true,
      "run-intelligence-query": intelligenceQuery.data === true,
    }),
    [
      contractQuery.data,
      domainQuery.data,
      senderQuery.data,
      audienceQuery.data,
      campaignsQuery.data,
      automationsQuery.data,
      intelligenceQuery.data,
    ]
  );

  return { completionById, isLoading };
}

function TaskCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-background p-5 md:p-6">
      <div className="mb-4 h-12 w-12 animate-pulse rounded-xl bg-muted" />
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mb-1 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

/**
 * Session-scoped guard so the resume redirect fires at most once: users who
 * deliberately leave /onboarding and come back to the dashboard must not be
 * bounced into a redirect loop.
 */
const RESUME_REDIRECT_SESSION_KEY = "onchain.onboarding.resumeRedirected";

export function GetStartedSection() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    progress,
    resume,
    isLoading: isOnboardingLoading,
  } = useOnboardingTracking();
  const [onboardingCompleteCookie, setOnboardingCompleteCookie] =
    useState(false);

  // Onboarding is the OWNER's journey. Members (admin/editor/viewer) never
  // completed the wizard, so both the resume-redirect and the "finish
  // onboarding" banner must be owner-only — role null (loading/unknown)
  // counts as not-owner so members are never yanked out of the dashboard.
  const { role: myOrgRole } = useMyOrgRole();
  const isOrgOwner = myOrgRole === "OWNER";

  const { organizationId, isSynced } = useOrganizationId();
  const { completionById, isLoading: isCompletionLoading } =
    useTaskCompletion(organizationId);
  const isChecklistLoading = !isSynced || isCompletionLoading;

  useEffect(() => {
    const cookieHeader =
      typeof document !== "undefined" ? (document.cookie ?? "") : "";
    const pairs = cookieHeader
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => {
        const idx = p.indexOf("=");
        if (idx === -1) return [p, ""] as const;
        return [p.slice(0, idx), p.slice(idx + 1)] as const;
      });
    const map = new Map(pairs);
    setOnboardingCompleteCookie(map.get("onchain.onboardingComplete") === "1");
  }, []);

  // Resumable onboarding: users who abandoned mid-flow land back on
  // /onboarding to finish — at most once per browser session (see
  // RESUME_REDIRECT_SESSION_KEY), so skipping out isn't a redirect loop.
  useEffect(() => {
    if (!isOrgOwner) return;
    if (isOnboardingLoading) return;
    if (resume?.status !== "in_progress") return;
    if (progress?.is_completed) return;
    if (typeof window === "undefined") return;
    // Read the cookie directly — the mirrored state may not have settled yet.
    if (document.cookie.includes("onchain.onboardingComplete=1")) return;
    if (window.sessionStorage.getItem(RESUME_REDIRECT_SESSION_KEY) === "1") {
      return;
    }
    window.sessionStorage.setItem(RESUME_REDIRECT_SESSION_KEY, "1");
    router.push(AUTH_ROUTES.ONBOARDING);
  }, [
    isOrgOwner,
    isOnboardingLoading,
    resume?.status,
    progress?.is_completed,
    router,
  ]);

  const tasks = useMemo(
    () =>
      TASK_DEFINITIONS.map((task) => ({
        ...task,
        completed: completionById[task.id] === true,
      })),
    [completionById]
  );
  const completedCount = tasks.filter((t) => t.completed).length;

  const cardsPerPage = useCardsPerPage();
  const totalPages = Math.ceil(TASK_DEFINITIONS.length / cardsPerPage);

  // Re-clamp when a resize shrinks the page count (e.g. rotating a tablet).
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Touch swipe between pages (the pager buttons/dots still work everywhere).
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goToNext();
    else goToPrevious();
  };

  return (
    <div className="my-6 md:my-8">
      {isOrgOwner &&
        !isOnboardingLoading &&
        !onboardingCompleteCookie &&
        !progress?.is_completed && (
          <div className="mb-4 rounded-xl border border-border bg-background p-4 md:mb-6 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Finish onboarding to unlock your dashboard
                </div>
                <div className="text-sm text-muted-foreground">
                  {typeof progress?.completion_percentage === "number"
                    ? `${progress.completion_percentage}% complete. Continue where you left off.`
                    : "Continue where you left off to personalize your workspace and set up your organization."}
                </div>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Continue onboarding
              </Link>
            </div>
          </div>
        )}
      <div className="mb-4 flex items-center justify-between md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            Get started
          </h2>
          {isChecklistLoading ? (
            <span
              aria-hidden="true"
              className="h-5 w-20 animate-pulse rounded-full bg-muted md:w-24"
            />
          ) : (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground md:px-2.5">
              {completedCount} of {tasks.length} done
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="flex h-10 w-10 items-center cursor-pointer justify-center rounded-lg bg-transparent text-muted-foreground transition-all hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground md:h-8 md:w-8"
            aria-label="Previous step"
          >
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === totalPages - 1}
            className="flex h-10 w-10 items-center cursor-pointer justify-center rounded-lg bg-transparent text-muted-foreground transition-all hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground md:h-8 md:w-8"
            aria-label="Next step"
          >
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm md:rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isChecklistLoading ? (
          <div className="min-w-full p-4 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {TASK_DEFINITIONS.slice(0, cardsPerPage).map((task) => (
                <TaskCardSkeleton key={task.id} />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const pageTasks = tasks.slice(
                pageIndex * cardsPerPage,
                (pageIndex + 1) * cardsPerPage
              );
              return (
                <div
                  key={pageTasks[0]?.id ?? `page-${pageIndex}`}
                  className="min-w-full p-4 md:p-8"
                >
                  <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {pageTasks.map((task) => {
                      return (
                        <Link
                          key={task.id}
                          href={task.href}
                          className="group flex flex-col rounded-xl border border-border bg-background p-5 text-left transition-all hover:shadow-md md:p-6"
                        >
                          <div
                            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                              task.completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            {task.completed ? (
                              <CheckIcon
                                aria-hidden="true"
                                className="h-6 w-6"
                              />
                            ) : (
                              task.icon
                            )}
                          </div>
                          <h3 className="mb-2 text-base font-semibold text-foreground">
                            {task.title}
                          </h3>
                          <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {task.description}
                          </p>
                          <div className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all group-hover:bg-primary/90">
                            {task.cta}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            onClick={() => goToSlide(index)}
            className="group flex cursor-pointer items-center justify-center p-2"
            aria-label={`Go to page ${index + 1}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted/70 group-hover:bg-muted-foreground/90"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
