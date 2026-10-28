/**
 * Pure helpers for organization creation (onboarding revamp).
 *
 * Extracted verbatim from the original `organization-setup-step.tsx` so the create flow and its
 * 409 / slug / foreign-key recovery can be reused by the guided wizard without a rewrite. No
 * React, no network: safe to import and unit-test on its own.
 */

import { isJsonObject } from "@/lib/utils";

/** Prefix a bare domain with https:// and return a canonical URL, or undefined if unparseable. */
export const normalizeWebsiteUrl = (input?: string): string | undefined => {
  const raw = (input ?? "").trim();
  if (!raw) return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return undefined;
  }
};

/** First non-empty, trimmed string from the arguments, else undefined. */
export const pickNonEmptyString = (
  ...values: unknown[]
): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
};

/** Pull `{ status, message }` out of an axios-shaped error, unwrapping the backend envelope. */
export const extractAxiosError = (
  error: unknown
): { status?: number; message: string } => {
  const err = error as {
    message?: unknown;
    response?: { status?: unknown; data?: unknown };
  };
  const status =
    typeof err.response?.status === "number" ? err.response.status : undefined;
  const data = err.response?.data;
  const dataObj = isJsonObject(data) ? data : undefined;
  const nestedError = isJsonObject(dataObj?.error) ? dataObj.error : undefined;
  const message =
    pickNonEmptyString(
      isJsonObject(nestedError) ? nestedError.message : undefined,
      dataObj?.message,
      dataObj?.error,
      err.message
    ) ?? "";
  return { status, message };
};

/**
 * Find an existing org id in a `GET /organization/list` payload that matches the name or slug we
 * just tried to create. Used to recover from a 409 by adopting the org that already exists.
 */
export const findExistingOrganizationId = (
  payload: unknown,
  expectedName: string,
  expectedSlug: string
): string | null => {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const list = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.data)
      ? root.data
      : isJsonObject(root) &&
          isJsonObject(root.data) &&
          Array.isArray(root.data.data)
        ? root.data.data
        : [];

  if (!Array.isArray(list)) return null;

  const nameLower = expectedName.toLowerCase().trim();
  const slugLower = expectedSlug.toLowerCase().trim();

  const match = list.find((org) => {
    const orgObj = isJsonObject(org) ? org : {};
    const orgName = String(orgObj.name ?? "")
      .toLowerCase()
      .trim();
    const orgSlug = String(orgObj.slug ?? "")
      .toLowerCase()
      .trim();
    return (
      (slugLower && orgSlug === slugLower) ||
      (nameLower && orgName === nameLower)
    );
  });

  const matchObj = isJsonObject(match) ? match : undefined;
  const id = matchObj?.id ?? matchObj?.organizationId ?? null;
  return typeof id === "string" && id.length > 0 ? id : null;
};

/**
 * The id of ANY organization the user already belongs to, from a
 * `GET /organization/list` payload (whatever envelope it uses), or null when
 * they have none. Used to reuse an existing org on an onboarding retry instead
 * of minting a duplicate - one org per user, regardless of name/slug.
 */
export const firstOrganizationId = (payload: unknown): string | null => {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const list = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.data)
      ? root.data
      : isJsonObject(root) &&
          isJsonObject(root.data) &&
          Array.isArray(root.data.data)
        ? root.data.data
        : [];

  for (const org of Array.isArray(list) ? list : []) {
    const orgObj = isJsonObject(org) ? org : {};
    const id = orgObj.id ?? orgObj.organizationId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
};

/** A slug with a short random suffix, to retry past a name/slug collision. */
export const generateUniqueSlug = (baseSlug: string): string => {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${baseSlug}-${suffix}`;
};

/** Lowercase, hyphenate and trim a name into a URL-safe slug. */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
