"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import { isJsonObject } from "@/lib/utils";

import { SettingsCard, StatusPill } from "../settings-card";
import {
  billingService,
  type CustomerInvoice,
} from "@/features/billing/billing.service";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const statusTone = (
  status: string
): "success" | "pending" | "danger" | "neutral" => {
  const s = status.toLowerCase();
  if (s === "paid") return "success";
  if (s === "open" || s === "due") return "pending";
  if (s === "uncollectible" || s === "void" || s === "failed") return "danger";
  return "neutral";
};

/** Accepts an array or an `{ items }` / `{ data }` envelope. */
const toInvoiceArray = (payload: unknown): CustomerInvoice[] => {
  if (Array.isArray(payload)) return payload as CustomerInvoice[];
  if (isJsonObject(payload)) {
    if (Array.isArray(payload.items)) return payload.items as CustomerInvoice[];
    if (Array.isArray(payload.data)) return payload.data as CustomerInvoice[];
  }
  return [];
};

/**
 * Customer-facing invoice list (`GET /billing/invoices`): number, description,
 * amount, status and the pay date, with a Pay button that opens the invoice's
 * hosted `payUrl` (Stripe card page; crypto invoices are paid from the wallet).
 */
export function BillingInvoicesCard() {
  const invoicesQuery = useQuery({
    queryKey: ["billing", "customer-invoices"],
    queryFn: () => billingService.getBillingInvoices(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const invoices = toInvoiceArray(invoicesQuery.data);

  return (
    <SettingsCard
      title="Invoices"
      description="Your billing history and any amounts due."
    >
      {invoicesQuery.isLoading ? (
        <div className="space-y-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : invoicesQuery.isError ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load invoices.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => invoicesQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No invoices yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Invoice</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="w-px py-2" aria-label="Pay" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => {
                const isPaid = invoice.status?.toLowerCase() === "paid";
                const date = isPaid ? invoice.paidAt : invoice.dueAt;
                return (
                  <tr
                    key={invoice.number || `invoice-${index}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">
                        {invoice.number || "Invoice"}
                      </div>
                      {invoice.description ? (
                        <div className="text-xs text-muted-foreground">
                          {invoice.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatUsd(invoice.amountUsd ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={statusTone(invoice.status ?? "")}>
                        {invoice.status
                          ? invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)
                          : "-"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(date)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {!isPaid && invoice.payUrl ? (
                        <Button asChild size="sm">
                          <a
                            href={invoice.payUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Pay
                            <ArrowTopRightOnSquareIcon
                              aria-hidden="true"
                              className="ml-1.5 size-3.5"
                            />
                          </a>
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsCard>
  );
}

export default BillingInvoicesCard;
