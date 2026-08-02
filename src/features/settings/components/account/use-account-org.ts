"use client";

import { useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

/**
 * Resolve the active organization id (selection cookie → session's active org)
 * and the `x-org-id` request headers, re-syncing when the org switcher fires
 * `onchain:org-changed`. Shared by every Account card so each can own its own
 * queries/mutations without threading org context through props.
 */
export function useAccountOrg() {
  const { data: session } = authClient.useSession();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSelectedOrgId(getSelectedOrganizationId());
    sync();
    window.addEventListener("onchain:org-changed", sync);
    return () => window.removeEventListener("onchain:org-changed", sync);
  }, []);

  const organizationId = useMemo(() => {
    const trimmed = selectedOrgId?.trim();
    return (
      (trimmed && trimmed.length > 0
        ? trimmed
        : session?.session?.activeOrganizationId) ?? null
    );
  }, [selectedOrgId, session?.session?.activeOrganizationId]);

  const orgHeaders = useMemo(
    () =>
      organizationId
        ? { "x-org-id": organizationId, "x-onchain-silent-error": "1" }
        : undefined,
    [organizationId]
  );

  return { organizationId, orgHeaders, session };
}
