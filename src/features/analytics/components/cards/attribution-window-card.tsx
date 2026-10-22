"use client";

import type { AnalyticsPeriod } from "../../contracts/org-analytics";
import { useAnalyticsSource } from "../../hooks/use-analytics-source";
import { formatCount } from "../../utils/format";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
} from "../analytics-card";

/**
 * How conversions are credited: last touch, within a window. The reference's
 * per-channel delay chart needs time-to-convert data the backend does not
 * return yet, so this shows the rule and what it credited.
 */
export function AttributionWindowCard({ period }: { period: AnalyticsPeriod }) {
  const q = useAnalyticsSource("attribution", period);
  const a = q.data;
  return (
    <AnalyticsCard
      title="Attribution window"
      meta="Last touch, one message per conversion"
      span="full"
      foot="A conversion is credited to the most recent message before it, inside the window. That is correlation with an order, not proof the message caused it."
    >
      {q.isLoading ? (
        <CardLoading />
      ) : q.error ? (
        <CardError error={q.error as Error} />
      ) : !a ? null : (
        <div className="an-window">
          <div className="an-window__row">
            <b>{a.windowHours}h</b>
            <span>
              after a message, an on-chain action counts as a conversion.
            </span>
          </div>
          {a.conversionEvents.length === 0 ? (
            <CardEmpty reason="No events count as conversions yet. Choosing them (a swap, a mint, a stake) turns this on." />
          ) : (
            <>
              <div className="an-window__events" aria-label="Events that count">
                {a.conversionEvents.map((e) => (
                  <i key={e}>{e}</i>
                ))}
              </div>
              <div className="an-window__row">
                <span>
                  {formatCount(a.attributed.conversions)} conversions from{" "}
                  {formatCount(a.attributed.wallets)} wallets credited this
                  period.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </AnalyticsCard>
  );
}
