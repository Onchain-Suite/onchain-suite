/**
 * What the billing tab says when the browser comes back from a payment page.
 *
 * The backend returns to `/settings?tab=billing` with one of two markers:
 *
 *  - `checkout=canceled`: the person backed out of a hosted checkout. Nothing
 *    was charged, and without a word they would land on a page that looks the
 *    same as before they left and wonder whether it had.
 *  - `subscription=updated`: a workspace that already subscribes changed its
 *    size. There is no checkout for that (a second one would be a second
 *    subscription), so this is the only confirmation they get.
 *
 * Anything else, including a value nobody defined, says nothing.
 */
export interface CheckoutReturnNotice {
  kind: "info" | "success";
  message: string;
  /** The plan and usage figures are stale and should be read again. */
  refresh: boolean;
}

export function checkoutReturnNotice(params: {
  checkout?: string | null;
  subscription?: string | null;
}): CheckoutReturnNotice | null {
  if (params.subscription === "updated") {
    return {
      kind: "success",
      message: "Plan updated. Your next invoice reflects the change.",
      refresh: true,
    };
  }
  if (params.checkout === "canceled") {
    return {
      kind: "info",
      message: "Checkout cancelled. You have not been charged.",
      refresh: false,
    };
  }
  return null;
}
