"use client";

import { useQuery } from "@tanstack/react-query";

import { getSelectedOrganizationId } from "@/lib/utils";

import { billingService } from "@/features/billing/billing.service";

const formatUsd = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const formatNum = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("en-US");

/**
 * Itemised usage→cost breakdown for the current org: each meter's usage priced
 * at the rate card, a wallet-enrichment line (a subset of on-chain, shown for
 * visibility, not added to the total), and the period total. This is the piece
 * the billing page was missing — usage and cost finally in one place.
 */
export function UsageCostBreakdown() {
  const orgId = getSelectedOrganizationId();
  const query = useQuery({
    queryKey: ["billing", "priced-usage", orgId],
    enabled: Boolean(orgId),
    queryFn: () =>
      billingService.getPricedUsage(orgId ?? undefined, {
        orgId: orgId ?? undefined,
      }),
    staleTime: 60_000,
  });

  // Only treat the response as usable when it actually carries the shape we
  // render — a partial/empty payload (or an error) falls back rather than
  // throwing on data.plan.label / data.lines.map.
  const data =
    query.data && query.data.plan && Array.isArray(query.data.lines)
      ? query.data
      : undefined;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          This period&rsquo;s cost
        </h3>
        {data ? (
          <span className="text-xs text-muted-foreground">{data.period}</span>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        What you&rsquo;ve used, priced at your rate card.
      </p>

      {query.isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Loading cost breakdown&hellip;
        </p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Couldn&rsquo;t load the cost breakdown.
        </p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Used</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 text-foreground">{data.plan.label} plan</td>
                <td className="py-2 text-right text-muted-foreground">
                  &mdash;
                </td>
                <td className="py-2 text-right text-muted-foreground">base</td>
                <td className="py-2 text-right tabular-nums text-foreground">
                  {formatUsd(data.planPriceUsd)}
                </td>
              </tr>
              {data.lines.map((line) => (
                <tr key={line.meter} className="border-b border-border/60">
                  <td className="py-2 text-foreground">{line.label}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {formatNum(line.used)}{" "}
                    <span className="text-xs">{line.unit}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {formatUsd(line.unitCostUsd)}/{line.unit.replace(/s$/, "")}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {formatUsd(line.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  className="pt-3 text-sm font-medium text-foreground"
                  colSpan={3}
                >
                  Total this period
                </td>
                <td className="pt-3 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatUsd(data.totalUsd)}
                </td>
              </tr>
            </tfoot>
          </table>

          {data.enrichment ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatNum(data.enrichment.walletsEnriched)}
              </span>{" "}
              wallets enriched (~{formatUsd(data.enrichment.estCostUsd)} of the
              On-chain data line). {data.enrichment.note}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default UsageCostBreakdown;
