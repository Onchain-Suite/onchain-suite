import { billingRequest, type BillingServiceOptions } from "./billing.service";
import type {
  RenewalOffer,
  RenewalSubscribeResponse,
} from "./contracts/renewal";

export type { RenewalOffer } from "./contracts/renewal";

/**
 * The workspace's own renewal: whether it can go on a Stripe subscription, and
 * the call that puts it there. OWNER-only on the backend, and scoped to the
 * active workspace by the `x-org-id` header, so no id is sent in the URL.
 */
export const renewalService = {
  /** `GET /billing/renewal`. */
  getOffer(options?: BillingServiceOptions) {
    return billingRequest<RenewalOffer>(
      { method: "GET", url: "/billing/renewal" },
      options
    );
  },

  /**
   * `POST /billing/renewal/subscribe`. Sends where the browser is now, so a
   * hosted page returns to the same environment it was opened from.
   */
  subscribe(returnUrl: string, options?: BillingServiceOptions) {
    return billingRequest<RenewalSubscribeResponse>(
      {
        method: "POST",
        url: "/billing/renewal/subscribe",
        data: { returnUrl },
      },
      options
    );
  },
};
