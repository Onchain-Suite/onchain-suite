"use client";

import { WalletIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSelectedOrganizationId } from "@/lib/utils";

import { billingService } from "@/features/billing/billing.service";
import { openCheckoutInNewTab } from "@/features/billing/checkout";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

/**
 * Prepaid usage wallet (Pay-As-You-Go). Shown for `payg` orgs, and for
 * subscription orgs too - mid-cycle overage falls back to this wallet
 * (docs/backend.md 2026-07-22), so exhausted teams top up here instead of
 * being cut off. Renders nothing when the wallet endpoint is unavailable.
 */
export function PaygWalletCard({ planName }: { planName: string }) {
  const orgId = getSelectedOrganizationId();
  const isPayg = planName.trim().toLowerCase() === "payg";
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState("25");
  const [startingCheckout, setStartingCheckout] = useState(false);

  const walletQuery = useQuery({
    queryKey: ["billing", "payg-wallet", orgId],
    queryFn: () => {
      if (!orgId) throw new Error("No active organization");
      return billingService.getPaygWallet(orgId, { orgId });
    },
    enabled: Boolean(orgId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const wallet = walletQuery.data;

  // Loading and error are distinct from "no wallet": an org that must top up
  // should see a skeleton or a retry, never a silent blank.
  if (walletQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
        <div className="flex items-start gap-3">
          <WalletIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-32 rounded" />
            <Skeleton className="h-3 w-full max-w-md rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (walletQuery.isError) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <WalletIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <div className="text-sm font-medium text-foreground">
                Usage wallet
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Couldn&apos;t load your usage wallet balance.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={walletQuery.isFetching}
            onClick={() => walletQuery.refetch()}
          >
            {walletQuery.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (!wallet) return null;

  const ledger = (wallet.ledger ?? []).slice(0, 5);
  const lowBalance = wallet.balanceUsd < 1;

  const handleTopUp = async () => {
    const amountUsd = Number(amount);
    if (!Number.isFinite(amountUsd) || amountUsd < 10 || amountUsd > 1000) {
      toast.error("Enter an amount between $10 and $1,000");
      return;
    }
    if (!orgId) return;
    setStartingCheckout(true);
    try {
      const checkout = await billingService.checkoutCredits(
        { organizationId: orgId, amountUsd },
        { orgId }
      );
      const paymentUrl =
        typeof checkout.paymentUrl === "string" ? checkout.paymentUrl : "";
      if (paymentUrl) {
        if (!openCheckoutInNewTab(paymentUrl)) {
          window.location.assign(paymentUrl);
        }
        setTopUpOpen(false);
      } else {
        toast.error("Checkout could not be started. Please try again.");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Checkout could not be started."
      );
    } finally {
      setStartingCheckout(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <WalletIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <div className="text-sm font-medium text-foreground">
              Usage wallet
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {formatUsd(wallet.balanceUsd)}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {isPayg
                ? "Your plan is usage-based - sends, on-chain reads, and AI are metered from this balance ($1/1k messages · $1/10k on-chain · $5/1k AI)."
                : "When your monthly plan allowance runs out, usage continues from this wallet at pay-as-you-go rates instead of stopping."}
            </p>
            {lowBalance ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                Balance is low - top up to keep sends and AI running.
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => setTopUpOpen(true)}
        >
          Top up
        </Button>
      </div>

      {ledger.length > 0 ? (
        <div className="mt-4 space-y-1 border-t border-border/50 pt-3">
          {ledger.map((entry, index) => {
            const amountValue = Number(entry.amountUsd);
            const label =
              typeof entry.meter === "string" && entry.meter.length > 0
                ? entry.meter
                : typeof entry.reason === "string" && entry.reason.length > 0
                  ? entry.reason
                  : "usage";
            const when =
              typeof entry.createdAt === "string"
                ? new Date(entry.createdAt).toLocaleDateString()
                : "";
            return (
              <div
                key={entry.id ?? `${label}-${index}`}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span className="truncate">{label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {when ? <span>{when}</span> : null}
                  <span
                    className={
                      Number.isFinite(amountValue) && amountValue > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }
                  >
                    {Number.isFinite(amountValue)
                      ? formatUsd(amountValue)
                      : "-"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              Top up usage wallet
            </DialogTitle>
            <DialogDescription>
              Pay with crypto via checkout - the balance credits automatically
              once the payment confirms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Amount (USD, $10–$1,000)</Label>
            <Input
              id="topup-amount"
              type="number"
              min={10}
              max={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopUpOpen(false)}
              disabled={startingCheckout}
            >
              Cancel
            </Button>
            <Button onClick={handleTopUp} disabled={startingCheckout}>
              {startingCheckout ? "Starting…" : "Continue to checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
