import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/** The DM channels that need the client's consent before a bulk send. */
export type DmChannel = "telegram" | "x" | "discord";

export interface DmPreflight {
  channel: DmChannel;
  /** People in the audience the send would message now. */
  reachable: number;
  estimatedDurationSeconds: number;
  cost: {
    provider: string;
    usdPerMessage: number;
    estimatedUsd: number;
    billedTo: "platform" | "client";
  } | null;
  consent: {
    version: string;
    platform: string;
    rule: string;
    risk: string;
    policyUrl: string;
    statements: string[];
    /** True when this send was already accepted at this version (a resume). */
    accepted: boolean;
  };
}

export class DmSendError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null
  ) {
    super(message);
    this.name = "DmSendError";
  }
}

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Normalise GET .../channel-sends/:channel/preflight. Anything the page shows
 * the client as a promise (the rule, the statements) must be present; without
 * them there is nothing to consent to, so the send stays blocked.
 */
export function toDmPreflight(raw: unknown): DmPreflight | null {
  if (!isJsonObject(raw) || !isJsonObject(raw.consent)) return null;
  const channel = str(raw.channel);
  if (channel !== "telegram" && channel !== "x" && channel !== "discord") {
    return null;
  }
  const c = raw.consent;
  const statements = Array.isArray(c.statements)
    ? c.statements.filter((s): s is string => typeof s === "string" && !!s)
    : [];
  const version = str(c.version);
  if (!version || statements.length === 0 || !str(c.rule)) return null;
  const cost = isJsonObject(raw.cost)
    ? {
        provider: str(raw.cost.provider),
        usdPerMessage: num(raw.cost.usdPerMessage),
        estimatedUsd: num(raw.cost.estimatedUsd),
        billedTo:
          raw.cost.billedTo === "platform"
            ? ("platform" as const)
            : ("client" as const),
      }
    : null;
  return {
    channel,
    reachable: Math.floor(num(raw.reachable)),
    estimatedDurationSeconds: num(raw.estimatedDurationSeconds),
    cost,
    consent: {
      version,
      platform: str(c.platform),
      rule: str(c.rule),
      risk: str(c.risk),
      policyUrl: /^https:\/\//.test(str(c.policyUrl)) ? str(c.policyUrl) : "",
      statements,
      accepted:
        c.accepted !== null && c.accepted !== undefined && c.accepted !== false,
    },
  };
}

function toError(e: unknown): DmSendError {
  const err = e as AxiosError<unknown>;
  const status = err?.response?.status ?? null;
  if (status === 404) {
    return new DmSendError(
      "Bulk DM sending isn't available on this server yet.",
      "NOT_DEPLOYED",
      404
    );
  }
  const data = err?.response?.data;
  const nested =
    isJsonObject(data) && isJsonObject(data.error) ? data.error : {};
  const raw = nested.message ?? (isJsonObject(data) ? data.message : undefined);
  const message =
    typeof raw === "string" && raw ? raw : (err?.message ?? "Request failed.");
  const code = typeof nested.code === "string" ? nested.code : "REQUEST_FAILED";
  return new DmSendError(message, code, status);
}

/**
 * An API call with the org header, the `{ data }` envelope unwrapped and
 * errors as {@link DmSendError} (404 = route not deployed). Shared by the
 * campaign sends that live outside campaigns.service.
 */
export async function request(config: AxiosRequestConfig, orgId?: string) {
  const resolved = orgId ?? getSelectedOrganizationId() ?? null;
  try {
    const res = await apiClient.request<unknown>({
      ...config,
      headers: {
        ...(config.headers ?? {}),
        ...(resolved ? { "x-org-id": resolved } : {}),
        "x-onchain-silent-error": "1",
      },
    });
    const body = res.data;
    return isJsonObject(body) && "data" in body ? body.data : body;
  } catch (e) {
    throw toError(e);
  }
}

export const dmSendService = {
  async preflight(campaignId: string, channel: DmChannel, orgId?: string) {
    const raw = await request(
      {
        method: "GET",
        url: `/campaigns/${campaignId}/channel-sends/${channel}/preflight`,
      },
      orgId
    );
    const p = toDmPreflight(raw);
    if (!p) {
      throw new DmSendError(
        "The server didn't return the sending rules for this channel.",
        "BAD_PREFLIGHT",
        null
      );
    }
    return p;
  },

  /** Queue the send, carrying the consent the client just gave. */
  async launch(
    campaignId: string,
    channel: DmChannel,
    version: string,
    orgId?: string
  ) {
    return request(
      {
        method: "POST",
        url: `/campaigns/${campaignId}/channel-sends/${channel}`,
        data: { consent: { accepted: true, version } },
      },
      orgId
    );
  },
};
