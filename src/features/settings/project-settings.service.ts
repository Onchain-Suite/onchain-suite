"use client";

import type { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

export interface ProjectSettingsAddressRow {
  chain?: string;
  address: string;
  label?: string;
  icon?: string | null;
}

/**
 * A GoldRush-supported chain from
 * `GET /organization/project-settings/supported-chains`. The settings chain
 * pickers must be rendered from this (single source of truth) and store the
 * `slug`, so `PUT /organization/project-settings` never returns
 * `UNSUPPORTED_CHAINS`.
 */
export interface SupportedChain {
  slug: string;
  label: string;
  family: string;
  testnet: boolean;
  foundational?: boolean;
  streaming?: boolean;
  streamingChainName?: string | null;
  aliases?: string[];
}

export interface ProjectSettingsFormData {
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  timezone: string;
  tokenTicker: string;
  primaryChains: string[];
  contractAddresses: ProjectSettingsAddressRow[];
  treasuryWallets: ProjectSettingsAddressRow[];
  teamWallets: ProjectSettingsAddressRow[];
}

const DEFAULT_PROJECT_SETTINGS: ProjectSettingsFormData = {
  name: "",
  email: "",
  phone: "",
  taxId: "",
  address: "",
  timezone: "UTC",
  tokenTicker: "",
  primaryChains: [],
  contractAddresses: [],
  treasuryWallets: [],
  teamWallets: [],
};

const unwrapData = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
};

const normalizeAddressRows = (
  value: unknown,
  options?: { requireChain?: boolean }
): ProjectSettingsAddressRow[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!isJsonObject(entry)) return null;
      const row = entry as Record<string, unknown>;
      const chain = pickString(row.chain, row.network);
      const address = pickString(
        row.address,
        row.contractAddress,
        row.walletAddress
      );
      const label = pickString(row.label, row.name);
      if (address.length === 0) return null;
      if (options?.requireChain && chain.length === 0) return null;
      return {
        ...(chain ? { chain } : {}),
        address,
        ...(label ? { label } : {}),
      } satisfies ProjectSettingsAddressRow;
    })
    .filter((row): row is ProjectSettingsAddressRow => Boolean(row));
};

const normalizeSupportedChains = (payload: unknown): SupportedChain[] => {
  const root = unwrapData(payload);
  const arr =
    isJsonObject(root) && Array.isArray(root.chains)
      ? root.chains
      : Array.isArray(root)
        ? root
        : [];
  return arr
    .map((entry): SupportedChain | null => {
      if (!isJsonObject(entry)) return null;
      const slug = pickString(entry.slug, entry.chain, entry.name);
      if (!slug) return null;
      return {
        slug,
        label: pickString(entry.label, entry.name) || slug,
        family: pickString(entry.family) || "evm",
        testnet: Boolean(entry.testnet),
        foundational:
          typeof entry.foundational === "boolean"
            ? entry.foundational
            : undefined,
        streaming:
          typeof entry.streaming === "boolean" ? entry.streaming : undefined,
        streamingChainName: pickString(entry.streamingChainName) || null,
        aliases: toStringArray(entry.aliases),
      };
    })
    .filter((c): c is SupportedChain => Boolean(c));
};

const normalizeLegacyOrganization = (
  payload: unknown
): ProjectSettingsFormData => {
  const root = unwrapData(payload);
  const org = isJsonObject(root) ? root : {};
  const settings = isJsonObject(org.settings) ? org.settings : {};
  const metadata = isJsonObject(org.metadata) ? org.metadata : {};
  const projectMeta = isJsonObject(metadata.project)
    ? metadata.project
    : isJsonObject(metadata.protocol)
      ? metadata.protocol
      : {};

  return {
    name: pickString(org.name, projectMeta.projectName),
    email: pickString(settings.billingEmail),
    phone: pickString(settings.phone),
    taxId: pickString(settings.taxId),
    address: pickString(settings.address),
    timezone: pickString(settings.timezone) || "UTC",
    tokenTicker: pickString(projectMeta.tokenTicker),
    primaryChains: toStringArray(projectMeta.primaryChains),
    contractAddresses: normalizeAddressRows(
      projectMeta.contractAddresses ?? projectMeta.contracts,
      { requireChain: true }
    ),
    treasuryWallets: normalizeAddressRows(
      projectMeta.treasuryWallets ?? projectMeta.treasury
    ),
    teamWallets: normalizeAddressRows(
      projectMeta.teamWallets ?? projectMeta.deployerWallets
    ),
  };
};

export const normalizeProjectSettings = (
  payload: unknown
): ProjectSettingsFormData => {
  const root = unwrapData(payload);
  if (!isJsonObject(root)) return { ...DEFAULT_PROJECT_SETTINGS };

  const contractAddresses = normalizeAddressRows(
    root.contractAddresses ?? root.contracts,
    { requireChain: true }
  );
  const treasuryWallets = normalizeAddressRows(
    root.treasuryWallets ?? root.treasury
  );
  const teamWallets = normalizeAddressRows(
    root.teamWallets ?? root.deployerWallets
  );

  return {
    name: pickString(root.projectName, root.name),
    email: pickString(root.billingEmail),
    phone: pickString(root.phone),
    taxId: pickString(root.taxId),
    address: pickString(root.address),
    timezone: pickString(root.timezone) || "UTC",
    tokenTicker: pickString(root.tokenTicker),
    primaryChains: toStringArray(root.primaryChains),
    contractAddresses,
    treasuryWallets,
    teamWallets,
  };
};

const getHeaders = (organizationId?: string) => {
  const orgId = organizationId ?? getSelectedOrganizationId() ?? null;
  return {
    ...(orgId ? { "x-org-id": orgId } : {}),
    "x-onchain-silent-error": "1",
  };
};

const sanitizeRows = (
  rows: ProjectSettingsAddressRow[],
  options?: { requireChain?: boolean }
) => {
  return rows
    .map((row) => ({
      chain: pickString(row.chain),
      address: pickString(row.address),
      label: pickString(row.label),
    }))
    .filter((row) => {
      if (row.address.length === 0) return false;
      if (options?.requireChain && row.chain.length === 0) return false;
      return true;
    })
    .map((row) => ({
      ...(row.chain ? { chain: row.chain } : {}),
      address: row.address,
      ...(row.label ? { label: row.label } : {}),
    }));
};

// Only the fields the backend's project-settings schema accepts. `treasuryWallets`
// and `teamWallets` were removed server-side, and empty optional scalars (e.g.
// "" billingEmail / phone) fail validation - so omit anything empty and always
// send the arrays (so the user can clear them).
const toSavePayload = (values: ProjectSettingsFormData) => {
  const payload: Record<string, unknown> = {
    primaryChains: toStringArray(values.primaryChains),
    contractAddresses: sanitizeRows(values.contractAddresses, {
      requireChain: true,
    }),
  };
  const optional: Array<[string, string]> = [
    ["projectName", pickString(values.name)],
    ["billingEmail", pickString(values.email)],
    ["tokenTicker", pickString(values.tokenTicker)],
    ["phone", pickString(values.phone)],
    ["taxId", pickString(values.taxId)],
    ["timezone", pickString(values.timezone)],
    ["address", pickString(values.address)],
  ];
  for (const [key, value] of optional) {
    if (value.length > 0) payload[key] = value;
  }
  return payload;
};

const messageFromObject = (
  obj: Record<string, unknown>
): string | undefined => {
  // GoldRush chain rejection
  if (
    obj.code === "UNSUPPORTED_CHAINS" &&
    Array.isArray(obj.unsupportedChains)
  ) {
    const bad = obj.unsupportedChains
      .filter((c): c is string => typeof c === "string")
      .join(", ");
    if (bad) return `Unsupported chains: ${bad}`;
  }
  // Nest validation: message is often a string[] of field errors
  if (Array.isArray(obj.message)) {
    const parts = obj.message.filter((m): m is string => typeof m === "string");
    if (parts.length > 0) return parts.join("; ");
  }
  if (typeof obj.message === "string" && obj.message.trim().length > 0) {
    return obj.message;
  }
  return undefined;
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const err = error as AxiosError<unknown>;
  const data = err.response?.data;
  let message: string | undefined;
  if (isJsonObject(data)) {
    if (isJsonObject(data.error)) message = messageFromObject(data.error);
    message = message ?? messageFromObject(data);
  } else if (typeof data === "string" && data.trim().length > 0) {
    message = data;
  }
  message = message ?? err.message;
  return typeof message === "string" && message.trim().length > 0
    ? message
    : fallback;
};

export const projectSettingsService = {
  async getSupportedChains(organizationId?: string): Promise<SupportedChain[]> {
    const response = await apiClient.get(
      "/organization/project-settings/supported-chains",
      { headers: getHeaders(organizationId) }
    );
    return normalizeSupportedChains(response.data);
  },

  async getProjectSettings(organizationId?: string) {
    try {
      const response = await apiClient.get("/organization/project-settings", {
        headers: getHeaders(organizationId),
      });
      return normalizeProjectSettings(response.data);
    } catch (error) {
      try {
        const fallback = await apiClient.get("/organization", {
          headers: getHeaders(organizationId),
        });
        return normalizeLegacyOrganization(fallback.data);
      } catch {
        throw new Error(
          extractErrorMessage(error, "Failed to load project settings")
        );
      }
    }
  },

  async saveProjectSettings(
    values: ProjectSettingsFormData,
    organizationId?: string
  ) {
    try {
      const payload = toSavePayload(values);
      const response = await apiClient.put(
        "/organization/project-settings",
        payload,
        {
          headers: getHeaders(organizationId),
        }
      );
      const normalized = normalizeProjectSettings(response.data);
      return {
        ...values,
        ...normalized,
        name: normalized.name || pickString(values.name),
        email: normalized.email || pickString(values.email),
      } satisfies ProjectSettingsFormData;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to update project settings"),
        {
          cause: error,
        }
      );
    }
  },
};
