'use client';
import { PageHeader } from '@/components/page-header';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import { PLAN_IDS } from '@/lib/model';
import type { ByPlan, PlanEcoWithCurve, PlanId, ServeRow } from '@/lib/model-types';
import { MarginCurve, type MarginPoint } from '@/components/charts';

const IDS = PLAN_IDS as readonly PlanId[];

export function CostPerUserContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const eco = d.eco as unknown as ByPlan<PlanEcoWithCurve>;
  const serve = d.serve as unknown as ByPlan<ServeRow>;

  // The curve the old document drew: gross profit as a share of price, across utilisation.
  // One point per utilisation step, every package on the same axis.
  const curve = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5].map((u) => {
    const point: MarginPoint = { u: `${Math.round(u * 100)}%` };
    for (const id of IDS) point[id] = eco[id].gpPct(u);
    return point;
  });

  return (
    <>
      <PageHeader
        eyebrow="05 Cost per user"
        question="What does it cost to serve one customer for one month?"
        answer={`At ${f(s.util, 'p0')} utilisation, which assumes every customer consumes their whole allowance. That is the stress case this document uses; nothing here assumes light usage.`}
      />
      {controls}

      <Section>
        <FigureTable
          title="Cost to serve, by plan"
          description="Every cost line a single customer creates in a month, and what is left of their price after it."
          columns={[
            { key: 'l', label: 'Line' },
            ...IDS.map((id) => ({ key: id, label: s.plans[id].name, align: 'right' as const })),
          ]}
          rows={[
            { cells: ['Price', ...IDS.map((id) => f(eco[id].price, 'm2'))], emphasis: true },
            { cells: ['Metered usage', ...IDS.map((id) => f(serve[id].metered, 'm2'))] },
            { cells: ['Dedicated IP', ...IDS.map((id) => f(serve[id].ip, 'm2'))] },
            { cells: ['Card fees', ...IDS.map((id) => f(serve[id].stripe, 'm2'))] },
            { cells: ['Partner share', ...IDS.map((id) => f(serve[id].partner, 'm2'))] },
            { cells: ['Total cost to serve', ...IDS.map((id) => f(serve[id].total, 'm2'))], emphasis: true },
            { cells: ['Gross profit', ...IDS.map((id) => f(eco[id].floor, 'm2'))], emphasis: true, tone: 'good' },
            { cells: ['Gross margin', ...IDS.map((id) => f(eco[id].floorGM, 'p1'))] },
          ]}
          footnote="This is the floor, not the average: it is what the plan earns when a customer uses everything they paid for. Real usage leaves more."
        />
      </Section>

      <Section>
        <MarginCurve data={curve} />
      </Section>

      <Section>
        <FigureTable
          title="What the allowance is worth at list"
          description="What a customer would pay for the same usage bought by the unit, and the discount the plan represents."
          columns={[
            { key: 'l', label: 'Plan' },
            { key: 'price', label: 'Plan price', align: 'right' },
            { key: 'list', label: 'Same usage at list', align: 'right' },
            { key: 'save', label: 'Customer saves', align: 'right' },
          ]}
          rows={IDS.map((id) => ({
            cells: [s.plans[id].name, f(eco[id].price, 'm0'), f(eco[id].list, 'm0'), f(eco[id].save, 'p0')],
          }))}
        />
      </Section>
    </>
  );
}
