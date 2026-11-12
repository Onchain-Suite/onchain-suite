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
 *    subscription), so this is the only confirmation they get. A larger size
 *    has already been charged for; the page's figures are read again so it
 *    shows the price of the size they now have.
 *
 *  - `subscription=started`: a workspace that renewed month by month through
 *    our invoices has put its renewal on a subscription. Nothing was charged
 *    (the time up to its renewal date is already paid for), which is exactly
 *    what someone who has just entered a card needs to be told.
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
      message: "Plan updated. The price below is what you pay now.",
      refresh: true,
    };
  }
  if (params.subscription === "started") {
    return {
      kind: "success",
      message:
        "Your plan now renews by itself. Nothing was charged today; the first charge is on your renewal date.",
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
