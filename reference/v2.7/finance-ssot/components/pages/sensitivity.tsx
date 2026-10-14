'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';

type CostRow = { n: string; own: string; cur: string; moved: string; to: string; gp: number; delta: number };
type BizRow = { n: string; base: string; tested: string; cash: number; delta: number };

export function SensitivityContent({ controls }: { controls?: React.ReactNode }) {
  const { d, f } = useModel();
  const cost = (d.sens ?? []) as unknown as CostRow[];
  const biz = (d.bizSens ?? []) as unknown as BizRow[];
  const live = biz.filter((r) => Math.abs(r.delta) > 0.005);
  const dead = biz.filter((r) => Math.abs(r.delta) <= 0.005);
  const biggestCost = cost.reduce((a, r) => Math.max(a, Math.abs(r.delta)), 0);
  const biggestBiz = live.reduce((a, r) => Math.max(a, Math.abs(r.delta)), 0);

  return (
    <>
      <PageHeader
        eyebrow="14 Sensitivity"
        question="Which assumptions actually move the outcome?"
        answer="Each lever moved on its own, everything else held, and the model re-run. Cost levers are measured on gross profit per customer; business levers on cash at the end of five years. They are deliberately on different scales, because that difference is the finding."
      />
      {controls}

      <StatRow>
        <Stat value={f(biggestCost, 'm0')} label="The most any single cost lever moves gross profit per customer a month" />
        <Stat value={f(biggestBiz, 'm0')} label="The most any single business lever moves cash across five years" tone="good" />
        <Stat value={f(biggestCost > 0 ? biggestBiz / biggestCost : 0, 'n0') + 'x'} label="How much further the business levers reach than the cost levers" />
      </StatRow>

      <Section>
        <FigureTable
          title="Cost levers, on gross profit per customer"
          description="Each supplier rate or efficiency assumption moved on its own. The figure is the change in blended gross profit per customer per month."
          columns={[
            { key: 'n', label: 'Lever' },
            { key: 'own', label: 'Owner' },
            { key: 'cur', label: 'Now', align: 'right' },
            { key: 'to', label: 'Tested at', align: 'right' },
            { key: 'gp', label: 'Gross profit', align: 'right' },
            { key: 'delta', label: 'Change', align: 'right' },
          ]}
          rows={cost.map((r) => ({
            cells: [r.n, <span key="o" className="text-muted-foreground">{r.own}</span>, r.cur, r.to, f(r.gp, 'm2'), f(r.delta, 'm2')],
            tone: r.delta >= 0 ? ('good' as const) : ('bad' as const),
          }))}
        />
      </Section>

      <Section>
        <FigureTable
          title="Business levers, on cash at the end of five years"
          description="How many customers arrive, how fast that grows, how many stay, how much of their allowance they use, and what they buy beyond it."
          columns={[
            { key: 'n', label: 'Lever' },
            { key: 'base', label: 'Now', align: 'right' },
            { key: 'tested', label: 'Tested at', align: 'right' },
            { key: 'cash', label: 'End cash', align: 'right' },
            { key: 'delta', label: 'Change', align: 'right' },
          ]}
          rows={live.map((r) => ({
            cells: [r.n, r.base, r.tested, f(r.cash, 'm0'), f(r.delta, 'm0')],
            tone: r.delta >= 0 ? ('good' as const) : ('bad' as const),
          }))}
          footnote={
            dead.length ? (
              <>
                <b>{dead.map((r) => r.n.toLowerCase()).join(' and ')}</b>{' '}
                {dead.length === 1 ? 'is' : 'are'} not shown as a test, because{' '}
                {dead.length === 1 ? 'it is' : 'both are'} zero by decision: there is no paid acquisition and founders do
                support. Doubling zero is still zero, so the row would report no effect and read as though the lever did
                not matter, when in truth it has never been switched on.
              </>
            ) : undefined
          }
        />
      </Section>

      <Section>
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <p>
            <b className="text-foreground">The comparison is the point, and it is a negative result.</b> The largest cost
            lever in this document moves gross profit by {f(biggestCost, 'm0')} per customer per month. The largest
            business lever moves {f(biggestBiz, 'm0')} of cash. Shaving every supplier rate we have is worth a fraction
            of what one point of churn or one extra customer a month is worth.
          </p>
          <p className="pt-3">
            That is kept here because it is honest arithmetic on our own figures, and because it points effort somewhere.
            It says the year is not won by renegotiating with AWS. It is won on acquisition and retention, which are also
            the two assumptions in this document with the least evidence behind them.
          </p>
        </div>
      </Section>
    </>
  );
}
