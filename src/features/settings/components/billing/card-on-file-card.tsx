"use client";

import { ArrowPathIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsCard, StatusPill } from "../settings-card";
import { billingService } from "@/features/billing/billing.service";
import { cardOnFileView } from "@/features/settings/utils/card-on-file-view";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const BILLING_TAB_HREF = "/settings?tab=billing";

/**
 * Card on file for the org, with an Add / Update action that starts the hosted
 * Stripe card-save flow and redirects to it (no card fields on our page). Saving
 * a card is what lets renewals auto-charge on the expiry day - without one the
 * org still gets reminder emails and the hosted Pay link, just not silent
 * charging.
 *
 * A workspace on a card subscription has a card of another kind: the one Stripe
 * renews the subscription on. It is shown as that, and its action opens
 * Stripe's billing portal, the only place it can be changed.
 */
export function CardOnFileCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnedCard = searchParams?.get("card") ?? null;

  // On return from Stripe's hosted page the setup_intent.succeeded webhook that
  // writes CardOnFile can land a beat after the redirect, so a single fetch may
  // still read "no card". Poll briefly on ?card=added until it appears.
  const [waitingForCard, setWaitingForCard] = useState(
    returnedCard === "added"
  );
  const notifiedRef = useRef(false);

  const cardQuery = useQuery({
    queryKey: ["billing", "card-on-file"],
    queryFn: () => billingService.getCardOnFile(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    refetchInterval: waitingForCard ? 2500 : false,
  });

  const view = cardOnFileView(cardQuery.data);
  // The save flow is finished when a card saved with us appears. A
  // subscription's card was there all along and proves nothing.
  const hasCard = view.savedWithUs;

  // Strip the ?card= param so a refresh doesn't replay the toast/poll.
  useEffect(() => {
    if (returnedCard) router.replace(BILLING_TAB_HREF, { scroll: false });
  }, [returnedCard, router]);

  // Abandoned on Stripe's page.
  useEffect(() => {
    if (returnedCard === "cancelled" && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.message("Card setup cancelled.");
    }
  }, [returnedCard]);

  // The polled card arrived - confirm and stop polling.
  useEffect(() => {
    if (waitingForCard && hasCard && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.success("Card saved.");
      setWaitingForCard(false);
    }
  }, [waitingForCard, hasCard]);

  // Give up polling after ~15s (the webhook is just slow, not failed).
  useEffect(() => {
    if (!waitingForCard) return;
    const timer = setTimeout(() => {
      setWaitingForCard(false);
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        toast.message("Card saved - it may take a moment to appear here.");
      }
    }, 15_000);
    return () => clearTimeout(timer);
  }, [waitingForCard]);

  const setupMutation = useMutation({
    mutationFn: () => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      return billingService.startCardSetup({
        successUrl: `${origin}${BILLING_TAB_HREF}&card=added`,
        cancelUrl: `${origin}${BILLING_TAB_HREF}&card=cancelled`,
      });
    },
    onSuccess: ({ url }) => {
      if (url) {
        // Hand off to Stripe's hosted setup page; on success their webhook
        // stores the CardOnFile and the user is returned to the app.
        window.location.assign(url);
        return;
      }
      toast.error(
        "Couldn't start card setup - the hosted setup URL wasn't returned. Check that the backend returns a hosted page URL for the card-save flow."
      );
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Couldn't start card setup."
      ),
  });

  // The subscription's card lives in Stripe; so does the page that changes it.
  const portalMutation = useMutation({
    mutationFn: () => billingService.billingPortal(),
    onSuccess: ({ url }) => {
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.error("Couldn't open Stripe billing. Please try again.");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Couldn't open Stripe billing."
      ),
  });

  const action = view.action === "portal" ? portalMutation : setupMutation;

  return (
    <SettingsCard
      replayBlock
      title="Card on file"
      description={view.description}
    >
      {cardQuery.isLoading ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : cardQuery.isError ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your card on file.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cardQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : waitingForCard && !hasCard ? (
        <div className="flex items-center gap-3">
          <ArrowPathIcon
            aria-hidden="true"
            className="size-5 shrink-0 animate-spin text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Saving your card…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CreditCardIcon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {view.title}
                </span>
                {view.pill ? (
                  <StatusPill tone="success">{view.pill}</StatusPill>
                ) : null}
              </div>
              {view.note ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {view.note}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            className="shrink-0"
            variant={view.hasCard ? "outline" : "default"}
            disabled={action.isPending}
            onClick={() => action.mutate()}
          >
            {action.isPending ? "Redirecting…" : view.actionLabel}
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}

export default CardOnFileCard;
