"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { readBrandingData } from "@/hooks/client/use-get-logo";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { ORG_ACCESS_LOST_EVENT } from "@/lib/org-access";
import {
  getCookieValue,
  isJsonObject,
  ORG_SELECTION_COOKIE,
} from "@/lib/utils";

import {
  getCachedOrganizations,
  hasNoOrganizationListYet,
  isOrganizationListRateLimited,
  loadOrganizations,
  ORG_LIST_CACHE_TTL_MS,
  type Organization,
  organizationListAgeMs,
} from "../organization-list.service";
import { goneWorkspaces, reconcileSelection } from "../utils/org-selection";

export type { Organization } from "../organization-list.service";

const ORG_VERIFIED_SESSION_KEY = "onchain.verifiedOrgId";

/**
 * A refresh on a click (opening the switcher) is cheap to ask for and the list
 * endpoint is rate limited, so two asks closer than this share one read.
 */
const REFRESH_MIN_GAP_MS = 15_000;

/** A workspace's name for a sentence, or a stand-in when it has none. */
const nameOr = (org: Organization | undefined, fallback: string): string =>
  org && org.name.trim().length > 0 ? org.name : fallback;

/** `refresh` settles on its own; this only marks the promise as handled. */
const settled = (p: Promise<void>) => {
  p.catch(() => undefined);
};

export interface UseOrgSwitcher {
  organizations: Organization[];
  activeOrg: Organization | undefined;
  activeOrgLogo: string | undefined;
  confirmedActiveOrgId: string | null;
  isLoading: boolean;
  isMounted: boolean;
  /** True once the org list has been fetched (or served from cache) at least
   * once - lets callers tell "still resolving" apart from "confirmed no org". */
  hasResolved: boolean;
  session: ReturnType<typeof authClient.useSession>["data"];
  switchOrg: (orgId: string, silent?: boolean) => Promise<void>;
  /**
   * Re-read the workspace list from the server and move off a workspace that
   * is gone. Called when the switcher opens and when the tab comes back after
   * a while; `now` skips the gap between reads (a switch was just refused).
   */
  refresh: (now?: boolean) => Promise<void>;
}

/**
 * Owns the organization list, active-org resolution, caching and switching.
 * Extracted from the old header `OrganizationSwitcher` so the sidebar account
 * block and any other consumer can drive workspace switching without
 * duplicating the delicate cookie/session reconciliation logic.
 */
export function useOrgSwitcher(): UseOrgSwitcher {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = React.useState<Organization[]>(
    () => getCachedOrganizations() ?? []
  );
  const [activeOrgId, setActiveOrgId] = React.useState<string | null>(() =>
    getCookieValue(ORG_SELECTION_COOKIE)
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [hasResolved, setHasResolved] = React.useState(
    () => getCachedOrganizations() !== null
  );
  const [selectedOrgCookie, setSelectedOrgCookie] = React.useState<
    string | null
  >(() => getCookieValue(ORG_SELECTION_COOKIE));
  const lastAutoSyncOrgIdRef = React.useRef<string | null>(null);
  const hasLoadedOrganizationsRef = React.useRef(false);
  // The list on screen, for telling which workspace a fresh read dropped.
  const organizationsRef = React.useRef(organizations);
  React.useEffect(() => {
    organizationsRef.current = organizations;
  }, [organizations]);
  const router = useRouter();

  const pickNonEmptyString = React.useCallback((...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return undefined;
  }, []);

  const getVerifiedOrgId = React.useCallback(() => {
    if (typeof window === "undefined") return null;
    const value = window.sessionStorage.getItem(ORG_VERIFIED_SESSION_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  }, []);

  const setVerifiedOrgId = React.useCallback((orgId: string | null) => {
    if (typeof window === "undefined") return;
    if (orgId && orgId.trim().length > 0) {
      window.sessionStorage.setItem(ORG_VERIFIED_SESSION_KEY, orgId.trim());
      return;
    }
    window.sessionStorage.removeItem(ORG_VERIFIED_SESSION_KEY);
  }, []);

  const setSelectedOrgCookieValue = React.useCallback(
    (orgId: string) => {
      if (typeof document === "undefined") return;
      document.cookie = `${ORG_SELECTION_COOKIE}=${encodeURIComponent(orgId)}; path=/; samesite=lax`;
      setSelectedOrgCookie(orgId);
      const verifiedOrgId =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(ORG_VERIFIED_SESSION_KEY)
          : null;
      if (verifiedOrgId && verifiedOrgId !== orgId) {
        setVerifiedOrgId(null);
      }
    },
    [setVerifiedOrgId]
  );

  // Drop the stored org entirely - used when the selected org isn't one we
  // belong to and there's no valid org to fall back to, so the shell stops
  // firing "not a member" requests and drops to the no-org/onboarding state.
  const clearSelectedOrg = React.useCallback(() => {
    if (typeof document !== "undefined") {
      document.cookie = `${ORG_SELECTION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
    setSelectedOrgCookie(null);
    setVerifiedOrgId(null);
  }, [setVerifiedOrgId]);

  /**
   * Check the stored selection against a list the server just returned, and
   * move off a workspace that is no longer theirs. Shared by the first load
   * and every refresh, so a deleted workspace is handled one way.
   */
  const applySelection = React.useCallback(
    (orgs: Organization[], previous: Organization[]) => {
      const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
      const fix = reconcileSelection({
        orgIds: orgs.map((o) => o.id),
        cookieOrgId,
        sessionOrgId: session?.session?.activeOrganizationId,
      });
      if (fix.kind === "keep") return;

      // Say so when the workspace they were in is the one that went: being
      // moved without a word reads as a bug.
      const left = goneWorkspaces(previous, orgs).find(
        (o) => o.id === cookieOrgId?.trim()
      );
      const nextOrgId = fix.kind === "switch" ? fix.orgId : null;
      if (nextOrgId) {
        setSelectedOrgCookieValue(nextOrgId);
        setActiveOrgId(nextOrgId);
        if (left) {
          const next = orgs.find((o) => o.id === nextOrgId);
          toast.info(
            `${nameOr(left, "That workspace")} is no longer available. You are now in ${nameOr(next, "another workspace")}.`
          );
        }
      } else {
        // The stored org isn't one we belong to and there's nothing to fall
        // back to - clear it so the shell drops to the no-org/onboarding
        // state instead of firing "not a member" requests for it.
        clearSelectedOrg();
        setActiveOrgId(null);
        if (left) {
          toast.info(
            `${left.name || "That workspace"} is no longer available.`
          );
        }
      }
      window.dispatchEvent(
        new CustomEvent("onchain:org-changed", {
          detail: { orgId: nextOrgId, previousOrgId: cookieOrgId },
        })
      );
      router.refresh();
    },
    [
      clearSelectedOrg,
      router,
      session?.session?.activeOrganizationId,
      setSelectedOrgCookieValue,
    ]
  );

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;
    const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
    setSelectedOrgCookie(cookieOrgId);
    if (cookieOrgId && !activeOrgId) setActiveOrgId(cookieOrgId);
  }, [activeOrgId, isMounted]);

  React.useEffect(() => {
    const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
    if (cookieOrgId && cookieOrgId.trim().length > 0) return;
    const sessionOrgId =
      typeof session?.session?.activeOrganizationId === "string"
        ? session.session.activeOrganizationId.trim()
        : "";
    if (sessionOrgId.length > 0) {
      setActiveOrgId(sessionOrgId);
      const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
      if (cookieOrgId === sessionOrgId) {
        setVerifiedOrgId(sessionOrgId);
      }
    }
  }, [session?.session?.activeOrganizationId, setVerifiedOrgId]);

  React.useEffect(() => {
    const fetchOrganizations = async () => {
      if (hasLoadedOrganizationsRef.current) return;
      setIsLoading(getCachedOrganizations() === null);
      try {
        const orgs = await loadOrganizations();
        // A 429 with nothing cached returns an empty list that says nothing
        // about which workspaces exist: wait for a real read.
        if (
          orgs.length === 0 &&
          hasNoOrganizationListYet() &&
          isOrganizationListRateLimited()
        ) {
          return;
        }

        setOrganizations(orgs);
        hasLoadedOrganizationsRef.current = true;
        if (orgs.length === 0) console.warn("Organization list is empty.");
        applySelection(orgs, organizationsRef.current);
      } catch (error) {
        const err = error as { response?: { status?: number } };
        const status = err.response?.status;
        if (status !== 409) {
          console.error("Failed to fetch organizations exception", err);
        }
        if (status === 409) {
          setOrganizations([]);
          return;
        }
        if (status === 429) {
          return;
        }
        // Toast handled by interceptor if we wanted, but keep for explicit UI feedback
        toast.error("Network error loading organizations");
      } finally {
        setIsLoading(false);
        setHasResolved(true);
      }
    };

    if (session?.user?.id) {
      fetchOrganizations();
    }
  }, [applySelection, session?.user?.id]);

  const refresh = React.useCallback(
    async (now = false) => {
      if (!session?.user?.id) return;
      if (!now && organizationListAgeMs() < REFRESH_MIN_GAP_MS) return;
      try {
        const orgs = await loadOrganizations(true);
        // Backed off: this is the list we already had, not the server's.
        if (isOrganizationListRateLimited()) return;
        const previous = organizationsRef.current;
        setOrganizations(orgs);
        hasLoadedOrganizationsRef.current = true;
        setHasResolved(true);
        applySelection(orgs, previous);
      } catch {
        // A refresh that fails changes nothing: the list on screen stays.
      }
    },
    [applySelection, session?.user?.id]
  );

  // Membership changes on the server while a tab sits open: a workspace is
  // deleted, or this person is removed from one. Coming back to the tab after
  // the cache has gone stale is when to find out, at most once per TTL. (Not a
  // focus refetch: it is bounded by the same five minutes as the cache.)
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (organizationListAgeMs() < ORG_LIST_CACHE_TTL_MS) return;
      settled(refresh());
    };
    // A request was refused because the workspace is gone or this person was
    // removed from it (see `reportOrgAccessLost`). A page fires many requests
    // at once, so the burst becomes one read. If the list was read moments
    // ago the read is put off until the gap has passed, not dropped: a page
    // that has finished loading may never fire another request to ask again.
    let pending: number | null = null;
    const onAccessLost = () => {
      if (pending !== null) return;
      const wait = REFRESH_MIN_GAP_MS - organizationListAgeMs();
      if (wait <= 0) {
        settled(refresh());
        return;
      }
      pending = window.setTimeout(() => {
        pending = null;
        settled(refresh(true));
      }, wait);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(ORG_ACCESS_LOST_EVENT, onAccessLost);
    return () => {
      if (pending !== null) window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ORG_ACCESS_LOST_EVENT, onAccessLost);
    };
  }, [refresh]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      if (!session) return;
      const detail = "detail" in event ? event.detail : undefined;
      const nextOrgId =
        isJsonObject(detail) && typeof detail.orgId === "string"
          ? detail.orgId
          : getCookieValue(ORG_SELECTION_COOKIE);
      setSelectedOrgCookie(nextOrgId);
      if (nextOrgId) setActiveOrgId(nextOrgId);
    };

    window.addEventListener("onchain:org-changed", handler);
    return () => window.removeEventListener("onchain:org-changed", handler);
  }, [session]);

  const confirmedActiveOrgId =
    selectedOrgCookie && activeOrgId && selectedOrgCookie === activeOrgId
      ? activeOrgId
      : null;

  const activeOrg = organizations.find(
    (org) => org.id === confirmedActiveOrgId
  );

  const fetcher = React.useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return { success: false, status: res.status };
    try {
      return await res.json();
    } catch {
      return { success: false };
    }
  }, []);

  const { data: branding } = useSWR(
    confirmedActiveOrgId ? "/api/v1/organization/branding" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
    }
  );

  // Shared reader: covers logoPreview/primaryLogoUrl fields and resolves
  // backend-relative URLs so the avatar image actually loads.
  const activeOrgLogo = readBrandingData(branding).primary;

  // Debug log if active org is missing but ID is set
  React.useEffect(() => {
    if (
      activeOrgId &&
      organizations.length > 0 &&
      confirmedActiveOrgId &&
      !activeOrg
    ) {
      console.warn(
        `Active Org ID ${activeOrgId} not found in organizations list`,
        organizations
      );
    }
  }, [activeOrgId, organizations, activeOrg, confirmedActiveOrgId]);

  React.useEffect(() => {
    if (!isMounted || !session) return;
    const sessionOrgId =
      typeof session.session?.activeOrganizationId === "string"
        ? session.session.activeOrganizationId.trim()
        : "";
    if (sessionOrgId.length === 0) return;
    const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
    if (cookieOrgId && cookieOrgId.trim().length > 0) return;
    setSelectedOrgCookieValue(sessionOrgId);
  }, [isMounted, session, setSelectedOrgCookieValue]);

  const handleSwitchOrg = React.useCallback(
    async (orgId: string, silent = false) => {
      const sessionActiveOrgId =
        typeof session?.session?.activeOrganizationId === "string"
          ? session.session.activeOrganizationId
          : null;
      if (orgId === activeOrgId && (!silent || sessionActiveOrgId === orgId)) {
        setSelectedOrgCookieValue(orgId);
        if (!silent) {
          window.dispatchEvent(
            new CustomEvent("onchain:org-changed", {
              detail: { orgId, previousOrgId: activeOrgId },
            })
          );
          router.refresh();
        }
        return;
      }

      if (!silent) {
        window.dispatchEvent(
          new CustomEvent("onchain:org-switch-start", {
            detail: { orgId, previousOrgId: activeOrgId },
          })
        );
      }

      setIsLoading(true);
      try {
        const response = await apiClient.post("/organization/set-active", {
          organizationId: orgId,
          organization_id: orgId,
        });

        const ok = response.status >= 200 && response.status < 300;
        const payload: unknown = response.data;
        const payloadObj = isJsonObject(payload) ? payload : undefined;
        const nestedData = isJsonObject(payloadObj?.data)
          ? payloadObj.data
          : undefined;
        const success = payloadObj
          ? (payloadObj.success ?? payloadObj.ok ?? nestedData?.success)
          : undefined;
        if (ok && success !== false) {
          setSelectedOrgCookieValue(orgId);
          setActiveOrgId(orgId);
          setVerifiedOrgId(orgId);
          if (!silent) toast.success("Switched organization");
          await authClient.getSession();
          window.dispatchEvent(
            new CustomEvent("onchain:org-changed", {
              detail: { orgId, previousOrgId: activeOrgId },
            })
          );
          router.refresh();
        } else {
          const payloadError = payloadObj?.error;
          const message =
            pickNonEmptyString(
              isJsonObject(payloadError) ? payloadError.message : undefined,
              payloadObj?.message,
              payloadError
            ) ?? "Failed to set active organization";
          throw new Error(String(message));
        }
      } catch (error) {
        const err = error as {
          message?: unknown;
          response?: { status?: number; data?: unknown };
        };
        const status = err.response?.status;
        const data = err.response?.data;
        const dataObj = isJsonObject(data) ? data : undefined;
        const nestedError = isJsonObject(dataObj?.error)
          ? dataObj.error
          : undefined;
        const message =
          pickNonEmptyString(
            nestedError?.message,
            dataObj?.message,
            dataObj?.error,
            err.message
          ) ?? "Failed to switch organization";

        if (status !== 409) {
          console.error("Failed to switch organization", err);
        }
        // Refused because the workspace is gone or they were removed from it:
        // re-read the list so it leaves the switcher instead of failing again.
        if (status === 403 || status === 404) settled(refresh(true));
        window.dispatchEvent(
          new CustomEvent("onchain:org-switch-failed", {
            detail: {
              orgId,
              previousOrgId: activeOrgId,
              message: String(message),
            },
          })
        );
        if (!silent) toast.error(String(message));
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeOrgId,
      pickNonEmptyString,
      refresh,
      router,
      session?.session?.activeOrganizationId,
      setSelectedOrgCookieValue,
      setVerifiedOrgId,
    ]
  );

  React.useEffect(() => {
    if (!isMounted || !session) return;
    const sessionOrgId =
      typeof session.session?.activeOrganizationId === "string"
        ? session.session.activeOrganizationId
        : null;
    const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
    setSelectedOrgCookie(cookieOrgId);
    if (!cookieOrgId) {
      setVerifiedOrgId(null);
      return;
    }
    const verifiedOrgId = getVerifiedOrgId();
    if (verifiedOrgId === cookieOrgId) {
      if (!activeOrgId) setActiveOrgId(cookieOrgId);
      return;
    }
    if (lastAutoSyncOrgIdRef.current === cookieOrgId) return;
    if (sessionOrgId === cookieOrgId) {
      if (activeOrgId !== cookieOrgId) {
        setActiveOrgId(cookieOrgId);
      }
      setVerifiedOrgId(cookieOrgId);
      return;
    }
    if (
      !activeOrgId ||
      activeOrgId !== cookieOrgId ||
      sessionOrgId !== cookieOrgId
    ) {
      lastAutoSyncOrgIdRef.current = cookieOrgId;
      handleSwitchOrg(cookieOrgId, true);
    }
  }, [
    activeOrgId,
    getVerifiedOrgId,
    handleSwitchOrg,
    isMounted,
    session,
    setVerifiedOrgId,
  ]);

  return {
    organizations,
    activeOrg,
    activeOrgLogo,
    confirmedActiveOrgId,
    isLoading,
    isMounted,
    hasResolved,
    session,
    switchOrg: handleSwitchOrg,
    refresh,
  };
}
