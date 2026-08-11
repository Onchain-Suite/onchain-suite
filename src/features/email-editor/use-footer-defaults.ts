"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { resolveBrandAssetUrl } from "@/lib/brand-assets";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { projectSettingsService } from "@/features/settings/project-settings.service";

export interface FooterDefaults {
  companyName: string;
  companyAddress: string;
  logoUrl: string;
}

/** Pull the org's primary logo from `GET /organization/branding`, mirroring the
 *  resolution the settings Branding card uses. */
function resolvePrimaryLogo(payload: unknown): string {
  const root = isJsonObject(payload)
    ? isJsonObject(payload.data)
      ? payload.data
      : payload
    : undefined;
  if (!root) return "";
  const preview = isJsonObject(root.logoPreview) ? root.logoPreview : undefined;
  const logos = isJsonObject(root.logos) ? root.logos : undefined;
  const candidate =
    preview?.primaryUrl ??
    root.primaryLogoUrl ??
    logos?.primary ??
    root.logoUrl;
  return (
    resolveBrandAssetUrl(typeof candidate === "string" ? candidate : "") ?? ""
  );
}

/**
 * The org's company name, postal address and logo, used to auto-populate the
 * email compliance footer on first load. Fails soft to empty strings so the
 * editor never blocks on it.
 */
export function useFooterDefaults() {
  const orgId = getSelectedOrganizationId() ?? undefined;

  return useQuery<FooterDefaults>({
    queryKey: ["email-editor", "footer-defaults", orgId ?? null],
    enabled: Boolean(orgId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [settings, branding] = await Promise.all([
        projectSettingsService
          .getProjectSettings(orgId, { silent: true })
          .catch(() => null),
        apiClient
          .get("/organization/branding", {
            headers: {
              "x-onchain-silent-error": "1",
              ...(orgId ? { "x-org-id": orgId } : {}),
            },
          })
          .then((res) => res.data)
          .catch(() => null),
      ]);
      return {
        companyName: settings?.name?.trim() ?? "",
        companyAddress: settings?.address?.trim() ?? "",
        logoUrl: resolvePrimaryLogo(branding),
      };
    },
  });
}
