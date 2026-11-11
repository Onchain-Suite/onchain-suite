"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { checkoutReturnNotice } from "../../utils/checkout-return";

const BILLING_TAB_HREF = "/settings?tab=billing";

/**
 * Says what happened when the browser comes back from a payment page
 * (`?checkout=canceled`, `?subscription=updated`), once, then takes the marker
 * out of the address so a refresh does not say it again. Renders nothing.
 */
export function CheckoutReturnToast() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const checkout = searchParams?.get("checkout") ?? null;
  const subscription = searchParams?.get("subscription") ?? null;
  const shown = useRef(false);

  useEffect(() => {
    const notice = checkoutReturnNotice({ checkout, subscription });
    if (!notice || shown.current) return;
    shown.current = true;
    if (notice.kind === "success") toast.success(notice.message);
    else toast.message(notice.message);
    if (notice.refresh) qc.invalidateQueries({ queryKey: ["billing"] });
    router.replace(BILLING_TAB_HREF, { scroll: false });
  }, [checkout, subscription, qc, router]);

  return null;
}
