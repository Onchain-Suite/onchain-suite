import type { OrgAttribution } from "../contracts/org-analytics";
import type { CampaignAnalyticsOverview } from "@/features/campaigns/campaigns.service";

/** A funnel's steps, drawn as a Sankey with a "lost" branch after each. Pure. */

export interface FunnelStep {
  name: string;
  value: number;
}

export interface SankeyData {
  nodes: Array<{ name: string; value: number; lost?: boolean }>;
  links: Array<{ source: number; target: number; value: number }>;
}

/** Each step flows into the next; whoever does not continue flows into "Lost after …". */
export function funnelSankey(steps: FunnelStep[]): SankeyData {
  // A later step can never exceed an earlier one in a funnel.
  const clean: FunnelStep[] = [];
  for (const s of steps) {
    const prev = clean.at(-1);
    clean.push({
      name: s.name,
      value: Math.max(0, prev ? Math.min(s.value, prev.value) : s.value),
    });
  }
  const nodes: SankeyData["nodes"] = clean.map((s) => ({
    name: s.name,
    value: s.value,
  }));
  const links: SankeyData["links"] = [];
  clean.forEach((step, i) => {
    const next = clean[i + 1];
    if (!next) return;
    const lost = step.value - next.value;
    if (next.value > 0)
      links.push({ source: i, target: i + 1, value: next.value });
    if (lost > 0) {
      nodes.push({
        name: `Lost after ${step.name.toLowerCase()}`,
        value: lost,
        lost: true,
      });
      links.push({ source: i, target: nodes.length - 1, value: lost });
    }
  });
  return { nodes, links };
}

/** The step where the most people drop out, as a share of everyone at the top. */
export function worstDrop(
  steps: FunnelStep[]
): { from: string; to: string; lost: number; pctOfTop: number } | null {
  const top = steps[0]?.value ?? 0;
  if (top <= 0) return null;
  let best: {
    from: string;
    to: string;
    lost: number;
    pctOfTop: number;
  } | null = null;
  steps.forEach((step, i) => {
    const next = steps[i + 1];
    if (!next) return;
    const lost = step.value - next.value;
    if (lost > 0 && (!best || lost > best.lost)) {
      best = {
        from: step.name,
        to: next.name,
        lost,
        pctOfTop: Math.round((lost / top) * 1000) / 10,
      };
    }
  });
  return best;
}

/**
 * Reached → engaged → clicked → converted, across email and in-app push. A
 * step is left out when it cannot be counted (no conversions configured).
 */
export function campaignFunnelSteps(
  campaigns: CampaignAnalyticsOverview | undefined,
  attribution: OrgAttribution | undefined
): FunnelStep[] {
  const e = campaigns?.email ?? {};
  const p = campaigns?.inapp ?? {};
  const n = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  const reached = n(e.delivered) + n(p.delivered);
  const engaged = n(e.uniqueOpens) + n(p.viewed);
  const clicked = n(e.uniqueClicks) + n(p.clicked);
  const steps: FunnelStep[] = [
    { name: "Reached", value: reached },
    { name: "Engaged", value: engaged },
    { name: "Clicked", value: clicked },
  ];
  const converted = attribution?.attributed.wallets;
  if (typeof converted === "number")
    steps.push({ name: "Converted", value: converted });
  return steps;
}
