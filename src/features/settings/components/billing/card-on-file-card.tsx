"use client";

import { ArrowPathIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsCard, StatusPill } from "../settings-card";
import { billingService } from "@/features/billing/billing.service";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const BILLING_TAB_HREF = "/settings?tab=billing";

const formatSince = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const titleCaseBrand = (brand?: string | null) => {
  const value = (brand ?? "").trim();
  if (!value) return "Card";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Card on file for the org, with an Add / Update action that starts the hosted
 * Stripe card-save flow and redirects to it (no card fields on our page). Saving
 * a card is what lets renewals auto-charge on the expiry day - without one the
 * org still gets reminder emails and the hosted Pay link, just not silent
 * charging.
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

  const card = cardQuery.data;
  const hasCard = card?.hasCard === true;
  const since = formatSince(card?.since);

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

  return (
    <SettingsCard
      title="Card on file"
      description="Save a card to auto-charge renewals on the expiry day."
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
            {hasCard ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {titleCaseBrand(card?.brand)} •••• {card?.last4 ?? "----"}
                  </span>
                  <StatusPill tone="success">On file</StatusPill>
                </div>
                {since ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Added {since}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  No card on file
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Without a card, renewals fall back to reminder emails + a
                  hosted Pay link.
                </p>
              </div>
            )}
          </div>

          <Button
            className="shrink-0"
            variant={hasCard ? "outline" : "default"}
            disabled={setupMutation.isPending}
            onClick={() => setupMutation.mutate()}
          >
            {setupMutation.isPending
              ? "Redirecting…"
              : hasCard
                ? "Update card"
                : "Add card"}
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}

export default CardOnFileCard;
