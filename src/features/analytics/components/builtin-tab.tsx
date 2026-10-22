"use client";

import type { BuiltInDashboardId } from "../contracts/dashboards";
import type { AnalyticsPeriod } from "../contracts/org-analytics";
import { BUILT_IN_LAYOUTS, type LayoutCard } from "../data/builtin-layouts";
import { AttributionWindowCard } from "./cards/attribution-window-card";
import { CampaignFunnelCard } from "./cards/campaign-funnel-card";
import { CohortGridCard } from "./cards/cohort-grid-card";
import { EfficiencyCard } from "./cards/efficiency-card";
import { KpiStrip } from "./cards/kpi-strip";
import { LifecycleCard } from "./cards/lifecycle-card";
import { NotMeasuredCard } from "./cards/not-measured-card";
import { PushDeliveryCard } from "./cards/push-delivery-card";
import { MetricCard } from "./metric-card";

function Card({ card, period }: { card: LayoutCard; period: AnalyticsPeriod }) {
  if (card.kind === "metric") {
    return (
      <MetricCard
        title={card.title}
        meta={card.meta}
        metric={card.metric}
        chart={card.chart}
        period={period}
        span={card.span}
        foot={card.foot}
      />
    );
  }
  if (card.kind === "missing") {
    return (
      <NotMeasuredCard
        title={card.title}
        meta={card.meta}
        shows={card.shows}
        needs={card.needs}
        span={card.span}
      />
    );
  }
  switch (card.card) {
    case "kpis":
      return <KpiStrip period={period} />;
    case "funnel":
      return <CampaignFunnelCard period={period} />;
    case "push":
      return <PushDeliveryCard period={period} />;
    case "efficiency":
      return <EfficiencyCard period={period} />;
    case "lifecycle":
      return <LifecycleCard />;
    case "cohorts":
      return <CohortGridCard />;
    case "attribution":
      return <AttributionWindowCard period={period} />;
  }
}

/** A built-in tab's cards, in the reference layout. */
export function BuiltInCards({
  tab,
  period,
}: {
  tab: BuiltInDashboardId;
  period: AnalyticsPeriod;
}) {
  return (
    <>
      {BUILT_IN_LAYOUTS[tab].map((card) => (
        <Card
          key={card.kind === "special" ? card.card : card.title}
          card={card}
          period={period}
        />
      ))}
    </>
  );
}
