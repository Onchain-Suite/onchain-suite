import { NextResponse } from "next/server";

import { isJsonObject } from "@/lib/utils";

import { getBackendBaseUrl } from "./config";

/**
 * Recoveries for organization routes the backend answers awkwardly: a 409 on
 * create (the org exists, so select it), a 409 on list, and a 400 on
 * set-active for an org the caller does belong to. Null when none applies.
 */
export async function handleOrgFallbacks({
  method,
  path,
  upstream,
  body,
  headers,
}: {
  method: string;
  path: string[];
  upstream: Response;
  body: ArrayBuffer | undefined;
  headers: Headers;
}): Promise<NextResponse | null> {
  const isOrganizationSetActive =
    method === "POST" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "set-active";

  const isOrganizationCreate =
    method === "POST" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "create";

  const isOrganizationList =
    method === "GET" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "list";

  if (isOrganizationCreate && upstream.status === 409) {
    const base = getBackendBaseUrl();

    let requestedName = "";
    let requestedSlug = "";
    try {
      const text = body ? new TextDecoder().decode(body) : "";
      const json = text ? JSON.parse(text) : null;
      requestedName = String(json?.name ?? "");
      requestedSlug = String(json?.slug ?? "");
    } catch (_e) {
      String(_e);
    }

    try {
      const listRes = await fetch(`${base}/organization/list`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const listJson = await listRes.json().catch(() => null);
      const list = Array.isArray(listJson)
        ? listJson
        : Array.isArray(listJson?.data)
          ? listJson.data
          : Array.isArray(listJson?.data?.data)
            ? listJson.data.data
            : [];

      const nameLower = requestedName.toLowerCase().trim();
      const slugLower = requestedSlug.toLowerCase().trim();
      const match = Array.isArray(list)
        ? list.find((org) => {
            if (!isJsonObject(org)) return false;
            const orgName = String(org.name ?? "")
              .toLowerCase()
              .trim();
            const orgSlug = String(org.slug ?? "")
              .toLowerCase()
              .trim();
            return (
              (slugLower && orgSlug === slugLower) ||
              (nameLower && orgName === nameLower)
            );
          })
        : null;

      const orgId = isJsonObject(match)
        ? (match.id ?? match.organizationId ?? null)
        : null;

      if (typeof orgId === "string" && orgId.length > 0) {
        await fetch(`${base}/organization/set-active`, {
          method: "POST",
          headers: (() => {
            const h = new Headers(headers);
            if (!h.has("content-type")) {
              h.set("content-type", "application/json");
            }
            return h;
          })(),
          body: JSON.stringify({ organizationId: orgId }),
          cache: "no-store",
        }).catch(() => null);

        return NextResponse.json(
          { success: true, conflict: true, data: match ?? { id: orgId } },
          { status: 200 }
        );
      }
    } catch (_e) {
      String(_e);
    }

    return NextResponse.json(
      {
        success: false,
        conflict: true,
        message: "Organization already exists",
      },
      { status: 200 }
    );
  }

  if (isOrganizationList && upstream.status === 409) {
    try {
      const json = await upstream.clone().json();
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json({ data: [] }, { status: 200 });
    }
  }

  if (isOrganizationSetActive && upstream.status === 400) {
    const base = getBackendBaseUrl();
    const upstreamJson = await upstream
      .clone()
      .json()
      .catch(() => null);
    const upstreamErrorMessage = (() => {
      if (!isJsonObject(upstreamJson)) return "";
      const err = isJsonObject(upstreamJson.error)
        ? upstreamJson.error
        : undefined;
      const nested = isJsonObject(err?.details) ? err.details : undefined;
      const msg =
        (typeof err?.message === "string" ? err.message : "") ||
        (typeof upstreamJson.message === "string"
          ? upstreamJson.message
          : "") ||
        (typeof nested?.message === "string" ? nested.message : "");
      return msg;
    })();

    if (/not a member of organization/i.test(upstreamErrorMessage)) {
      const requestedOrgId = (() => {
        if (!body) return null;
        try {
          const text = new TextDecoder().decode(body);
          const json = text.trim().length > 0 ? JSON.parse(text) : null;
          const raw = isJsonObject(json)
            ? (json.organizationId ??
              json.organization_id ??
              json.orgId ??
              json.org_id ??
              null)
            : null;
          return typeof raw === "string" && raw.trim().length > 0
            ? raw.trim()
            : null;
        } catch {
          return null;
        }
      })();

      if (requestedOrgId) {
        try {
          const listRes = await fetch(`${base}/organization/list`, {
            method: "GET",
            headers,
            cache: "no-store",
          });
          const listJson = await listRes.json().catch(() => null);
          const list = Array.isArray(listJson)
            ? listJson
            : Array.isArray(listJson?.data)
              ? listJson.data
              : Array.isArray(listJson?.data?.data)
                ? listJson.data.data
                : [];

          const found = Array.isArray(list)
            ? list.some(
                (org) =>
                  isJsonObject(org) &&
                  (org.id === requestedOrgId ||
                    org.organizationId === requestedOrgId)
              )
            : false;

          if (found) {
            return NextResponse.json(
              {
                success: true,
                fallback: true,
                data: { organizationId: requestedOrgId },
              },
              { status: 200 }
            );
          }
        } catch (_e) {
          String(_e);
        }
      }
    }
  }

  return null;
}
