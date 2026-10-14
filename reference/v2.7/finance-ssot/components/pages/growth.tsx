'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import { PLAN_IDS } from '@/lib/model';
import type { FinYear, PlanId } from '@/lib/model-types';
import { CustomerCurve } from '@/components/charts';

export function GrowthContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const years = d.fin.years as unknown as FinYear[];

  return (
    <>
      <PageHeader
        eyebrow="08 Growth and retention"
        question="How does the book grow, and what holds it back?"
        answer={`Signups run at ${f(s.launch.preLaunch, 'n1')} a month until the public beta in month ${f(s.launch.month, 'n0')}, then ramp to full velocity over ${f(s.launch.rampMonths, 'n0')} months. Only after that does acquisition compound, and the rate itself decays toward a floor.`}
      />
      {controls}

      <StatRow>
        <Stat value={f(s.fin.newPerMonth, 'n0')} label="New customers a month at full velocity" />
        <Stat value={f(s.fin.newGrowth, 'p0')} label="Monthly growth in that intake, decaying toward a floor rather than compounding forever" />
        <Stat value={f(s.fin.churn, 'p0')} label="Monthly churn. Never measured against a cohort; one customer has left, which is not a rate" />
        <Stat value={f(d.plateau, 'n0')} label="Where a flat intake would settle, if the rate stopped growing" />
      </StatRow>

      <Section>
        <CustomerCurve data={d.fin.rows.map((r) => ({ m: `M${r.m}`, customers: r.allCust }))} />
      </Section>

      <Section>
        <FigureTable
          title="The book at each year end"
          description="Customers on the book, what they bill monthly, and the revenue that produces across the year."
          columns={[
            { key: 'y', label: 'Year' },
            { key: 'c', label: 'Customers', align: 'right' },
            { key: 'm', label: 'Monthly recurring revenue', align: 'right' },
            { key: 'r', label: 'Revenue for the year', align: 'right' },
          ]}
          rows={years.map((y) => ({
            cells: [y.label, f(y.endCust, 'n0'), f(y.endMrr, 'm0'), f(y.rev, 'm0')],
          }))}
          footnote="At 5% monthly churn only about 4.8% of today's book survives to month 59, so this plan rests almost entirely on customers not yet won."
        />
      </Section>

      <Section>
        <FigureTable
          title="Where new customers land"
          description="The mix describes who we win, not who we have. The opening book is seeded by name instead."
          columns={[
            { key: 'p', label: 'Plan' },
            { key: 's', label: 'Share of new Suite customers', align: 'right' },
          ]}
          rows={[
            ...(PLAN_IDS as readonly PlanId[]).map((id) => ({ cells: [s.plans[id].name, f(s.mix[id] ?? 0, 'p0')] })),
            { cells: ['Send, as a share of all signups', f(s.sendPlan.shareEnd, 'p0')] },
          ]}
          footnote="Pro becomes the largest share of revenue on this mix, and no customer has ever bought it. The highest price ever invoiced is $349. That is a decision about who we sell to, not an observation."
        />
      </Section>
    </>
  );
}
