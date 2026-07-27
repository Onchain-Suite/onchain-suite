"use client";

import {
  ArrowPathIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  KeyIcon,
  PlusIcon,
  SwatchIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { resolveBrandAssetUrl } from "@/lib/brand-assets";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import CompanyEditForm from "@/features/settings/components/account/company-edit-form";
import { SmartSendingCard } from "@/features/settings/components/account/smart-sending-card";
import InviteUser from "@/features/settings/components/invite-user";
import LogoUpload from "@/features/settings/components/logo-upload";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import {
  type AssignableRole,
  type OrganizationInvite,
  type OrganizationMember,
  organizationMembersService,
} from "@/features/settings/organization-members.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { fadeInUp } from "@/features/settings/utils";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

type LogoType = "primary" | "dark" | "favicon";
type SenderStatus = "verified" | "pending" | "failed";

interface BrandingState {
  primaryLogoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
}

interface DomainRow {
  id: string;
  domain: string;
  dkim: boolean;
  spf: boolean;
  status: SenderStatus;
}

interface DomainDnsConflictAction {
  action: "edit" | "delete" | "add" | string;
  type?: string;
  host?: string;
  currentValue?: string;
  newValue?: string;
}

/** A record that something already in the org's DNS blocks (docs/backend.md). */
interface DomainDnsConflict {
  reason?: string;
  resolution?: string;
  existing: string[];
  informational: boolean;
  actions: DomainDnsConflictAction[];
}

interface DomainDnsRow {
  id: string;
  host: string;
  type: string;
  value: string;
  ttl?: string;
  priority?: string;
  verified?: boolean;
  /** Set for live Azure states that are neither pass nor fail. */
  verificationLabel?: string;
  status?: SenderStatus | "unknown";
  databaseField?: string;
  conflict?: DomainDnsConflict;
  /** What's live in the user's DNS right now ([] = nothing published yet). */
  current?: string[];
  /** The always-safe-to-paste value (e.g. the merged SPF record). */
  recommended?: string;
}

interface TeamPermissions {
  canManageMembers: boolean;
  canManageSenderIdentities: boolean;
  canEditCampaigns: boolean;
  canSendEmail: boolean;
  canLaunchCampaigns: boolean;
  canViewSettings: boolean;
}

interface TeamRow {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  avatar: string;
  twoFactorEnabled: boolean | null;
  isEnabled: boolean;
  kind: "member" | "invite";
  permissions?: TeamPermissions;
}

const defaultBrandingState: BrandingState = {};

const getSenderStatusTone = (status: string) => {
  switch (status.toLowerCase()) {
    case "verified":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300";
    case "pending":
      return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300";
    case "failed":
      return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const unwrapData = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

/**
 * Pull the backend's explanation out of an axios error instead of the
 * generic "Request failed with status code NNN". Returns the HTTP status
 * too so callers can special-case conflicts.
 */
const apiErrorInfo = (
  error: unknown
): { status: number | null; message: string | null } => {
  if (!isJsonObject(error)) return { status: null, message: null };
  const response = isJsonObject(error.response) ? error.response : undefined;
  const status = typeof response?.status === "number" ? response.status : null;
  const data = isJsonObject(response?.data) ? response.data : undefined;
  const nested = isJsonObject(data?.error) ? data.error : undefined;
  const message =
    pickString(
      isJsonObject(nested) ? nested.message : undefined,
      data?.message,
      data?.error
    ) ?? null;
  return { status, message };
};

const toArray = (payload: unknown): unknown[] => {
  const root = unwrapData(payload);
  if (Array.isArray(root)) return root;
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items;
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data;
  return [];
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0)
      return value.trim();
  }
  return undefined;
};

const pickBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        ["pass", "passed", "verified", "true", "valid", "ok"].includes(
          normalized
        )
      ) {
        return true;
      }
      if (
        ["fail", "failed", "false", "invalid", "pending"].includes(normalized)
      ) {
        return false;
      }
    }
  }
  return undefined;
};

const normalizeRoleLabel = (value: unknown) => {
  if (typeof value !== "string") return "Viewer";
  const normalized = value.trim().replace(/[_-]+/g, " ").toLowerCase();
  if (normalized.length === 0) return "Viewer";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizePermissions = (value: unknown): TeamPermissions | undefined => {
  if (!isJsonObject(value)) return undefined;
  return {
    canManageMembers: pickBooleanLike(value.canManageMembers) ?? false,
    canManageSenderIdentities:
      pickBooleanLike(value.canManageSenderIdentities) ?? false,
    canEditCampaigns: pickBooleanLike(value.canEditCampaigns) ?? false,
    canSendEmail: pickBooleanLike(value.canSendEmail) ?? false,
    canLaunchCampaigns: pickBooleanLike(value.canLaunchCampaigns) ?? false,
    canViewSettings: pickBooleanLike(value.canViewSettings) ?? false,
  };
};

const pickBooleanLike = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        [
          "true",
          "1",
          "pass",
          "passed",
          "verified",
          "valid",
          "ok",
          "active",
          "configured",
          "present",
          "exists",
          "found",
          "healthy",
        ].includes(normalized)
      ) {
        return true;
      }
      if (
        [
          "false",
          "0",
          "fail",
          "failed",
          "invalid",
          "missing",
          "not_found",
          "not found",
          "unverified",
        ].includes(normalized)
      ) {
        return false;
      }
    }
  }
  return undefined;
};

const resolveExplicitStatus = (
  ...values: unknown[]
): SenderStatus | undefined => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    // Check pending/failed BEFORE verified: "pending_verification" contains
    // "ver" and would otherwise be misread as verified.
    if (normalized.includes("pend")) return "pending";
    if (normalized.includes("fail")) return "failed";
    if (normalized.includes("ver")) return "verified";
  }
  return undefined;
};

const resolveAuthBooleans = ({
  dkim,
  spf,
  status,
}: {
  dkim?: boolean;
  spf?: boolean;
  status: SenderStatus;
}) => {
  if (status === "verified") {
    return {
      dkim: dkim ?? true,
      spf: spf ?? true,
    };
  }

  return {
    dkim: dkim ?? false,
    spf: spf ?? false,
  };
};

const extractDomainMap = (payload: unknown) => {
  const map = new Map<
    string,
    { dkim?: boolean; spf?: boolean; status?: SenderStatus }
  >();
  const root = unwrapData(payload);

  if (Array.isArray(root)) {
    for (const entry of root) {
      if (!isJsonObject(entry)) continue;
      const domain = pickString(
        entry.domain,
        entry.name,
        entry.hostname,
        entry.host
      );
      if (!domain) continue;
      const dkim = pickBoolean(
        entry.dkim,
        entry.dkimValid,
        entry.dkimVerified,
        entry.dkimStatus
      );
      const spf = pickBoolean(
        entry.spf,
        entry.spfValid,
        entry.spfVerified,
        entry.spfStatus
      );
      // Only record what the rollup explicitly states — fabricated statuses
      // here would be mistaken for backend truth by normalizeDomains.
      map.set(domain, {
        dkim,
        spf,
        status: resolveExplicitStatus(
          entry.status,
          entry.verificationStatus,
          entry.state
        ),
      });
    }
    return map;
  }

  if (!isJsonObject(root)) return map;
  for (const [domain, value] of Object.entries(root)) {
    if (!isJsonObject(value)) continue;
    const dkim = pickBoolean(
      value.dkim,
      value.dkimValid,
      value.dkimVerified,
      value.dkimStatus
    );
    const spf = pickBoolean(
      value.spf,
      value.spfValid,
      value.spfVerified,
      value.spfStatus
    );
    map.set(domain, {
      dkim,
      spf,
      status: resolveExplicitStatus(
        value.status,
        value.verificationStatus,
        value.state
      ),
    });
  }
  return map;
};

const normalizeBranding = (brandingPayload: unknown): BrandingState => {
  const brandingRoot = unwrapData(brandingPayload);
  const branding = isJsonObject(brandingRoot) ? brandingRoot : {};
  const logoPreview = isJsonObject(branding.logoPreview)
    ? branding.logoPreview
    : {};
  const logos = isJsonObject(branding.logos)
    ? branding.logos
    : isJsonObject(branding.assets)
      ? branding.assets
      : {};

  return {
    primaryLogoUrl: resolveBrandAssetUrl(
      logoPreview.primaryUrl,
      branding.primaryLogoUrl,
      branding.primaryLogo,
      logos.primaryLogoUrl,
      logos.primaryLogo,
      logos.primary,
      branding.logoUrl,
      branding.logo
    ),
    darkLogoUrl: resolveBrandAssetUrl(
      logoPreview.darkUrl,
      branding.darkLogoUrl,
      branding.darkLogo,
      branding.darkModeLogo,
      logos.darkLogoUrl,
      logos.darkLogo,
      logos.dark,
      logos.darkModeLogo
    ),
    faviconUrl: resolveBrandAssetUrl(
      logoPreview.faviconUrl,
      branding.faviconUrl,
      branding.favicon,
      logos.faviconUrl,
      logos.favicon,
      logos.icon
    ),
  };
};

const normalizeDomains = (
  payload: unknown,
  domainMap: Map<
    string,
    { dkim?: boolean; spf?: boolean; status?: SenderStatus }
  >
): DomainRow[] => {
  const rows = toArray(payload)
    .map((entry, index) => {
      if (!isJsonObject(entry)) return null;
      const domain = pickString(
        entry.domain,
        entry.name,
        entry.hostname,
        entry.host
      );
      if (!domain) return null;
      const authState = domainMap.get(domain);
      // Keep dkim/spf as "unknown" (undefined) until the status is known —
      // coercing them to false here made resolveAuthBooleans unable to apply
      // its verified→passed default, and VERIFIED domains rendered as
      // Pending + Fail/Fail. The backend's explicit status is authoritative.
      const dkim =
        pickBoolean(
          entry.dkim,
          entry.dkimValid,
          entry.dkimVerified,
          entry.dkimStatus
        ) ?? authState?.dkim;
      const spf =
        pickBoolean(
          entry.spf,
          entry.spfValid,
          entry.spfVerified,
          entry.spfStatus
        ) ?? authState?.spf;
      const status =
        resolveExplicitStatus(
          entry.status,
          entry.verificationStatus,
          entry.state,
          authState?.status
        ) ?? (dkim && spf ? "verified" : "pending");
      const resolvedAuth = resolveAuthBooleans({ dkim, spf, status });

      return {
        id: pickString(entry.id, entry.domainId) ?? `${domain}-${index}`,
        domain,
        dkim: resolvedAuth.dkim,
        spf: resolvedAuth.spf,
        status,
      } satisfies DomainRow;
    })
    .filter((row): row is DomainRow => Boolean(row));

  if (rows.length > 0) return rows;

  return Array.from(domainMap.entries()).map(([domain, authState], index) => {
    const status =
      authState.status ??
      (authState.dkim && authState.spf ? "verified" : "pending");
    const resolvedAuth = resolveAuthBooleans({
      dkim: authState.dkim,
      spf: authState.spf,
      status,
    });
    return {
      id: `${domain}-${index}`,
      domain,
      dkim: resolvedAuth.dkim,
      spf: resolvedAuth.spf,
      status,
    };
  });
};

/**
 * Collect DNS record entries from the `GET /domain/{id}/dns` response. The
 * records may arrive as a plain array, nested under records/verificationRecords,
 * or — Azure ACS style — as an object keyed by record purpose
 * (`{ Domain: {...}, DKIM: {...}, DKIM2: {...}, SPF: {...} }`).
 */
const collectDnsEntries = (payload: unknown): Record<string, unknown>[] => {
  const root = unwrapData(payload);
  const nested = isJsonObject(root)
    ? (root.records ?? root.verificationRecords ?? root.dns ?? root)
    : root;
  if (Array.isArray(nested)) return nested.filter(isJsonObject);
  if (isJsonObject(nested)) {
    return Object.entries(nested)
      .filter((pair): pair is [string, Record<string, unknown>] =>
        isJsonObject(pair[1])
      )
      .map(([purpose, record]) => ({ purpose, ...record }));
  }
  return [];
};

const normalizeDomainDns = (payload: unknown): DomainDnsRow[] => {
  return collectDnsEntries(payload)
    .map((entry, index): DomainDnsRow | null => {
      if (!isJsonObject(entry)) return null;
      const host =
        pickString(entry.host, entry.hostname, entry.name, entry.recordName) ??
        "@";
      const type = pickString(entry.type, entry.recordType);
      const value = pickString(
        entry.value,
        entry.content,
        entry.target,
        entry.recordValue
      );
      if (!type || !value) return null;
      // `verification` is the live Azure state on every record
      // (Verified|NotStarted|VerificationInProgress|VerificationFailed|Unknown)
      // — it wins over the legacy boolean-ish fields.
      const verificationState = pickString(entry.verification)?.toLowerCase();
      const verified =
        verificationState === "verified"
          ? true
          : verificationState === "verificationfailed"
            ? false
            : (pickBooleanLike(
                entry.verified,
                entry.isVerified,
                entry.valid,
                entry.isValid,
                entry.active,
                entry.exists,
                entry.present,
                entry.configured,
                entry.propagated,
                entry.matched,
                entry.recordVerified,
                entry.recordStatus,
                entry.status
              ) ?? undefined);
      const verificationLabel =
        verified === undefined
          ? verificationState === "verificationinprogress"
            ? "In progress"
            : verificationState === "notstarted"
              ? "Not started"
              : undefined
          : undefined;
      const conflictRaw = isJsonObject(entry.conflict)
        ? entry.conflict
        : undefined;
      const conflict: DomainDnsConflict | undefined = conflictRaw
        ? {
            reason: pickString(conflictRaw.reason),
            resolution: pickString(conflictRaw.resolution),
            existing: Array.isArray(conflictRaw.existing)
              ? conflictRaw.existing.filter(
                  (v): v is string => typeof v === "string" && v.length > 0
                )
              : [],
            informational: pickBooleanLike(conflictRaw.informational) === true,
            actions: Array.isArray(conflictRaw.actions)
              ? conflictRaw.actions
                  .filter(isJsonObject)
                  .map((a): DomainDnsConflictAction | null => {
                    const action = pickString(a.action);
                    if (!action) return null;
                    return {
                      action,
                      type: pickString(a.type),
                      host: pickString(a.host),
                      currentValue: pickString(a.currentValue),
                      newValue: pickString(a.newValue),
                    };
                  })
                  .filter((a): a is DomainDnsConflictAction => a !== null)
              : [],
          }
        : undefined;
      return {
        id: pickString(entry.id) ?? `${host}-${type}-${index}`,
        host,
        type,
        value,
        ttl: pickString(entry.ttl),
        priority: pickString(entry.priority),
        verified,
        verificationLabel,
        conflict,
        current: Array.isArray(entry.current)
          ? entry.current.filter((v): v is string => typeof v === "string")
          : undefined,
        recommended: pickString(entry.recommended),
        status:
          verified === true
            ? "verified"
            : verified === false
              ? "failed"
              : "unknown",
        databaseField: pickString(
          entry.category,
          entry.purpose,
          entry.kind,
          entry.field
        ),
      } satisfies DomainDnsRow;
    })
    .filter((row): row is DomainDnsRow => row !== null);
};

/** Map a typed service member row into the table's {@link TeamRow} shape. */
const memberToTeamRow = (member: OrganizationMember): TeamRow => ({
  id: member.userId,
  name: member.name,
  email: member.email,
  role: member.role,
  roleLabel: member.roleLabel,
  avatar: member.name.charAt(0).toUpperCase(),
  twoFactorEnabled: member.twoFactorEnabled,
  isEnabled: member.isEnabled,
  kind: "member",
  permissions: member.permissions ?? undefined,
});

/** Map a typed service invite row into the table's {@link TeamRow} shape. */
const inviteToTeamRow = (invite: OrganizationInvite): TeamRow => ({
  id: invite.id,
  name: "Pending invite",
  email: invite.email,
  role: invite.role,
  roleLabel: invite.roleLabel,
  avatar: invite.email.charAt(0).toUpperCase(),
  twoFactorEnabled: null,
  isEnabled: true,
  kind: "invite",
  permissions: invite.permissions ?? undefined,
});

const statusCell = (passed: boolean) => (
  <span
    className={
      passed
        ? "inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
        : "inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
    }
  >
    <span className="h-2 w-2 rounded-full bg-current" />
    {passed ? "Pass" : "Fail"}
  </span>
);

const LogoTile = ({
  label,
  spec,
  onClick,
  previewUrl,
}: {
  label: string;
  spec: string;
  onClick: () => void;
  previewUrl?: string;
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [previewUrl]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-border/60 bg-background/60 p-4 text-left transition hover:border-primary/35 hover:bg-background active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{spec}</div>
        </div>
        <ChevronRightIcon
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground"
        />
      </div>
      <div
        className={
          previewUrl && !imageFailed
            ? "mt-4 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
            : "mt-4 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/30"
        }
      >
        {previewUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={label}
            className="h-full w-full object-contain p-3"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="text-xs text-muted-foreground">
            {previewUrl ? "Preview unavailable" : "Click to upload"}
          </div>
        )}
      </div>
    </button>
  );
};

/** Deep-link id for the Sender verification section. */
const SENDER_VERIFICATION_SECTION_ID = "sender-verification";

export default function CompanySettingsView() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  // Deep link target, e.g. ?tab=account&section=sender-verification from the
  // campaign launch error. The section is collapsed by default, so opening
  // and scrolling to it is what makes that link useful.
  const settingsSearchParams = useSearchParams();
  const requestedSection = settingsSearchParams?.get("section") ?? null;
  const senderVerificationRequested =
    requestedSection === SENDER_VERIFICATION_SECTION_ID;

  useEffect(() => {
    if (!senderVerificationRequested) return;
    const node = document.getElementById(SENDER_VERIFICATION_SECTION_ID);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [senderVerificationRequested]);
  const [logoModal, setLogoModal] = useState<{
    open: boolean;
    type: LogoType;
  }>({ open: false, type: "primary" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamRow | null>(null);
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<{
    id: string;
    domain: string;
  } | null>(null);
  const [deleteSenderTarget, setDeleteSenderTarget] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [addSenderOpen, setAddSenderOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [domainDnsDialog, setDomainDnsDialog] = useState<{
    open: boolean;
    domainId: string | null;
    domain: string;
  }>({ open: false, domainId: null, domain: "" });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

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

  const orgHeaders = useMemo(
    () =>
      organizationId
        ? {
            "x-org-id": organizationId,
            "x-onchain-silent-error": "1",
          }
        : undefined,
    [organizationId]
  );

  const brandingQuery = useQuery({
    queryKey: ["project-settings", "branding", organizationId],
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const brandingRes = await apiClient.get("/organization/branding", {
        headers: orgHeaders,
      });
      return normalizeBranding(brandingRes.data);
    },
  });

  const senderQuery = useQuery({
    queryKey: ["project-settings", "senders", organizationId],
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: () =>
      senderIdentitiesService.listSenderIdentities(organizationId ?? undefined),
  });

  const domainQuery = useQuery({
    queryKey: ["project-settings", "domains", organizationId],
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const [domainsRes, domainAuthRes] = await Promise.all([
        apiClient
          .get("/domain", { headers: orgHeaders })
          .catch(() => ({ data: [] })),
        apiClient
          .get("/sender-identities/domains/authentication", {
            headers: orgHeaders,
          })
          .catch(() => ({ data: [] })),
      ]);
      return normalizeDomains(
        domainsRes.data,
        extractDomainMap(domainAuthRes.data)
      );
    },
  });

  const domainDnsQuery = useQuery({
    queryKey: ["project-settings", "domain-dns", domainDnsDialog.domainId],
    enabled: Boolean(
      domainDnsDialog.open && domainDnsDialog.domainId && orgHeaders
    ),
    retry: false,
    queryFn: async () => {
      const dnsResponse = await apiClient.get(
        `/domain/${domainDnsDialog.domainId}/dns`,
        { headers: orgHeaders }
      );
      const root = unwrapData(dnsResponse.data);
      const sendReady = isJsonObject(root)
        ? pickBooleanLike(root.sendReady)
        : undefined;
      // "Unknown" means the live Azure probe had no signal for that check —
      // drop those so the summary can never contradict the per-record states
      // (which fall back to stored verification data).
      const verificationStates =
        isJsonObject(root) && isJsonObject(root.verificationStates)
          ? Object.entries(root.verificationStates)
              .filter((pair): pair is [string, string] => {
                return (
                  typeof pair[1] === "string" &&
                  pair[1].toLowerCase() !== "unknown"
                );
              })
              .map(([check, state]) => ({ check, state }))
          : [];
      const fixes =
        isJsonObject(root) && Array.isArray(root.fixes)
          ? root.fixes.filter(
              (f): f is string => typeof f === "string" && f.length > 0
            )
          : [];
      return {
        records: normalizeDomainDns(dnsResponse.data),
        sendReady,
        verificationStates,
        fixes,
      };
    },
  });

  const membersQuery = useQuery({
    queryKey: ["project-settings", "members", organizationId],
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      if (!organizationId) return [] as TeamRow[];
      // Each list fails soft: a members 5xx/shape hiccup must not blank the
      // whole team section (the session user is always prepended), and
      // invites are Owner/Admin-only so a 403 must not sink members.
      const [members, invites] = await Promise.all([
        organizationMembersService.listMembers(organizationId).catch(() => []),
        organizationMembersService.listInvites(organizationId).catch(() => []),
      ]);
      return [...members.map(memberToTeamRow), ...invites.map(inviteToTeamRow)];
    },
  });

  const addSenderMutation = useMutation({
    mutationFn: async () => {
      if (!orgHeaders) throw new Error("No active organization selected");
      const cleanedEmail = senderEmail.trim().toLowerCase();
      if (cleanedEmail.length === 0) {
        throw new Error("Sender email is required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
        throw new Error(
          "Enter a valid email address, e.g. support@yourdomain.com"
        );
      }
      return apiClient.post(
        "/sender-identities",
        {
          email: cleanedEmail,
          name: senderName.trim() || undefined,
        },
        { headers: orgHeaders }
      );
    },
    onSuccess: async () => {
      setAddSenderOpen(false);
      setSenderEmail("");
      setSenderName("");
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "senders", organizationId],
      });
      toast.success("Sender added");
    },
    onError: (error: unknown) => {
      const { status, message } = apiErrorInfo(error);
      if (message) {
        toast.error(message);
        return;
      }
      if (status === 400) {
        // The API rejects senders on domains that aren't registered and
        // verified for this organization.
        toast.error(
          "Couldn't add this sender. Make sure its domain is added and verified under Domains first, then try again."
        );
        return;
      }
      if (status === 409) {
        toast.error("This sender address has already been added.");
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to add sender"
      );
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!orgHeaders) throw new Error("No active organization selected");
      const cleanedDomain = domainName
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "");
      if (!cleanedDomain) throw new Error("Domain is required");
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanedDomain)) {
        throw new Error("Enter a valid domain, e.g. yourprotocol.xyz");
      }
      return apiClient.post(
        "/domain",
        { domain: cleanedDomain },
        { headers: orgHeaders }
      );
    },
    onSuccess: async (response) => {
      setAddDomainOpen(false);
      setDomainName("");
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "domains", organizationId],
      });
      toast.success("Domain added");
      // POST /domain now returns the full DNS record set (docs/backend.md
      // 2026-07-23) — open the verify dialog immediately so the user can add
      // records without hunting for the row.
      const body = unwrapData(response?.data);
      const created = isJsonObject(body) ? body : {};
      const newDomainId = pickString(created.id, created.domainId);
      const newDomainName = pickString(created.domain, created.name);
      if (newDomainId) {
        setDomainDnsDialog({
          open: true,
          domainId: newDomainId,
          domain: newDomainName ?? "",
        });
      }
    },
    onError: async (error: unknown) => {
      const { status, message } = apiErrorInfo(error);
      if (status === 409) {
        // Conflict: the domain is already registered. If it belongs to this
        // org it's in the list (refresh it) — point the user at Recheck
        // instead of leaving them with a bare status code.
        setAddDomainOpen(false);
        setDomainName("");
        await queryClient.invalidateQueries({
          queryKey: ["project-settings", "domains", organizationId],
        });
        toast.error(
          message ??
            "This domain is already registered. If it's yours, it's in the list below — use Recheck to re-run verification."
        );
        return;
      }
      toast.error(
        message ??
          (error instanceof Error ? error.message : "Failed to add domain")
      );
    },
  });

  const setDefaultSenderMutation = useMutation({
    mutationFn: async (senderIdentityId: string) => {
      if (!orgHeaders) throw new Error("No active organization selected");
      await apiClient.put(
        "/sender-identities/default",
        { senderIdentityId },
        { headers: orgHeaders }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "senders", organizationId],
      });
      toast.success("Default sender updated");
    },
    onError: (error: unknown) => {
      toast.error(
        apiErrorInfo(error).message ??
          (error instanceof Error
            ? error.message
            : "Failed to set default sender")
      );
    },
  });

  const recheckSenderMutation = useMutation({
    mutationFn: async (senderId: string) => {
      if (!orgHeaders) throw new Error("No active organization selected");
      await apiClient.post(
        `/sender-identities/${senderId}/recheck`,
        {},
        { headers: orgHeaders }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "senders", organizationId],
      });
      toast.success("Sender verification recheck started");
    },
    onError: (error: unknown) => {
      toast.error(
        apiErrorInfo(error).message ??
          (error instanceof Error ? error.message : "Failed to recheck sender")
      );
    },
  });

  const recheckDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      if (!orgHeaders) throw new Error("No active organization selected");
      await apiClient.post(
        `/domain/${domainId}/recheck`,
        {},
        { headers: orgHeaders }
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["project-settings", "domains", organizationId],
        }),
        // Refresh the open DNS dialog too — record states are live now.
        queryClient.invalidateQueries({
          queryKey: ["project-settings", "domain-dns"],
        }),
      ]);
      toast.success("Domain recheck started");
    },
    onError: (error: unknown) => {
      toast.error(
        apiErrorInfo(error).message ??
          (error instanceof Error ? error.message : "Failed to recheck domain")
      );
    },
  });

  const invalidateMembers = () =>
    queryClient.invalidateQueries({
      queryKey: ["project-settings", "members", organizationId],
    });

  const updateMemberMutation = useMutation({
    mutationFn: async (input: {
      userId: string;
      role?: AssignableRole;
      isEnabled?: boolean;
    }) => {
      if (!organizationId) throw new Error("No active organization selected");
      await organizationMembersService.updateMember(
        organizationId,
        input.userId,
        { role: input.role, isEnabled: input.isEnabled }
      );
      return input;
    },
    onSuccess: async (input) => {
      await invalidateMembers();
      toast.success(
        input.role
          ? "Member role updated"
          : input.isEnabled
            ? "Member enabled"
            : "Member disabled"
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update member"
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!organizationId) throw new Error("No active organization selected");
      await organizationMembersService.removeMember(organizationId, userId);
    },
    onSuccess: async () => {
      setRemoveTarget(null);
      await invalidateMembers();
      toast.success("Member removed");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    },
  });

  // DELETE /domain/{id} now also removes the domain from Azure ECS
  // (docs/backend.md 2026-07-29) — safe for pending AND verified domains, so
  // abandoned verification attempts can be fully cleaned up in-app.
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      if (!orgHeaders) throw new Error("No active organization selected");
      await apiClient.delete(`/domain/${domainId}`, { headers: orgHeaders });
    },
    onSuccess: async () => {
      setDeleteDomainTarget(null);
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "domains", organizationId],
      });
      toast.success("Domain deleted — Azure resources cleaned up too");
    },
    onError: (error: unknown) => {
      toast.error(
        apiErrorInfo(error).message ??
          (error instanceof Error ? error.message : "Failed to delete domain")
      );
    },
  });

  // DELETE /sender-identities/{id} — removes a sender address (e.g. the
  // duplicate no-reply/noreply rows a domain verification can leave behind).
  const deleteSenderMutation = useMutation({
    mutationFn: async (senderId: string) => {
      if (!orgHeaders) throw new Error("No active organization selected");
      await apiClient.delete(`/sender-identities/${senderId}`, {
        headers: orgHeaders,
      });
    },
    onSuccess: async () => {
      setDeleteSenderTarget(null);
      await queryClient.invalidateQueries({
        queryKey: ["project-settings", "senders", organizationId],
      });
      toast.success("Sender removed");
    },
    onError: (error: unknown) => {
      toast.error(
        apiErrorInfo(error).message ??
          (error instanceof Error ? error.message : "Failed to remove sender")
      );
    },
  });

  // DELETE /organization/{orgId}/invites/{inviteId} — cancels a pending
  // invite; the token dies immediately (docs/backend.md 2026-07-29).
  const cancelInviteMutation = useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string; email: string }) => {
      if (!organizationId) throw new Error("No active organization selected");
      await apiClient.delete(
        `/organizations/${organizationId}/invites/${inviteId}`,
        { headers: orgHeaders ?? undefined }
      );
    },
    onSuccess: async (_data, { email }) => {
      await invalidateMembers();
      toast.success(`Invite to ${email} cancelled`);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invite"
      );
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string; email: string }) => {
      if (!organizationId) throw new Error("No active organization selected");
      await organizationMembersService.resendInvite(organizationId, inviteId);
    },
    onSuccess: (_data, { email }) => {
      toast.success(`Invite email resent to ${email}`);
    },
    onError: (error: unknown) => {
      // A 429 here carries the friendly 5/min rate-limit message.
      toast.error(
        error instanceof Error ? error.message : "Failed to resend invite"
      );
    },
  });

  // Auto-configure DNS is disabled for now (button commented out in the DNS
  // dialog below). POST /domain/{id}/dns/auto supports Cloudflare, GoDaddy,
  // Namecheap, and Porkbun but requires a `{ provider, credentials }` body —
  // this mutation posted an empty body and could never succeed. Re-add with a
  // provider/credentials form once that contract is documented.

  const branding = brandingQuery.data ?? defaultBrandingState;
  const domains = useMemo(() => domainQuery.data ?? [], [domainQuery.data]);
  const domainDnsRecords = domainDnsQuery.data?.records ?? [];
  const domainDnsConflictCount = domainDnsRecords.filter(
    (record) => record.conflict && !record.conflict.informational
  ).length;
  const senders = useMemo(() => senderQuery.data ?? [], [senderQuery.data]);
  const teamMembers = useMemo(() => {
    const rows = membersQuery.data ?? [];
    const sessionEmail = pickString(session?.user?.email);
    if (!sessionEmail) return rows;
    const alreadyPresent = rows.some(
      (member) => member.email.toLowerCase() === sessionEmail.toLowerCase()
    );
    if (alreadyPresent) return rows;

    return [
      {
        id:
          pickString(session?.user?.id, session?.session?.userId) ??
          sessionEmail,
        name: pickString(session?.user?.name, sessionEmail) ?? sessionEmail,
        email: sessionEmail,
        role:
          pickString(
            isJsonObject(session?.user)
              ? (session.user as Record<string, unknown>).role
              : undefined
          ) ?? "MEMBER",
        roleLabel:
          normalizeRoleLabel(
            isJsonObject(session?.user)
              ? ((session.user as Record<string, unknown>).roleLabel ??
                  (session.user as Record<string, unknown>).role)
              : undefined
          ) || "Member",
        avatar: sessionEmail.charAt(0).toUpperCase(),
        twoFactorEnabled:
          pickBoolean(
            isJsonObject(session?.user)
              ? session.user.twoFactorEnabled
              : undefined
          ) ?? null,
        isEnabled: true,
        kind: "member" as const,
        permissions: normalizePermissions(
          isJsonObject(session?.user)
            ? (session.user as Record<string, unknown>).permissions
            : undefined
        ),
      },
      ...rows,
    ];
  }, [membersQuery.data, session]);

  const senderSummary = useMemo(
    () => ({
      total: senders.length,
      verified: senders.filter((sender) => sender.status === "verified").length,
      pending: senders.filter((sender) => sender.status === "pending").length,
    }),
    [senders]
  );

  const domainSummary = useMemo(
    () => ({
      total: domains.length,
      verified: domains.filter((domain) => domain.status === "verified").length,
      pending: domains.filter((domain) => domain.status === "pending").length,
    }),
    [domains]
  );
  const teamSummary = useMemo(() => {
    const activeMembers = teamMembers.filter(
      (member) => member.kind === "member"
    );
    const pendingInvites = teamMembers.filter(
      (member) => member.kind === "invite"
    );
    const enabledMembers = activeMembers.filter((member) => member.isEnabled);
    const sendCapableMembers = enabledMembers.filter(
      (member) => member.permissions?.canSendEmail === true
    );
    const roleCounts = activeMembers.reduce<Record<string, number>>(
      (acc, member) => {
        acc[member.roleLabel] = (acc[member.roleLabel] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return {
      activeMembers: activeMembers.length,
      enabledMembers: enabledMembers.length,
      sendCapableMembers: sendCapableMembers.length,
      pendingInvites: pendingInvites.length,
      roleCounts,
    };
  }, [teamMembers]);
  const currentMemberPermissions = useMemo(() => {
    const sessionEmail = pickString(session?.user?.email)?.toLowerCase();
    if (!sessionEmail) return undefined;
    return teamMembers.find(
      (member) =>
        member.kind === "member" &&
        member.email.toLowerCase() === sessionEmail &&
        member.isEnabled
    )?.permissions;
  }, [session?.user?.email, teamMembers]);
  const canManageSenderIdentities =
    currentMemberPermissions?.canManageSenderIdentities !== false;
  // Backend enforces Owner/Admin-only management (and last-owner protection);
  // this only hides controls that would be rejected anyway.
  const canManageMembers = currentMemberPermissions?.canManageMembers !== false;
  const sessionEmail = pickString(session?.user?.email)?.toLowerCase();

  return (
    <>
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        className="mx-auto max-w-6xl space-y-8 py-8"
      >
        <CompanyEditForm />
        <SettingsSectionCard
          title="Branding"
          description="Customize your brand appearance across all touchpoints."
          icon={<SwatchIcon aria-hidden="true" className="h-5 w-5" />}
          badge="Brand kit"
        >
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Upload your logos for light and dark backgrounds
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <LogoTile
                label="Primary logo"
                spec="SVG, PNG • 400×100px"
                previewUrl={branding.primaryLogoUrl}
                onClick={() => setLogoModal({ open: true, type: "primary" })}
              />
              <LogoTile
                label="Dark mode logo"
                spec="SVG, PNG • 400×100px"
                previewUrl={branding.darkLogoUrl}
                onClick={() => setLogoModal({ open: true, type: "dark" })}
              />
              <LogoTile
                label="Favicon"
                spec="ICO, PNG • 32×32px"
                previewUrl={branding.faviconUrl}
                onClick={() => setLogoModal({ open: true, type: "favicon" })}
              />
            </div>
          </section>
        </SettingsSectionCard>

        <SettingsSectionCard
          id={SENDER_VERIFICATION_SECTION_ID}
          title="Sender verification"
          description="Verify domains and set up sender infrastructure for branded organization sending."
          icon={<KeyIcon aria-hidden="true" className="h-5 w-5" />}
          defaultOpen={senderVerificationRequested}
          badge={
            domainSummary.pending > 0
              ? `${domainSummary.pending} pending`
              : "Ready"
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setAddDomainOpen(true)}
                disabled={!organizationId || !canManageSenderIdentities}
              >
                <GlobeAltIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                Add domain
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setAddSenderOpen(true)}
                disabled={!organizationId || !canManageSenderIdentities}
              >
                <PlusIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                Add sender identity
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Domains
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {domainSummary.total}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Verified domains
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {domainSummary.verified}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Sender identities
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {senderSummary.total}
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Domain setup
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Register and verify your base domain before creating sender
                    identities or subdomains.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {domainSummary.pending > 0
                    ? `${domainSummary.pending} pending`
                    : "Ready"}
                </Badge>
              </div>

              {domainQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : domains.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-6 text-sm text-muted-foreground">
                  No sending domains registered yet. Add a domain first, publish
                  its DNS records, then return here to verify it before creating
                  sender identities.
                </div>
              ) : (
                <div className="space-y-3">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-foreground">
                              {domain.domain}
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone(
                                domain.status
                              )}`}
                            >
                              {domain.status.charAt(0).toUpperCase() +
                                domain.status.slice(1)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm">
                            <div>{statusCell(domain.dkim)}</div>
                            <div>{statusCell(domain.spf)}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2"
                            onClick={() =>
                              setDomainDnsDialog({
                                open: true,
                                domainId: domain.id,
                                domain: domain.domain,
                              })
                            }
                          >
                            View DNS
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2"
                            disabled={
                              !domain.id || recheckDomainMutation.isPending
                            }
                            onClick={() =>
                              recheckDomainMutation.mutate(domain.id)
                            }
                          >
                            {recheckDomainMutation.isPending ? (
                              <ArrowPathIcon
                                aria-hidden="true"
                                className="mr-2 h-3.5 w-3.5 animate-spin"
                              />
                            ) : (
                              <ArrowPathIcon
                                aria-hidden="true"
                                className="mr-2 h-3.5 w-3.5"
                              />
                            )}
                            Recheck
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-destructive hover:text-destructive"
                            disabled={
                              !domain.id || deleteDomainMutation.isPending
                            }
                            onClick={() =>
                              setDeleteDomainTarget({
                                id: domain.id,
                                domain: domain.domain,
                              })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 border-t border-border/50 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Sender identities
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add verified sender addresses and subdomains for branded
                    from-addresses, default sender selection, and domain-backed
                    deliverability.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {senderSummary.verified} verified
                </Badge>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Shared sending access
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Team roles control who can send. Sender identities are
                      optional workspace infrastructure the backend can use
                      first before falling back to the default or platform
                      sender.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {teamSummary.sendCapableMembers} can send
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {senderSummary.verified} verified senders
                    </Badge>
                  </div>
                </div>
              </div>
              {!canManageSenderIdentities ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                  Your role can view sender identities, but only owners and
                  admins can add, recheck, or manage them.
                </div>
              ) : null}

              {senderQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : senders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-6 text-sm text-muted-foreground">
                  No sender identities found for this organization yet. Verify a
                  domain above, then add the sender addresses you want to use.
                </div>
              ) : (
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sender</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>DKIM</TableHead>
                      <TableHead>SPF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {senders.map((sender) => (
                      <TableRow key={sender.email}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {sender.email}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {sender.name}
                              {sender.isDefault ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full"
                                >
                                  Default
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{sender.domain}</TableCell>
                        <TableCell>{statusCell(sender.dkim)}</TableCell>
                        <TableCell>{statusCell(sender.spf)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone(
                              sender.status
                            )}`}
                          >
                            {sender.status.charAt(0).toUpperCase() +
                              sender.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg px-2"
                              disabled={
                                !sender.id ||
                                recheckSenderMutation.isPending ||
                                !canManageSenderIdentities
                              }
                              onClick={() =>
                                recheckSenderMutation.mutate(sender.id)
                              }
                            >
                              {recheckSenderMutation.isPending ? (
                                <ArrowPathIcon
                                  aria-hidden="true"
                                  className="mr-2 h-3.5 w-3.5 animate-spin"
                                />
                              ) : (
                                <ArrowPathIcon
                                  aria-hidden="true"
                                  className="mr-2 h-3.5 w-3.5"
                                />
                              )}
                              Recheck
                            </Button>
                            {!sender.isDefault &&
                            sender.status === "verified" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-lg px-2"
                                disabled={
                                  !sender.id ||
                                  setDefaultSenderMutation.isPending ||
                                  !canManageSenderIdentities
                                }
                                onClick={() =>
                                  setDefaultSenderMutation.mutate(sender.id)
                                }
                              >
                                Make default
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg px-2 text-destructive hover:text-destructive"
                              disabled={
                                !sender.id ||
                                deleteSenderMutation.isPending ||
                                !canManageSenderIdentities
                              }
                              onClick={() =>
                                setDeleteSenderTarget({
                                  id: sender.id,
                                  email: sender.email,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          title="Team members"
          description="Manage team access, sender access, and member roles."
          icon={<UserGroupIcon aria-hidden="true" className="h-5 w-5" />}
          badge={`${teamSummary.activeMembers} active members`}
        >
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setInviteOpen(true)}
              >
                Invite user
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Active members
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {teamSummary.activeMembers}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Can send email
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {teamSummary.sendCapableMembers}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Pending invites
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {teamSummary.pendingInvites}
                </div>
              </div>
            </div>

            {Object.keys(teamSummary.roleCounts).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(teamSummary.roleCounts)
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([role, count]) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="rounded-full"
                    >
                      {role}: {count}
                    </Badge>
                  ))}
              </div>
            ) : null}

            {membersQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-6 text-sm text-muted-foreground">
                No team members or pending invites yet.
              </div>
            ) : (
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => {
                    const isSelf =
                      Boolean(sessionEmail) &&
                      member.email.toLowerCase() === sessionEmail;
                    // Owners can't be downgraded/removed (backend-enforced);
                    // keep self-management off the table too.
                    const manageable =
                      member.kind === "member" &&
                      canManageMembers &&
                      member.role !== "OWNER" &&
                      !isSelf;
                    // Scope the resend spinner to the row actually in flight —
                    // a shared `isPending` spins every pending-invite row at
                    // once and reads as "resent to everyone".
                    const isResendingThisInvite =
                      resendInviteMutation.isPending &&
                      resendInviteMutation.variables?.inviteId === member.id;
                    return (
                      <TableRow key={`${member.kind}-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-1 ring-border/70">
                              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                {member.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground">
                                {member.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {/* 2FA column removed while 2FA is disabled
                            product-wide (see profile/security.tsx). */}
                        <TableCell>
                          {manageable ? (
                            <Select
                              value={
                                member.role === "ADMIN" ||
                                member.role === "EDITOR" ||
                                member.role === "VIEWER"
                                  ? member.role
                                  : "VIEWER"
                              }
                              disabled={updateMemberMutation.isPending}
                              onValueChange={(value) =>
                                updateMemberMutation.mutate({
                                  userId: member.id,
                                  role: value as AssignableRole,
                                })
                              }
                            >
                              <SelectTrigger
                                className="h-8 w-28 rounded-full text-xs"
                                aria-label={`Role for ${member.email}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="EDITOR">Editor</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="rounded-full">
                              {member.roleLabel}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.kind === "invite" ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div>Pending invite</div>
                                {member.permissions?.canSendEmail ? (
                                  <div>Can send after acceptance</div>
                                ) : null}
                              </div>
                              {canManageMembers ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-full text-xs"
                                    disabled={isResendingThisInvite}
                                    onClick={() =>
                                      resendInviteMutation.mutate({
                                        inviteId: member.id,
                                        email: member.email,
                                      })
                                    }
                                  >
                                    {isResendingThisInvite ? (
                                      <ArrowPathIcon
                                        aria-hidden="true"
                                        className="mr-1 h-3.5 w-3.5 animate-spin"
                                      />
                                    ) : null}
                                    Resend
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full text-xs text-destructive hover:text-destructive"
                                    disabled={
                                      cancelInviteMutation.isPending &&
                                      cancelInviteMutation.variables
                                        ?.inviteId === member.id
                                    }
                                    onClick={() =>
                                      cancelInviteMutation.mutate({
                                        inviteId: member.id,
                                        email: member.email,
                                      })
                                    }
                                  >
                                    Cancel invite
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {member.isEnabled ? (
                                  <>
                                    <div>Active member</div>
                                    {member.permissions?.canSendEmail ? (
                                      <div>Can send for the organization</div>
                                    ) : (
                                      <div>
                                        Cannot send email with this role
                                      </div>
                                    )}
                                    {member.permissions?.canLaunchCampaigns ? (
                                      <div>Can launch campaigns</div>
                                    ) : null}
                                  </>
                                ) : (
                                  <div>Disabled</div>
                                )}
                              </div>
                              {manageable ? (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={member.isEnabled}
                                    disabled={updateMemberMutation.isPending}
                                    aria-label={
                                      member.isEnabled
                                        ? `Disable ${member.email}`
                                        : `Enable ${member.email}`
                                    }
                                    onCheckedChange={(checked) =>
                                      updateMemberMutation.mutate({
                                        userId: member.id,
                                        isEnabled: checked,
                                      })
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                    onClick={() => setRemoveTarget(member)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </SettingsSectionCard>

        <SmartSendingCard />
      </motion.div>

      <LogoUpload
        showLogoUploadModal={logoModal.open}
        setShowLogoUploadModal={(open) =>
          setLogoModal((current) => ({ ...current, open }))
        }
        logoUploadType={logoModal.type}
        onUploaded={async (payload) => {
          if (payload) {
            queryClient.setQueryData(
              ["project-settings", "branding", organizationId],
              normalizeBranding(payload)
            );
          }
          await queryClient.invalidateQueries({
            queryKey: ["project-settings", "branding", organizationId],
          });
        }}
      />
      <InviteUser
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["project-settings", "members", organizationId],
          });
        }}
      />
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Remove team member
            </DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.name} (${removeTarget.email}) will lose access to this organization and their sessions move off it immediately. Any invitations for their email are cleared too, so they can be re-invited fresh. This does not delete their account.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMemberMutation.isPending || !removeTarget}
              onClick={() => {
                if (removeTarget) {
                  removeMemberMutation.mutate(removeTarget.id);
                }
              }}
            >
              {removeMemberMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={addSenderOpen} onOpenChange={setAddSenderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Add sender identity
            </DialogTitle>
            <DialogDescription>
              Add a sender address or subdomain after your base domain is set up
              and verified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Sender name</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Support Team"
              />
            </div>
            <div className="space-y-2">
              <Label>Sender email</Label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="support@company.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSenderOpen(false)}
              disabled={addSenderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addSenderMutation.mutate()}
              disabled={
                addSenderMutation.isPending || senderEmail.trim().length === 0
              }
            >
              {addSenderMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <EnvelopeIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              Add sender identity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteSenderTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSenderTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Remove sender
            </DialogTitle>
            <DialogDescription>
              {deleteSenderTarget
                ? `${deleteSenderTarget.email} will no longer be usable as a sending address. Campaigns configured with it fall back to the default sender.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSenderTarget(null)}
              disabled={deleteSenderMutation.isPending}
            >
              Keep sender
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSenderMutation.isPending}
              onClick={() => {
                if (deleteSenderTarget) {
                  deleteSenderMutation.mutate(deleteSenderTarget.id);
                }
              }}
            >
              {deleteSenderMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Remove sender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteDomainTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDomainTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Delete domain
            </DialogTitle>
            <DialogDescription>
              {deleteDomainTarget
                ? `${deleteDomainTarget.domain} will be removed from your workspace and from Azure Email Communication Services. Sender identities on this domain stop working. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDomainTarget(null)}
              disabled={deleteDomainMutation.isPending}
            >
              Keep domain
            </Button>
            <Button
              variant="destructive"
              disabled={deleteDomainMutation.isPending}
              onClick={() => {
                if (deleteDomainTarget) {
                  deleteDomainMutation.mutate(deleteDomainTarget.id);
                }
              }}
            >
              {deleteDomainMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Delete domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Add domain
            </DialogTitle>
            <DialogDescription>
              Register the domain you want to send from, then publish the DNS
              records shown for verification.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="company.com or emails.company.com"
              />
            </div>
            <p className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Recommended:</span>{" "}
              use a dedicated sending subdomain like{" "}
              <code className="rounded bg-muted px-1">emails.company.com</code>{" "}
              — your root domain&apos;s DNS (and any existing mail like Google
              Workspace) is never touched. Root domains work too: verification
              understands merged SPF records and coexists with your current
              provider&apos;s DKIM.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDomainOpen(false)}
              disabled={addDomainMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addDomainMutation.mutate()}
              disabled={
                addDomainMutation.isPending || domainName.trim().length === 0
              }
            >
              {addDomainMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <GlobeAltIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              Add domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={domainDnsDialog.open}
        onOpenChange={(open) =>
          setDomainDnsDialog((current) => ({ ...current, open }))
        }
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Verify {domainDnsDialog.domain || "domain"}
            </DialogTitle>
            <DialogDescription>
              Add these DNS records at your DNS provider, then recheck the
              domain status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {domainDnsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                {domainDnsQuery.data?.sendReady === true ||
                (domainDnsQuery.data?.sendReady === false &&
                  domainDnsQuery.data.verificationStates.length > 0) ? (
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">
                        {domainDnsQuery.data.sendReady
                          ? "Ready to send"
                          : "Not ready to send yet"}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone(
                          domainDnsQuery.data.sendReady ? "verified" : "pending"
                        )}`}
                      >
                        {domainDnsQuery.data.sendReady
                          ? "Send-ready"
                          : "Verification pending"}
                      </span>
                    </div>
                    {domainDnsQuery.data.verificationStates.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {domainDnsQuery.data.verificationStates.map(
                          ({ check, state }) => (
                            <span
                              key={check}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                                state.toLowerCase() === "verified"
                                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                  : state.toLowerCase() === "verificationfailed"
                                    ? "border-destructive/40 text-destructive"
                                    : "border-border text-muted-foreground"
                              }`}
                            >
                              <span className="font-medium uppercase">
                                {check}
                              </span>
                              {state.replace(/^Verification/, "")}
                            </span>
                          )
                        )}
                      </div>
                    ) : null}
                    {domainDnsConflictCount > 0 ? (
                      <p className="mt-3 text-xs font-medium leading-5 text-amber-600 dark:text-amber-400">
                        {domainDnsConflictCount} of your existing DNS record
                        {domainDnsConflictCount === 1 ? "" : "s"} conflict
                        {domainDnsConflictCount === 1 ? "s" : ""} with
                        verification — see the fix instructions below.
                      </p>
                    ) : null}
                    {!domainDnsQuery.data.sendReady ? (
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Domain, SPF, DKIM, and DKIM2 must all verify before
                        sending starts. Already on Google Workspace or another
                        mail provider? That&apos;s fine — keep your MX records,
                        merge our SPF include into your existing{" "}
                        <code className="rounded bg-muted px-1">v=spf1</code>{" "}
                        record (merged records verify correctly), and add the
                        two DKIM selector CNAMEs — they use their own selector
                        names, so they never clash with your provider&apos;s
                        DKIM. Your incoming mail is untouched.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {(domainDnsQuery.data?.fixes.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <div className="text-sm font-medium text-foreground">
                      How to fix your DNS
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Records already in your DNS conflict with the ones we
                      need. Apply these changes in order — they only touch the
                      quoted records, never anything else.
                    </p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-foreground">
                      {domainDnsQuery.data?.fixes.map((fix) => (
                        <li key={fix}>{fix}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {domainDnsRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-6 text-sm text-muted-foreground">
                    DNS records are not available yet for this domain.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {domainDnsRecords.map((record) => {
                      return (
                        <div
                          key={record.id}
                          className="rounded-2xl border border-border/60 bg-background/60 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {record.type}
                            </div>
                            {/* Pass/Fail only when the backend reported it
                                for this record — never inferred. */}
                            {record.verified === true ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone("verified")}`}
                              >
                                Pass
                              </span>
                            ) : record.verified === false ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone("failed")}`}
                              >
                                Fail
                              </span>
                            ) : record.verificationLabel ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSenderStatusTone("pending")}`}
                              >
                                {record.verificationLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 space-y-2">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Host
                              </div>
                              <div className="mt-1 flex items-start gap-1.5">
                                <code className="block min-w-0 flex-1 break-all rounded-lg bg-muted px-2 py-1 text-xs text-foreground">
                                  {record.host}
                                </code>
                                <CopyButton
                                  value={record.host}
                                  label="Copy host"
                                />
                              </div>
                            </div>
                            {/* Three layers when the backend provides them:
                                what's live now, the safe-to-paste value, and
                                (below) the surgical conflict steps. */}
                            {record.current !== undefined ? (
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Current in your DNS
                                </div>
                                {record.current.length === 0 ? (
                                  <div className="mt-1 rounded-lg border border-dashed border-border/70 px-2 py-1 text-xs italic text-muted-foreground">
                                    Nothing published yet
                                  </div>
                                ) : (
                                  <div className="mt-1 space-y-1">
                                    {record.current.map((liveValue) => (
                                      <code
                                        key={liveValue}
                                        className="block min-w-0 break-all rounded-lg bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                                      >
                                        {liveValue}
                                      </code>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            <div>
                              <div className="text-xs text-muted-foreground">
                                {record.recommended !== undefined ||
                                record.current !== undefined
                                  ? "Recommended"
                                  : "Value"}
                              </div>
                              <div className="mt-1 flex items-start gap-1.5">
                                <code className="block min-w-0 flex-1 break-all rounded-lg bg-muted px-2 py-1 text-xs text-foreground">
                                  {record.recommended ?? record.value}
                                </code>
                                <CopyButton
                                  value={record.recommended ?? record.value}
                                  label="Copy value"
                                />
                              </div>
                            </div>
                            {record.ttl || record.priority ? (
                              <div className="text-xs text-muted-foreground">
                                {[
                                  record.ttl ? `TTL ${record.ttl}` : null,
                                  record.priority
                                    ? `Priority ${record.priority}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                            ) : null}
                            {record.conflict ? (
                              <div
                                className={`rounded-xl border p-3 text-xs leading-5 ${
                                  record.conflict.informational
                                    ? "border-border/70 bg-muted/30 text-muted-foreground"
                                    : "border-amber-500/40 bg-amber-500/10 text-foreground"
                                }`}
                              >
                                <div className="font-medium">
                                  {record.conflict.informational
                                    ? "Heads up — existing record found"
                                    : "Conflicting DNS record found"}
                                </div>
                                {record.conflict.reason ? (
                                  <p className="mt-1 text-muted-foreground">
                                    {record.conflict.reason}
                                  </p>
                                ) : null}
                                {record.conflict.actions.length > 0 ? (
                                  <div className="mt-2 space-y-1.5">
                                    {record.conflict.actions.map((action) => (
                                      <div
                                        key={[
                                          action.action,
                                          action.type,
                                          action.host,
                                          action.currentValue,
                                          action.newValue,
                                        ]
                                          .filter(Boolean)
                                          .join("|")}
                                        className="flex flex-wrap items-center gap-1.5"
                                      >
                                        <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
                                          {action.action}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {[action.type, action.host]
                                            .filter(Boolean)
                                            .join(" @ ")}
                                        </span>
                                        {action.currentValue ? (
                                          <code className="max-w-full break-all rounded bg-muted px-1.5 py-0.5 text-[11px] line-through opacity-70">
                                            {action.currentValue}
                                          </code>
                                        ) : null}
                                        {action.newValue ? (
                                          <span className="flex min-w-0 items-center gap-1">
                                            <code className="max-w-full break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">
                                              {action.newValue}
                                            </code>
                                            <CopyButton
                                              value={action.newValue}
                                              label="Copy value"
                                            />
                                          </span>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : record.conflict.resolution ? (
                                  <p className="mt-1">
                                    {record.conflict.resolution}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDomainDnsDialog({ open: false, domainId: null, domain: "" })
              }
            >
              Close
            </Button>
            {/* Auto-configure DNS is disabled for now: the backend supports
                POST /domain/{id}/dns/auto for Cloudflare, GoDaddy, Namecheap,
                and Porkbun, but the per-provider `credentials` payload isn't
                documented yet — re-enable once that contract is pinned down.
            <Button
              variant="outline"
              disabled={
                !domainDnsDialog.domainId ||
                autoConfigureDomainDnsMutation.isPending ||
                !canManageSenderIdentities
              }
              onClick={() => {
                if (!domainDnsDialog.domainId) return;
                autoConfigureDomainDnsMutation.mutate(domainDnsDialog.domainId);
              }}
            >
              {autoConfigureDomainDnsMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Auto-configure DNS
            </Button>
            */}
            <Button
              disabled={
                !domainDnsDialog.domainId ||
                recheckDomainMutation.isPending ||
                !canManageSenderIdentities
              }
              onClick={() => {
                if (!domainDnsDialog.domainId) return;
                recheckDomainMutation.mutate(domainDnsDialog.domainId);
              }}
            >
              {recheckDomainMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <ArrowPathIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              Recheck domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
