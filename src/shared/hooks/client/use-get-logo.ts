import useSWR from "swr";

import { authClient } from "@/lib/auth-client";
import { resolveBrandAssetUrl } from "@/lib/brand-assets";
import { isOrganizationConfirmed } from "@/lib/utils";

export interface LogoSet {
  lightIcon: string;
  darkIcon: string;
  lightFull: string;
  darkFull: string;
  favicon?: string;
  /** True when any of the URLs come from org branding (may be remote/backend-hosted). */
  isCustom: boolean;
}

export const readBrandingData = (branding: unknown) => {
  const root =
    branding &&
    typeof branding === "object" &&
    "success" in branding &&
    "data" in branding
      ? (branding as { success?: boolean; data?: Record<string, unknown> }).data
      : undefined;
  const data = root && typeof root === "object" ? root : undefined;
  const preview =
    data?.logoPreview && typeof data.logoPreview === "object"
      ? (data.logoPreview as Record<string, unknown>)
      : undefined;

  // Branding URLs can be backend-relative - resolve them here so every
  // consumer gets a URL the browser can actually load.
  return {
    primary: resolveBrandAssetUrl(
      preview?.primaryUrl,
      data?.primaryLogoUrl,
      data?.primaryLogo,
      data?.logoUrl,
      data?.logo
    ),
    dark: resolveBrandAssetUrl(
      preview?.darkUrl,
      data?.darkLogoUrl,
      data?.darkModeLogo,
      data?.darkLogo
    ),
    favicon: resolveBrandAssetUrl(
      preview?.faviconUrl,
      data?.faviconUrl,
      data?.favicon
    ),
  };
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return { success: false, status: res.status };
  try {
    return await res.json();
  } catch {
    return { success: false };
  }
};

export const defaultLogos = {
  lightIcon:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1761093444/onchain_suite_bf926w.png",
  darkIcon:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1761094220/onchain_light_wylceb.png",
  // Full horizontal wordmark. OS-light = dark ink (for light surfaces),
  // OS-dark = white (for dark surfaces). Current brand typeface.
  lightFull:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787936849/OS-light_srclgr.png",
  darkFull:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787936849/OS-dark_wdb06l.png",
};

export const useGetLogo = (): LogoSet => {
  const { data: session } = authClient.useSession();
  const activeOrganizationId = session?.session?.activeOrganizationId ?? null;
  const confirmed = isOrganizationConfirmed(activeOrganizationId);
  const { data: branding } = useSWR(
    confirmed ? "/api/v1/organization/branding" : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  if (!branding?.success || !branding?.data) {
    return { ...defaultLogos, isCustom: false };
  }

  const { primary, dark, favicon } = readBrandingData(branding);

  // Prefer the org's variant for the active theme, then the org's other
  // variant, and only then the platform logo.
  return {
    lightIcon: primary ?? dark ?? defaultLogos.lightIcon,
    darkIcon: dark ?? primary ?? defaultLogos.darkIcon,
    lightFull: primary ?? dark ?? defaultLogos.lightFull,
    darkFull: dark ?? primary ?? defaultLogos.darkFull,
    favicon: favicon ?? primary ?? defaultLogos.lightIcon,
    isCustom: Boolean(primary ?? dark ?? favicon),
  };
};
