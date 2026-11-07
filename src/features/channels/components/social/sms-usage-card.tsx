"use client";

import { useQuery } from "@tanstack/react-query";

import { connectionsService } from "@/features/integrations/connections.service";
import { CONNECTIONS_PREFIX } from "@/features/integrations/hooks/use-connections";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "2026-10" -> "October 2026". */
export function monthName(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const STATUS: Record<string, string> = {
  INVOICED: "Invoiced",
  CARRIED: "Added to next invoice",
  ZERO: "Nothing to bill",
  NEEDS_REVIEW: "Being reviewed",
  FAILED: "Being retried",
  PENDING: "Processing",
};

/**
 * What texting has cost this month on a number OnChain Suite set up, and the
 * monthly charges so far. Billed once a month as an invoice in Billing. Only
 * for managed numbers; a workspace on its own Twilio account pays Twilio.
 */
export function SmsUsageCard() {
  const { organizationId } = useAccountOrg();
  const usage = useQuery({
    queryKey: [...CONNECTIONS_PREFIX, "sms", "usage", organizationId],
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () =>
      connectionsService.smsManagedUsage(organizationId ?? undefined),
  });

  const u = usage.data;
  if (!u?.managed || !u.currentPeriod) return null;
  const { currentPeriod: cur, history } = u;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Texting usage</h3>
        <span className="text-xs text-muted-foreground">Billed monthly</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {monthName(cur.period)} so far
        </span>
        <span className="text-lg font-medium tabular-nums text-foreground">
          {cur.estimatedUsd === null ? "Calculating" : usd(cur.estimatedUsd)}
        </span>
      </div>
      {cur.items.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {cur.items.map((i) => (
            <li key={i.description} className="flex justify-between gap-3">
              <span>{i.description}</span>
              <span className="tabular-nums">
                {Number(i.count).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {history.length > 0 ? (
        <table className="w-full text-xs">
          <caption className="sr-only">Past monthly charges</caption>
          <tbody className="divide-y divide-border">
            {history.map((h) => (
              <tr key={h.period}>
                <td className="py-1.5 text-foreground">
                  {monthName(h.period)}
                </td>
                <td className="py-1.5 text-muted-foreground">
                  {STATUS[h.status] ?? h.status}
                </td>
                <td className="py-1.5 text-right tabular-nums text-foreground">
                  {usd(h.amountUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
