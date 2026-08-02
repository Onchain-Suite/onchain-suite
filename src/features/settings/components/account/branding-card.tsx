"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiClient } from "@/lib/api-client";
import { resolveBrandAssetUrl } from "@/lib/brand-assets";
import { isJsonObject } from "@/lib/utils";

import LogoUpload from "../logo-upload";
import { DefinitionGrid, SettingsCard } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import { Button } from "@/shared/components/ui/button";

/** The org's accent — display-only; there is no accent-colour write API yet. */
const ACCENT_COLOUR = "#FF6828";

const brandingKey = (orgId: string | null) =>
  ["account", "branding", orgId] as const;

function resolvePrimaryLogo(payload: unknown): string | null {
  const root = isJsonObject(payload)
    ? isJsonObject(payload.data)
      ? payload.data
      : payload
    : undefined;
  if (!root) return null;
  const preview = isJsonObject(root.logoPreview) ? root.logoPreview : undefined;
  const logos = isJsonObject(root.logos) ? root.logos : undefined;
  const candidate =
    preview?.primaryUrl ??
    root.primaryLogoUrl ??
    logos?.primary ??
    root.logoUrl;
  return (
    resolveBrandAssetUrl(typeof candidate === "string" ? candidate : "") ?? null
  );
}

export function BrandingCard() {
  const { organizationId, orgHeaders } = useAccountOrg();
  const queryClient = useQueryClient();
  const [logoModalOpen, setLogoModalOpen] = useState(false);

  const brandingQuery = useQuery({
    queryKey: brandingKey(organizationId),
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get("/organization/branding", {
        headers: orgHeaders,
      });
      return resolvePrimaryLogo(res.data);
    },
  });

  const logoUrl = brandingQuery.data ?? null;

  return (
    <SettingsCard
      title="Branding"
      description="Appearance across emails and pushes"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogoModalOpen(true)}
          disabled={!organizationId}
        >
          <PencilSquareIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
      }
    >
      <DefinitionGrid
        items={[
          {
            label: "Logo",
            value: logoUrl ? (
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="h-6 w-6 rounded object-contain"
                />
                Custom logo
              </span>
            ) : (
              "Onchain Suite mark"
            ),
          },
          {
            label: "Accent colour",
            value: (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: ACCENT_COLOUR }}
                />
                {ACCENT_COLOUR}
              </span>
            ),
          },
        ]}
      />

      <LogoUpload
        showLogoUploadModal={logoModalOpen}
        setShowLogoUploadModal={setLogoModalOpen}
        logoUploadType="primary"
        onUploaded={() =>
          queryClient.invalidateQueries({
            queryKey: brandingKey(organizationId),
          })
        }
      />
    </SettingsCard>
  );
}

export default BrandingCard;
