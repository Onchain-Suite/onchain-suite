'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import { PLAN_IDS } from '@/lib/model';
import type { ByPlan, PlanEco, PlanId } from '@/lib/model-types';

// From the model, so adding a package cannot leave a page behind.
const IDS = PLAN_IDS as readonly PlanId[];

export function UnitEconomicsContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const gp = d.gpUtil as unknown as ByPlan<number>;
  // derive() writes plan prices back onto the state it is given, and it is given a clone,
  // so the price is read from the derived side and never from s.plans.
  const eco = d.eco as unknown as ByPlan<PlanEco>;

  return (
    <>
      <PageHeader
        eyebrow="06 Unit economics"
        question="What is a customer worth, and what could we afford to pay for one?"
        answer={`At ${f(s.fin.churn, 'p0')} monthly churn an average customer stays ${f(d.life, 'n0')} months. Churn has never been measured against a cohort, so this is the number to replace first.`}
      />
      {controls}

      <StatRow>
        <Stat value={f(d.gpMeasured, 'm0')} label={`Measured: the average across the ${f(d.payingCount, 'n0')} customers paying today`} />
        <Stat value={f(d.blendGPAll, 'm0')} label="Forecast mix: what that average becomes if the book we plan to win arrives. A target, not a measurement" />
        <Stat value={f(d.ltvBlendAll, 'm0')} label="Lifetime value across the whole book, excluding on-chain overage" />
        <Stat value={f(d.cacCeiling, 'm0')} label={`The most we could pay to win a customer and still hit ${f(s.ltvCacTarget, 'n0')}:1 on lifetime value, on the whole-book figure`} />
        <Stat value={f(d.payback, 'n1') + ' mo'} label="Months to earn back what a customer costs to acquire" />
        <Stat value={f(d.arpu, 'm0')} label="Average revenue per Suite customer per month" />
        <Stat value={f(d.plateau, 'n0')} label="Where a flat intake settles: customers arriving divided by the churn rate" />
      </StatRow>

      <Section>
        <FigureTable
          title="Gross profit and lifetime value by plan"
          description="What each tier earns in a month once a customer has used their whole allowance, and what that is worth over an average life."
          columns={[
            { key: 'p', label: 'Plan' },
            { key: 'gp', label: 'Gross profit a month', align: 'right' },
            { key: 'ltv', label: 'Lifetime value', align: 'right' },
            { key: 'share', label: 'Share of new customers', align: 'right' },
          ]}
          rows={IDS.map((id) => ({
            cells: [
              s.plans[id].name,
              f(gp[id], 'm2'),
              f(gp[id] * d.life, 'm0'),
              f(s.mix[id] ?? 0, 'p0'),
            ],
          }))}
          footnote="Lifetime value here is subscription gross profit only. On-chain overage is not in it, which is why the projection's revenue per customer runs higher than these figures. The three tiers below are Suite; Send earns far less per customer and is a quarter of the book, which is what separates the two blended figures above."
        />
      </Section>

      <Section>
        <FigureTable
          title="Does every plan clear the rule?"
          description="The rule is that a plan's price must exceed the cost of its own full allowance. A breach would be listed here."
          columns={[
            { key: 'p', label: 'Plan' },
            { key: 'price', label: 'Price', align: 'right' },
            { key: 'cost', label: 'Cost of full allowance', align: 'right' },
            { key: 'floor', label: 'What is left', align: 'right' },
          ]}
          rows={IDS.map((id) => ({
            cells: [s.plans[id].name, f(eco[id].price, 'm0'), f(eco[id].price - gp[id], 'm2'), f(gp[id], 'm2')],
            tone: gp[id] > 0 ? ('good' as const) : ('bad' as const),
          }))}
          footnote={
            d.floorsOk
              ? 'Every plan passes. There was once a 70% margin floor asserted here as well; it appears nowhere in the pricing source of truth and was removed on 17 September.'
              : 'A plan is below the rule. Reprice it or cut the allowance.'
          }
        />
      </Section>
    </>
  );
}
