"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import type { AnalyticsPeriod } from "../../contracts/org-analytics";
import { useAnalyticsSources } from "../../hooks/use-analytics-source";
import { formatCount } from "../../utils/format";
import { campaignFunnelSteps, worstDrop } from "../../utils/funnel";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
} from "../analytics-card";
import { AnalyticsFunnelChart } from "../charts";

/** Reached, engaged, clicked, converted: every channel, with the biggest leak named. */
export function CampaignFunnelCard({ period }: { period: AnalyticsPeriod }) {
  const { data, loading, error } = useAnalyticsSources(
    ["campaigns", "attribution"],
    period
  );
  const steps = campaignFunnelSteps(data.campaigns, data.attribution);
  const worst = worstDrop(steps);
  const hasConversions = steps.some((s) => s.name === "Converted");

  return (
    <AnalyticsCard
      title="Campaign funnel"
      meta="Email and in-app push"
      span={2}
      foot={
        hasConversions
          ? undefined
          : "Converted appears once you choose which on-chain events count as conversions."
      }
    >
      {loading ? (
        <CardLoading />
      ) : error ? (
        <CardError error={error} />
      ) : !steps[0] || steps[0].value === 0 ? (
        <CardEmpty reason="No message was delivered in this period, so there is no funnel yet." />
      ) : (
        <>
          <AnalyticsFunnelChart steps={steps} />
          {worst ? (
            <p className="an-worst">
              <ExclamationTriangleIcon aria-hidden="true" />
              Biggest drop-off: {worst.from.toLowerCase()} to{" "}
              {worst.to.toLowerCase()}, {formatCount(worst.lost)} lost (
              {worst.pctOfTop}% of everyone reached).
            </p>
          ) : null}
        </>
      )}
    </AnalyticsCard>
  );
}
