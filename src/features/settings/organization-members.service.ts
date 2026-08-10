"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the organization members + invites API family
 * (docs/backend.md - "Organization Members", 2026-07-14 follow-up 4).
 * Owns the URLs, the `x-org-id` header, `{ success, data }` envelope
 * unwrapping, and the normalized member/invite shapes consumed by the
 * settings Team members section and the invite-accept page.
 *
 * Backend guarantees worth knowing: the org creator is automatically OWNER,
 * owners cannot be downgraded/removed by others (last-owner protection), and
 * invite creation/resend is rate-limited at 5 requests per minute.
 */

export type OrganizationRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

/** Roles that can be assigned via invite or role change (OWNER is not). */
export type AssignableRole = "ADMIN" | "EDITOR" | "VIEWER";

export interface MemberPermissions {
  canManageMembers: boolean;
  canManageSenderIdentities: boolean;
  canEditCampaigns: boolean;
  canSendEmail: boolean;
  canLaunchCampaigns: boolean;
  canViewSettings: boolean;
}

/** Normalized row from `GET /organizations/{orgId}/members`. */
export interface OrganizationMember {
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  roleLabel: string;
  twoFactorEnabled: boolean;
  isEnabled: boolean;
  avatarUrl: string | null;
  joinedAt: string | null;
  permissions: MemberPermissions | null;
}

/** Normalized row from `GET /organizations/{orgId}/invites`. */
export interface OrganizationInvite {
  id: string;
  email: string;
  role: OrganizationRole;
  roleLabel: string;
  /** Planned permissions for the invited role (backend-provided). */
  permissions: MemberPermissions | null;
}

export interface ListMembersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UpdateMemberBody {
  role?: AssignableRole;
  isEnabled?: boolean;
}

export interface CreateInviteBody {
  email: string;
  role: AssignableRole;
}

/** Best-effort typed result of `POST /invites/{token}/accept`. */
export interface AcceptInviteResult {
  organizationId: string | null;
  organizationName: string | null;
  role: OrganizationRole | null;
}

/**
 * Error thrown by every method in this service. Carries the HTTP status so
 * callers can special-case rate limits (429), expired/invalid invites, etc.
 */
export class OrganizationMembersError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message, { cause });
    this.name = "OrganizationMembersError";
    this.status = status;
  }
}

/** True when the error is the invite endpoints' 5/min rate limit. */
export const isRateLimitError = (error: unknown): boolean =>
  error instanceof OrganizationMembersError && error.status === 429;

export const INVITE_RATE_LIMIT_MESSAGE =
  "Invite limit reached - you can send up to 5 invite emails per minute. Please wait a moment and try again.";

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string | null
): Promise<T> => {
  const resolvedOrgId = orgId === null ? null : pickOrgId(orgId);
  const headers = {
    ...(config.headers ?? {}),
    ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
    "x-onchain-silent-error": "1",
  };

  try {
    const res = await apiClient.request<T>({ ...config, headers });
    return extractData<T>(res.data);
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const status = err.response?.status ?? null;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const backendMessage = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : undefined;
    const message =
      status === 429
        ? INVITE_RATE_LIMIT_MESSAGE
        : typeof backendMessage === "string" && backendMessage.length > 0
          ? backendMessage
          : (err.message ?? "Organization members request failed");
    throw new OrganizationMembersError(String(message), status, e);
  }
};

const toArray = (payload: unknown): unknown[] => {
  const root = extractData<unknown>(payload);
  if (Array.isArray(root)) return root;
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items;
  if (isJsonObject(root) && Array.isArray(root.members)) return root.members;
  if (isJsonObject(root) && Array.isArray(root.invites)) return root.invites;
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data;
  return [];
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const pickBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return undefined;
};

const normalizeRole = (value: unknown): OrganizationRole => {
  const normalized = pickString(value)?.toUpperCase();
  if (
    normalized === "OWNER" ||
    normalized === "ADMIN" ||
    normalized === "EDITOR" ||
    normalized === "VIEWER"
  ) {
    return normalized;
  }
  return "VIEWER";
};

const normalizeRoleLabel = (value: unknown, role: OrganizationRole) => {
  const label = pickString(value);
  if (label) return label;
  return role.charAt(0) + role.slice(1).toLowerCase();
};

const normalizePermissions = (value: unknown): MemberPermissions | null => {
  if (!isJsonObject(value)) return null;
  return {
    canManageMembers: pickBoolean(value.canManageMembers) ?? false,
    canManageSenderIdentities:
      pickBoolean(value.canManageSenderIdentities) ?? false,
    canEditCampaigns: pickBoolean(value.canEditCampaigns) ?? false,
    canSendEmail: pickBoolean(value.canSendEmail) ?? false,
    canLaunchCampaigns: pickBoolean(value.canLaunchCampaigns) ?? false,
    canViewSettings: pickBoolean(value.canViewSettings) ?? false,
  };
};

/** Normalize `GET /organizations/{orgId}/members` rows. */
export const normalizeMembers = (payload: unknown): OrganizationMember[] =>
  toArray(payload)
    .map((entry, index) => {
      if (!isJsonObject(entry)) return null;
      // Member rows arrive flat ({email, name}) or better-auth style with a
      // nested user ({role, user: {email, name, image}}) - dropping nested
      // rows made owners see only themselves in the team list.
      const user = isJsonObject(entry.user) ? entry.user : undefined;
      const email = pickString(entry.email, entry.userEmail, user?.email);
      if (!email) return null;
      const role = normalizeRole(entry.role ?? entry.roleLabel);
      return {
        userId:
          pickString(entry.userId, user?.id, entry.id) ?? `${email}-${index}`,
        name:
          pickString(entry.name, entry.fullName, entry.userName, user?.name) ??
          email,
        email,
        role,
        roleLabel: normalizeRoleLabel(entry.roleLabel, role),
        twoFactorEnabled:
          pickBoolean(
            entry.twoFactorEnabled,
            entry.twoFAEnabled,
            user?.twoFactorEnabled
          ) ?? false,
        isEnabled: pickBoolean(entry.isEnabled, entry.enabled) ?? true,
        avatarUrl:
          pickString(entry.avatarUrl, entry.image, user?.image) ?? null,
        joinedAt: pickString(entry.joinedAt, entry.createdAt) ?? null,
        permissions: normalizePermissions(entry.permissions),
      } satisfies OrganizationMember;
    })
    .filter((row): row is OrganizationMember => Boolean(row));

/** Normalize `GET /organizations/{orgId}/invites` rows. */
export const normalizeInvites = (payload: unknown): OrganizationInvite[] =>
  toArray(payload)
    .map((entry, index) => {
      if (!isJsonObject(entry)) return null;
      const email = pickString(entry.email);
      if (!email) return null;
      const role = normalizeRole(entry.role ?? entry.roleLabel);
      return {
        id: pickString(entry.id, entry.inviteId) ?? `${email}-${index}`,
        email,
        role,
        roleLabel: normalizeRoleLabel(entry.roleLabel, role),
        permissions: normalizePermissions(
          entry.plannedPermissions ?? entry.permissions
        ),
      } satisfies OrganizationInvite;
    })
    .filter((row): row is OrganizationInvite => Boolean(row));

export const organizationMembersService = {
  /** `GET /organizations/{orgId}/members` - paginated, searchable. */
  async listMembers(
    orgId: string,
    params?: ListMembersParams
  ): Promise<OrganizationMember[]> {
    const payload = await request<unknown>(
      {
        method: "GET",
        url: `/organizations/${orgId}/members`,
        params: {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
        },
      },
      orgId
    );
    return normalizeMembers(payload);
  },

  /**
   * `PATCH /organizations/{orgId}/members/{userId}` - change role and/or
   * enabled status. Owners cannot be downgraded (backend-enforced).
   */
  updateMember(orgId: string, userId: string, body: UpdateMemberBody) {
    return request<unknown>(
      {
        method: "PATCH",
        url: `/organizations/${orgId}/members/${userId}`,
        data: body,
      },
      orgId
    );
  },

  /** `DELETE /organizations/{orgId}/members/{userId}` (last-owner protected). */
  removeMember(orgId: string, userId: string) {
    return request<unknown>(
      {
        method: "DELETE",
        url: `/organizations/${orgId}/members/${userId}`,
      },
      orgId
    );
  },

  /**
   * `POST /organizations/{orgId}/invites` - sends a branded invite email.
   * Rate-limited at 5/min; a 429 surfaces {@link INVITE_RATE_LIMIT_MESSAGE}.
   */
  createInvite(orgId: string, body: CreateInviteBody) {
    return request<unknown>(
      {
        method: "POST",
        url: `/organizations/${orgId}/invites`,
        data: body,
      },
      orgId
    );
  },

  /** `GET /organizations/{orgId}/invites` - pending invites. */
  async listInvites(orgId: string): Promise<OrganizationInvite[]> {
    const payload = await request<unknown>(
      { method: "GET", url: `/organizations/${orgId}/invites` },
      orgId
    );
    return normalizeInvites(payload);
  },

  /**
   * `POST /organizations/{orgId}/invites/{inviteId}/resend` - refreshed
   * token + new branded email. Rate-limited at 5/min.
   */
  resendInvite(orgId: string, inviteId: string) {
    return request<unknown>(
      {
        method: "POST",
        url: `/organizations/${orgId}/invites/${inviteId}/resend`,
      },
      orgId
    );
  },

  /**
   * `POST /invites/{token}/accept` - global endpoint (not org-scoped, no
   * `x-org-id` header) that joins the authenticated user to the inviting org.
   */
  async acceptInvite(token: string): Promise<AcceptInviteResult> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: `/invites/${encodeURIComponent(token)}/accept`,
      },
      null
    );
    const data = isJsonObject(payload) ? payload : undefined;
    const organization = isJsonObject(data?.organization)
      ? data.organization
      : undefined;
    const roleRaw = pickString(data?.role);
    return {
      organizationId:
        pickString(data?.organizationId, organization?.id) ?? null,
      organizationName:
        pickString(data?.organizationName, organization?.name, data?.orgName) ??
        null,
      role: roleRaw ? normalizeRole(roleRaw) : null,
    };
  },
};
