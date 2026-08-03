"use client";

import { ArrowRightIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/ui/button";

import { clearPendingCheckout, readPendingCheckout } from "../checkout";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * Stripe's `cancel_url` target — `/billing?canceled={reference}`, set when the
 * Checkout Session is created. Reached when the buyer backs out of the hosted
 * page, so nothing was charged and no webhook will ever arrive for this
 * reference.
 *
 * Its real job is clearing the locally stored pending checkout: without this,
 * abandoning a checkout leaves PendingCheckoutBanner polling a reference that
 * can never confirm until it ages out of the TTL, showing a "waiting for your
 * payment…" spinner for a payment the user deliberately cancelled.
 */
export function CheckoutCanceled() {
  const searchParams = useSearchParams();
  const canceledRef = (searchParams?.get("canceled") ?? "").trim();

  useEffect(() => {
    if (canceledRef.length === 0) return;
    // Only drop the stored checkout when it's the one that was cancelled — a
    // stale `?canceled=` link must not wipe out a different, live checkout the
    // user started since.
    const pending = readPendingCheckout();
    if (pending?.reference === canceledRef) clearPendingCheckout();
  }, [canceledRef]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted ring-1 ring-border">
          <XCircleIcon
            aria-hidden="true"
            className="h-9 w-9 text-muted-foreground"
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Checkout cancelled
        </h1>

        <p className="mt-3 text-base text-muted-foreground">
          No payment was taken and your plan hasn&apos;t changed. You can pick
          up where you left off whenever you&apos;re ready.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full rounded-xl px-6 sm:w-auto">
            <Link href={`${PRIVATE_ROUTES.SETTINGS}?tab=billing`}>
              Back to billing
              <ArrowRightIcon aria-hidden="true" className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-xl px-6 sm:w-auto"
          >
            <Link href={PRIVATE_ROUTES.DASHBOARD}>Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
