"use client";

import { useQuery } from "@tanstack/react-query";

import { audienceService } from "../audience.service";
import { getHealthColor, HealthBar, prettifyKey } from "../utils";

const bandLabel = (score: number): string => {
  if (score >= 70) return "Strong";
  if (score >= 40) return "Watch";
  return "At risk";
};

const fmtFactorValue = (value: number | string): string =>
  typeof value === "number" ? `${value > 0 ? "+" : ""}${value}` : String(value);

/**
 * The contact's health score, band and the signals behind it, from
 * `GET /audience/profiles/:id/health`. Renders nothing when the backend has no
 * health for this contact (not yet computed), so we never show a fake zero.
 */
export function ContactHealthPanel({
  profileId,
  open,
}: {
  profileId: string;
  open: boolean;
}) {
  const query = useQuery({
    queryKey: ["audience", "profile-health", profileId],
    queryFn: () => audienceService.getProfileHealth(profileId),
    enabled: open && profileId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const health = query.data;
  if (query.isError || (!health && !query.isLoading)) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Health
      </p>
      {query.isLoading || !health ? (
        <p className="text-sm text-muted-foreground">Loading health…</p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-semibold ${getHealthColor(health.score)}`}
            >
              {Math.round(health.score)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {bandLabel(health.score)}
            </span>
          </div>
          <HealthBar score={health.score} />
          {health.factors && health.factors.length > 0 ? (
            <ul className="space-y-1.5 pt-1">
              {[...health.factors]
                .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
                .slice(0, 5)
                .map((f) => (
                  <li
                    key={f.key}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {prettifyKey(f.key)}
                    </span>
                    <span
                      className={
                        typeof f.value === "number" && f.value < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }
                    >
                      {fmtFactorValue(f.value)}
                    </span>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ContactHealthPanel;
