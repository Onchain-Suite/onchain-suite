"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { resolveBrandAssetUrl } from "@/lib/brand-assets";
import { isJsonObject } from "@/lib/utils";

import ColorPicker from "../color-picker";
import LogoUpload from "../logo-upload";
import { DefinitionGrid, SettingsCard } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import { Button } from "@/shared/components/ui/button";

/** Fallback accent when the org hasn't set a brand colour. */
const DEFAULT_ACCENT = "#FF6828";

const brandingKey = (orgId: string | null) =>
  ["account", "branding", orgId] as const;

function brandingRoot(payload: unknown): Record<string, unknown> | undefined {
  return isJsonObject(payload)
    ? isJsonObject(payload.data)
      ? payload.data
      : payload
    : undefined;
}

function resolvePrimaryLogo(payload: unknown): string | null {
  const root = brandingRoot(payload);
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

/** Read the saved brand/accent colour, normalised to a `#rrggbb` string. */
function resolveAccent(payload: unknown): string | null {
  const root = brandingRoot(payload);
  if (!root) return null;
  const colors = isJsonObject(root.colors) ? root.colors : undefined;
  const raw =
    (typeof root.brandColor === "string" && root.brandColor) ||
    (typeof root.accentColor === "string" && root.accentColor) ||
    (typeof colors?.primary === "string" && colors.primary) ||
    "";
  const trimmed = raw.trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function BrandingCard() {
  const { organizationId, orgHeaders } = useAccountOrg();
  const queryClient = useQueryClient();
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const brandingQuery = useQuery({
    queryKey: brandingKey(organizationId),
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get("/organization/branding", {
        headers: orgHeaders,
      });
      return {
        logoUrl: resolvePrimaryLogo(res.data),
        accent: resolveAccent(res.data),
      };
    },
  });

  const logoUrl = brandingQuery.data?.logoUrl ?? null;
  const accent = brandingQuery.data?.accent ?? DEFAULT_ACCENT;

  const accentMutation = useMutation({
    mutationFn: (brandColor: string) =>
      apiClient.put(
        "/organization/branding/colors",
        { brandColor },
        { headers: orgHeaders }
      ),
    onSuccess: () => {
      toast.success("Accent colour updated");
      queryClient.invalidateQueries({ queryKey: brandingKey(organizationId) });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't update the accent colour"
      ),
  });

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
          Edit logo
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
                <button
                  type="button"
                  onClick={() => setColorOpen(true)}
                  disabled={!organizationId || accentMutation.isPending}
                  aria-label="Edit accent colour"
                  className="h-4 w-4 shrink-0 rounded ring-1 ring-border transition-transform hover:scale-110 disabled:cursor-not-allowed"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono uppercase">{accent}</span>
                <button
                  type="button"
                  onClick={() => setColorOpen(true)}
                  disabled={!organizationId || accentMutation.isPending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
                >
                  {accentMutation.isPending ? "Saving…" : "Edit"}
                </button>
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

      <ColorPicker
        open={colorOpen}
        onOpenChange={setColorOpen}
        type="primary"
        defaultColor={accent}
        onColorChange={(color) => accentMutation.mutate(color)}
      />
    </SettingsCard>
  );
}

export default BrandingCard;
