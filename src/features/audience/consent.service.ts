import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type { ConsentView, ContactConsent } from "./contracts/consent";

export type { ConsentView, ContactConsent } from "./contracts/consent";

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function toView(raw: unknown): ConsentView | null {
  if (!isJsonObject(raw)) return null;
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    consentSource: str(raw.consentSource),
    consentMethod: str(raw.consentMethod),
    consentAt: str(raw.consentAt),
    consentAtKnown: raw.consentAtKnown === true,
    consentText: str(raw.consentText),
    consentProof: str(raw.consentProof),
    consentIp: str(raw.consentIp),
    doubleOptIn: raw.doubleOptIn === true,
    originId: str(raw.originId),
    recordedAt: str(raw.recordedAt),
    storedAs: raw.storedAs === "form_submission" ? "form_submission" : "record",
  };
}

/** Normalise `GET /audience/profiles/:id/consent`, envelope included. */
export function toContactConsent(
  payload: unknown,
  contactId: string
): ContactConsent {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const o = isJsonObject(root) ? root : {};
  const records = Array.isArray(o.records)
    ? o.records.map(toView).filter((v): v is ConsentView => v !== null)
    : [];
  return {
    contactId: typeof o.contactId === "string" ? o.contactId : contactId,
    current: toView(o.current),
    records,
  };
}

export const consentService = {
  /** `GET /audience/profiles/:id/consent` - any member role. */
  async getProfileConsent(contactId: string): Promise<ContactConsent> {
    const orgId = getSelectedOrganizationId();
    const res = await apiClient.get(
      `/audience/profiles/${encodeURIComponent(contactId)}/consent`,
      {
        headers: {
          ...(orgId ? { "x-org-id": orgId } : {}),
          "x-onchain-silent-error": "1",
        },
      }
    );
    return toContactConsent(res.data, contactId);
  },
};
