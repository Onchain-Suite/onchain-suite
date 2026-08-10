"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId } from "@/lib/utils";

export type OrgRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

/**
 * The current user's role in the selected organization, from
 * `GET /organization/list` (each org row carries the caller's `role`).
 * `null` while loading or when no org is selected - callers gating
 * owner-only UI should treat `null` as "not owner" so restricted surfaces
 * never flash for members. Enforcement lives in the backend
 * (billing is OWNER-guarded); this hook is cosmetic gating only.
 */
export function useMyOrgRole(): { role: OrgRole | null; loading: boolean } {
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const orgId = getSelectedOrganizationId();
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiClient.get("/organization/list");
        const payload: unknown = res.data;
        const root =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : payload;
        const rows = Array.isArray(root)
          ? (root as Array<{ id: string; role?: string }>)
          : [];
        const mine = rows.find((o) => o.id === orgId);
        const r = (mine?.role ?? "").toUpperCase();
        if (!cancelled) {
          setRole(
            r === "OWNER" || r === "ADMIN" || r === "EDITOR" || r === "VIEWER"
              ? (r as OrgRole)
              : null
          );
        }
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}
