"use client";

import {
  BoltIcon,
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
import { useEffect, useMemo, useState } from "react";

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

/** Static task definitions - completion is resolved from live org data. */
interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  /** Short "what to do" line for the sidebar checklist; falls back to description. */
  hint?: string;
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
      "React to onchain events automatically - emails, pushes, and posts on triggers.",
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
export function useOrganizationId() {
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
/**
 * How long the setup checklist may hold the dashboard behind a skeleton.
 *
 * Generous enough that a normal cold load resolves well inside it (the
 * endpoints answer in well under a second), short enough that a stall is a
 * blink rather than the minute a 30s-timeout-plus-retry would cost.
 */
const CHECKLIST_SKELETON_DEADLINE_MS = 4000;

/** True once `ms` has elapsed since mount. Timer is cleared on unmount. */
function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return elapsed;
}

export function useTaskCompletion(organizationId: string | null) {
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
  // A DEADLINE, not just a pending check.
  //
  // `queries.some(isPending)` fans seven independent requests into one boolean,
  // so ANY single one that does not settle holds the whole dashboard on the
  // skeleton. React Query has no request timeout of its own, and the shared
  // axios client allows 30s with `retry: 1` behind it — so one stalled call can
  // pin the page for a minute while the other six have long since answered.
  // That is the "stuck on the skeleton until I refresh" report: the refresh is
  // not fixing anything, it is just abandoning the stalled request.
  //
  // The checklist is advisory. Every task it cannot confirm is simply treated
  // as not-yet-done, which is already what an errored query does here
  // (`data === true` is the completion test, so undefined reads as incomplete).
  // Waiting past this point buys a slightly more accurate checklist at the cost
  // of an unusable dashboard, which is the wrong trade.
  const pastDeadline = useElapsed(CHECKLIST_SKELETON_DEADLINE_MS);
  const isLoading =
    enabled && !pastDeadline && queries.some((query) => query.isPending);

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

/** One setup step: its static definition plus whether live state marks it done. */
export interface SetupStep extends TaskDefinition {
  done: boolean;
}

/**
 * The single source of truth for the setup checklist, consumed by the
 * sidebar-pinned `GettingStarted` panel. Resolves the org the same way the
 * dashboard does and maps each static task to a `done` flag from live reads, so
 * there is one checklist derived from one set of queries (no second, drifting
 * copy). `isLoading` is true until the org syncs and completion resolves.
 */
export function useSetupSteps(): { steps: SetupStep[]; isLoading: boolean } {
  const { organizationId, isSynced } = useOrganizationId();
  const { completionById, isLoading } = useTaskCompletion(organizationId);
  const steps = useMemo<SetupStep[]>(
    () =>
      TASK_DEFINITIONS.map((task) => ({
        ...task,
        done: completionById[task.id] === true,
      })),
    [completionById]
  );
  return { steps, isLoading: !isSynced || isLoading };
}

/**
 * Session-scoped guard so the resume redirect fires at most once: users who
 * deliberately leave /onboarding and come back to the dashboard must not be
 * bounced into a redirect loop.
 */
const RESUME_REDIRECT_SESSION_KEY = "onchain.onboarding.resumeRedirected";

/**
 * The owner-only "finish onboarding" banner plus the resume redirect that
 * bounces an owner who abandoned the wizard back to /onboarding (once per
 * session). The setup CHECKLIST itself now lives in the sidebar
 * (`GettingStarted`), so this is no longer a checklist host, only the resume
 * affordance. Renders nothing for members, completed owners, or once the
 * onboarding-complete cookie is set.
 */
export function OnboardingResumeBanner() {
  const router = useRouter();
  const {
    progress,
    resume,
    isLoading: isOnboardingLoading,
  } = useOnboardingTracking();
  const [onboardingCompleteCookie, setOnboardingCompleteCookie] =
    useState(false);

  // Onboarding is the OWNER's journey. Members (admin/editor/viewer) never
  // completed the wizard, so both the resume-redirect and the "finish
  // onboarding" banner must be owner-only - role null (loading/unknown)
  // counts as not-owner so members are never yanked out of the dashboard.
  const { role: myOrgRole } = useMyOrgRole();
  const isOrgOwner = myOrgRole === "OWNER";

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
  // /onboarding to finish - at most once per browser session (see
  // RESUME_REDIRECT_SESSION_KEY), so skipping out isn't a redirect loop.
  useEffect(() => {
    if (!isOrgOwner) return;
    if (isOnboardingLoading) return;
    if (resume?.status !== "in_progress") return;
    if (progress?.is_completed) return;
    if (typeof window === "undefined") return;
    // Read the cookie directly - the mirrored state may not have settled yet.
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

  if (
    !isOrgOwner ||
    isOnboardingLoading ||
    onboardingCompleteCookie ||
    progress?.is_completed
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 md:p-5">
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
  );
}
