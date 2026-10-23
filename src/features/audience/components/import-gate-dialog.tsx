"use client";

import {
  BanknotesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AudienceImportEstimate } from "../contracts/imports";

/** Cents-aware USD: keep two decimals for small amounts so a $0.03 cost or a
 *  $0.90 shortfall never rounds to $0, whole dollars once it passes $100. */
function fmtUsd(value: number): string {
  const digits = Math.abs(value) < 100 ? 2 : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `$${value.toFixed(digits)}`;
  }
}

const BILLING_TAB_HREF = "/settings?tab=billing";

/**
 * Pre-import gate. Driven by {@link AudienceImportEstimate}:
 *
 * - `willExceedBalance` -> BLOCKING. The PAYG wallet can't cover verification;
 *   the only forward action is Top up. There is no "import anyway" - running it
 *   would drive the wallet negative, which is the exact failure this prevents.
 * - otherwise `willExceedCap` -> WARNING. Over-cap rows are quarantined, not
 *   rejected, so the user may Import anyway or Upgrade for more room.
 *
 * The caller only opens this when one of those flags is set; a clean estimate
 * proceeds straight to the import without a dialog.
 */
export function ImportGateDialog({
  open,
  estimate,
  planName,
  busy,
  onProceed,
  onClose,
}: {
  open: boolean;
  estimate: AudienceImportEstimate | null;
  /** Current plan tier name, for the cap-warning copy. */
  planName?: string;
  /** True once the user confirmed and the import is starting. */
  busy?: boolean;
  /** Warn path only: run the import despite the cap overflow. */
  onProceed: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!estimate) return null;

  const blocking = estimate.willExceedBalance;
  const tier = planName?.trim() ? planName.trim() : "current plan";
  // Top up at least the shortfall; the wallet card enforces its own $10 floor.
  const topUpAmount = Math.max(10, Math.ceil(estimate.shortfallUsd));

  const goToBilling = (amount?: number) => {
    const href =
      amount !== undefined
        ? `${BILLING_TAB_HREF}&topup=${encodeURIComponent(String(amount))}`
        : BILLING_TAB_HREF;
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!next ? onClose() : undefined)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={
                blocking
                  ? "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }
            >
              {blocking ? (
                <BanknotesIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ExclamationTriangleIcon
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              )}
            </span>
            <div className="space-y-1">
              <DialogTitle>
                {blocking
                  ? "Top up to run this import"
                  : "This import exceeds your plan"}
              </DialogTitle>
              <DialogDescription>
                {blocking
                  ? `Verifying ${estimate.contacts.toLocaleString()} contacts costs about ${fmtUsd(
                      estimate.estimatedCostUsd
                    )}, and your usage wallet holds ${fmtUsd(
                      estimate.walletBalanceUsd
                    )}.`
                  : `${estimate.overCapBy.toLocaleString()} of these ${estimate.contacts.toLocaleString()} contacts go over your ${tier} limit${
                      estimate.contactLimit !== null
                        ? ` of ${estimate.contactLimit.toLocaleString()}`
                        : ""
                    }.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm">
          {blocking ? (
            <dl className="space-y-1.5">
              <Row
                label="Estimated cost"
                value={fmtUsd(estimate.estimatedCostUsd)}
              />
              <Row
                label="Wallet balance"
                value={fmtUsd(estimate.walletBalanceUsd)}
              />
              <Row
                label="Top up at least"
                value={fmtUsd(estimate.shortfallUsd)}
                strong
              />
            </dl>
          ) : (
            <p className="leading-5 text-muted-foreground">
              We&apos;ll import the{" "}
              <span className="font-medium text-foreground">
                {Math.max(
                  0,
                  estimate.contacts - estimate.overCapBy
                ).toLocaleString()}
              </span>{" "}
              that fit and hold the remaining{" "}
              <span className="font-medium text-foreground">
                {estimate.overCapBy.toLocaleString()}
              </span>{" "}
              until you upgrade. Held contacts aren&apos;t billed or messaged.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {blocking ? (
            <>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl"
                onClick={() => goToBilling(topUpAmount)}
              >
                Top up {fmtUsd(topUpAmount)}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => goToBilling()}
              >
                Upgrade plan
              </Button>
              <Button
                className="rounded-xl"
                disabled={busy}
                onClick={onProceed}
              >
                {busy ? "Starting…" : "Import anyway"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          strong
            ? "font-semibold text-foreground"
            : "font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
