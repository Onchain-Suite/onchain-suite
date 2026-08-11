"use client";
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";

import { readBrandingData } from "@/hooks/client/use-get-logo";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import {
  cn,
  getCookieValue,
  isJsonObject,
  ORG_SELECTION_COOKIE,
} from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoUrl?: string; // Handle both cases just in case
}

const ORG_LIST_CACHE_TTL_MS = 5 * 60_000;
const ORG_VERIFIED_SESSION_KEY = "onchain.verifiedOrgId";
const ORG_LIST_STORAGE_KEY = "onchain.orgListCache.v1";
let organizationListCache: Organization[] | null = null;
let organizationListCacheExpiresAt = 0;
let organizationListInflight: Promise<Organization[]> | null = null;
let organizationListRateLimitedUntil = 0;

/**
 * The dashboard layout remounts on every route, so the switcher must render
 * from cache instantly instead of re-entering a loading state per page. The
 * module cache covers client-side navigations; sessionStorage covers full
 * reloads within the TTL.
 */
const getCachedOrganizations = (): Organization[] | null => {
  const now = Date.now();
  if (organizationListCache && organizationListCacheExpiresAt > now) {
    return organizationListCache;
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORG_LIST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      orgs?: Organization[];
      expiresAt?: number;
    };
    if (
      !Array.isArray(parsed.orgs) ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    organizationListCache = parsed.orgs;
    organizationListCacheExpiresAt = parsed.expiresAt;
    return parsed.orgs;
  } catch {
    return null;
  }
};

const persistOrganizations = (orgs: Organization[], expiresAt: number) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ORG_LIST_STORAGE_KEY,
      JSON.stringify({ orgs, expiresAt })
    );
  } catch {
    // Best effort - quota/private-mode failures just skip persistence.
  }
};

export function OrganizationSwitcher() {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = React.useState<Organization[]>(
    () => getCachedOrganizations() ?? []
  );
  const [activeOrgId, setActiveOrgId] = React.useState<string | null>(() =>
    getCookieValue(ORG_SELECTION_COOKIE)
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [selectedOrgCookie, setSelectedOrgCookie] = React.useState<
    string | null
  >(() => getCookieValue(ORG_SELECTION_COOKIE));
  const lastAutoSyncOrgIdRef = React.useRef<string | null>(null);
  const hasLoadedOrganizationsRef = React.useRef(false);
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

  const toOrganization = React.useCallback(
    (raw: unknown): Organization | null => {
      if (!isJsonObject(raw)) return null;
      const id =
        typeof raw.id === "string"
          ? raw.id
          : typeof raw.organizationId === "string"
            ? raw.organizationId
            : undefined;
      if (!id) return null;
      return {
        id,
        name: typeof raw.name === "string" ? raw.name : "",
        slug: typeof raw.slug === "string" ? raw.slug : "",
        logo: typeof raw.logo === "string" ? raw.logo : undefined,
        logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
      };
    },
    []
  );

  const extractOrganizations = React.useCallback(
    (payload: unknown): Organization[] => {
      const root = Array.isArray(payload)
        ? payload
        : isJsonObject(payload) && Array.isArray(payload.data)
          ? payload.data
          : [];
      if (!Array.isArray(root)) return [];
      const mapped = root.map(toOrganization).filter(Boolean);
      return mapped as Organization[];
    },
    [toOrganization]
  );

  const loadOrganizations = React.useCallback(
    async (force = false) => {
      const now = Date.now();
      const cached = force ? null : getCachedOrganizations();
      if (cached) {
        return cached;
      }
      if (!force && organizationListInflight) return organizationListInflight;
      if (!force && organizationListRateLimitedUntil > now) {
        return organizationListCache ?? [];
      }

      const request = apiClient
        .get("/organization/list", {
          headers: { "x-onchain-silent-error": "1" },
        })
        .then((response) => {
          const payload: unknown = response.data;
          const orgs = extractOrganizations(payload);
          organizationListCache = orgs;
          organizationListCacheExpiresAt = Date.now() + ORG_LIST_CACHE_TTL_MS;
          organizationListRateLimitedUntil = 0;
          persistOrganizations(orgs, organizationListCacheExpiresAt);
          return orgs;
        })
        .catch((error: unknown) => {
          const err = error as { response?: { status?: number } };
          if (err.response?.status === 429) {
            organizationListRateLimitedUntil =
              Date.now() + ORG_LIST_CACHE_TTL_MS;
            return organizationListCache ?? [];
          }
          throw error;
        })
        .finally(() => {
          organizationListInflight = null;
        });

      organizationListInflight = request;
      return request;
    },
    [extractOrganizations]
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
        const isRateLimitedFallback =
          orgs.length === 0 &&
          organizationListCache === null &&
          organizationListRateLimitedUntil > Date.now();

        if (isRateLimitedFallback) {
          return;
        }

        setOrganizations(orgs);
        hasLoadedOrganizationsRef.current = true;
        if (orgs.length === 0) console.warn("Organization list is empty.");

        const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
        const sessionOrgId =
          typeof session?.session?.activeOrganizationId === "string"
            ? session.session.activeOrganizationId.trim()
            : "";
        const cookieIsValid =
          typeof cookieOrgId === "string" &&
          cookieOrgId.trim().length > 0 &&
          orgs.some((o) => o.id === cookieOrgId.trim());

        if (!cookieIsValid) {
          const nextOrgId =
            (sessionOrgId.length > 0 && orgs.some((o) => o.id === sessionOrgId)
              ? sessionOrgId
              : orgs[0]?.id) ?? null;

          if (nextOrgId) {
            setSelectedOrgCookieValue(nextOrgId);
            setActiveOrgId(nextOrgId);
            window.dispatchEvent(
              new CustomEvent("onchain:org-changed", {
                detail: { orgId: nextOrgId, previousOrgId: activeOrgId },
              })
            );
            router.refresh();
          }
        }
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
      }
    };

    if (session?.user?.id) {
      fetchOrganizations();
    }
  }, [
    activeOrgId,
    loadOrganizations,
    router,
    session?.session?.activeOrganizationId,
    session?.user?.id,
    setSelectedOrgCookieValue,
  ]);

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

  if (!isMounted || !session) {
    return (
      <Button
        variant="outline"
        role="combobox"
        aria-label="Loading organization"
        className="h-10 w-10 justify-center rounded-xl border-border/70 bg-card/60 px-0 sm:w-50 sm:justify-between sm:px-2.5 lg:w-57.5"
        disabled
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
        </div>
        <ChevronUpDownIcon
          className="ml-2 hidden h-4 w-4 shrink-0 opacity-40 sm:block"
          aria-hidden="true"
        />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select organization"
          className={cn(
            "h-10 w-10 justify-center rounded-xl border-border/70 bg-card/60 px-0",
            "sm:w-50 sm:justify-between sm:px-2.5 lg:w-57.5",
            "shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-card"
          )}
          disabled={isLoading}
        >
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border/60">
              {activeOrgLogo ? (
                <AvatarImage
                  src={activeOrgLogo}
                  alt={activeOrg?.name ?? "Org"}
                />
              ) : null}
              <AvatarFallback>
                {activeOrg?.name?.substring(0, 2).toUpperCase() ?? "OR"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 text-left sm:block">
              <div className="truncate text-sm font-medium">
                {activeOrg?.name ?? "Select Organization"}
              </div>
              <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                {isLoading ? "Switching..." : "Workspace"}
              </div>
            </div>
          </div>
          <ChevronUpDownIcon
            className="ml-2 hidden h-4 w-4 shrink-0 opacity-50 sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[260px] rounded-xl border-border/70 p-1.5 shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => handleSwitchOrg(org.id)}
              className="cursor-pointer rounded-lg px-2 py-2 text-sm"
            >
              <Avatar className="mr-2 h-6 w-6 ring-1 ring-border/50">
                {(org.logo ?? org.logoUrl) ? (
                  <AvatarImage src={org.logo ?? org.logoUrl} alt={org.name} />
                ) : null}
                <AvatarFallback>
                  {org.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium">{org.name}</div>
                <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                  {org.slug}
                </div>
              </div>
              <CheckIcon
                className={cn(
                  "ml-auto h-4 w-4 text-primary",
                  confirmedActiveOrgId === org.id ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="cursor-not-allowed rounded-lg px-2 py-2 opacity-50"
        >
          <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
