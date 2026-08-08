"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";

import { SettingsCard } from "@/features/settings/components/settings-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

/**
 * Pay-as-you-go overage rates (docs/pricing.md - the priced catalog). These are
 * the ceiling rates charged from the prepaid wallet once an allowance is used
 * up; committed/subscription tiers are cheaper per unit.
 */
const RATES: { meter: string; rate: string; note?: string }[] = [
  { meter: "Messages (email + in-app)", rate: "$1 per 1,000 messages" },
  {
    meter: "Wallet-data credits",
    rate: "$2.50 per 10,000 credits",
    note: "Clears un-cached cost at a 70% cache hit.",
  },
  { meter: "AI actions", rate: "$5 per 1,000 actions" },
  {
    meter: "In-app push (via add-on)",
    rate: "$1 per 1,000 pushes",
    note: "Ceiling rate - committed tiers are cheaper.",
  },
];

export default function UsageRates() {
  return (
    <SettingsCard
      title="Usage rates"
      description="Pay-as-you-go, and overage once an allowance is used up"
      bodyClassName="px-0 py-0 sm:px-0"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 sm:pl-6">Meter</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="pr-5 sm:pr-6">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RATES.map((row) => (
              <TableRow key={row.meter}>
                <TableCell className="pl-5 font-medium text-foreground sm:pl-6">
                  {row.meter}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-foreground">
                  {row.rate}
                </TableCell>
                <TableCell className="pr-5 text-muted-foreground sm:pr-6">
                  {row.note ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-start gap-2.5 border-t border-border/50 px-5 py-4 text-sm text-muted-foreground sm:px-6">
        <InformationCircleIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <p>
          These sit above the plan-implied rates, so a subscription is always
          cheaper per unit than paying as you go.
        </p>
      </div>
    </SettingsCard>
  );
}
