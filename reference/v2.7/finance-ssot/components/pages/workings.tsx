'use client';
import * as React from 'react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/figure-table';
import { MonthlyTable, type MonthCol } from '@/components/monthly-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModel } from '@/lib/use-model';
import { monthLabel, runScenario, toCsv } from '@/lib/workings';
import { PLAN_IDS } from '@/lib/model';
import type { ByPlan, PlanId } from '@/lib/model-types';

const IDS = PLAN_IDS as readonly PlanId[];
type Row = Record<string, number> & { byTier: Record<PlanId, number> };

export function WorkingsContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const rows = d.fin.rows as unknown as Row[];
  // chainFull / chainOverCredits / chainOverCost are seeded as {} and filled per plan.
  const chainFull = d.chainFull as unknown as ByPlan<number>;
  const chainOverCredits = d.chainOverCredits as unknown as ByPlan<number>;
  const chainOverCost = d.chainOverCost as unknown as ByPlan<number>;
  const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
  const n1 = (v: number) => v.toFixed(1);

  // The downside, run month for month against the base rather than quoted from memory.
  const bear = React.useMemo(() => runScenario(s, 'bear'), [s]);
  const bearRows = bear.fin.rows as unknown as Row[];

  const month: MonthCol<Row> = { key: 'm', label: 'Month', get: (_, i) => monthLabel(s, i + 1) };

  const download = () => {
    const blob = new Blob([toCsv(s)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `onchainsuite-monthly-working-${s.fin.startYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        eyebrow="13 Monthly working"
        question="How does the forecast actually get to its numbers?"
        answer="Every month of the projection, as the schedules it is made of: customers in and out, what they subscribe for, what they consume beyond their allowance, what we spend, and how that lands in profit, cash and the balance sheet. The five-year statements are the answer; this is the working behind it."
      />
      {controls}

      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Check it yourself</CardTitle>
            <CardDescription>
              Every field the projection carries, one row per month, as a spreadsheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Button onClick={download} className="gap-1.5">
              <DownloadSimpleIcon />
              Download the monthly working
            </Button>
            <span>
              {d.fin.months} months, every driver and every derived figure, at the currency and scenario
              currently set. Arithmetic can be checked from the printed document; formula behaviour cannot,
              which is what this is for.
            </span>
          </CardContent>
        </Card>
      </Section>

      {/* 1 ------------------------------------------------------------ */}
      <Section>
        <MonthlyTable
          title="1. Customers in and out, and the revenue they produce"
          description="Opening book, who joined, who left, closing book, split by plan. Multiply each plan's customers by its price and that is the subscription line. Onramp sits beside it: a one-off programme, not a subscription, so it is counted in starts rather than in customers."
          rows={rows}
          columns={[
            month,
            { key: 'open', label: 'Opening', get: (r, i) => n1(i === 0 ? d.startCustomers : rows[i - 1].allCust) },
            { key: 'gain', label: 'Joined', get: (r) => n1(r.gained + r.gainedSend) },
            { key: 'churnS', label: 'Left, Suite', get: (r) => '-' + n1(r.churned) },
            { key: 'churnSend', label: 'Left, Send', get: (r) => '-' + n1(r.churnedSend) },
            { key: 'churn', label: 'Left, total', get: (r) => '-' + n1(r.churnedAll) },
            { key: 'close', label: 'Closing', get: (r) => n1(r.allCust), total: true },
            ...IDS.map((id) => ({ key: id, label: s.plans[id].name, get: (r: Row) => n1(r.byTier[id]) })),
            { key: 'send', label: 'Send', get: (r) => n1(r.sendCust) },
            { key: 'suiteRev', label: 'Suite subs', get: (r) => f(r.subsSuite, 'm0'), total: true },
            { key: 'sendRev', label: 'Send subs', get: (r) => f(r.subsSend, 'm0') },
            { key: 'subs', label: 'Subscription revenue', get: (r) => f(r.subs, 'm0'), total: true },
            { key: 'orStart', label: 'Onramp starts', get: (r) => n1(r.orStart) },
            { key: 'orEnt', label: 'of those, Enterprise', get: (r) => n1(r.orStartEnt) },
            { key: 'orRun', label: 'Onramp running', get: (r) => n1(r.orRunning) },
            { key: 'orRev', label: 'Onramp fees', get: (r) => f(r.orRevenue, 'm0'), total: true },
          ]}
          footnote={
            <>
              <b>Opening plus joined minus left equals closing, in all {d.fin.months} months.</b> Until 26 September
              the Left column carried Suite churn only and omitted Send, so every month appeared to lose about 0.4 of
              a customer that the projection had in fact already removed. The model was right; the column was
              incomplete. An external reviewer spotted it on the July 2027 row.
              <br />
              <br />
              <b>Onramp is not subscription revenue.</b> The P&amp;L revenue line is subscription plus usage plus
              Onramp fees, so this schedule and table 4 only tie once the Onramp column is read with them. Starts
              are capped by who can deliver: {f(s.onramp.startCapBefore, 'n0')} a month while the founders do it,
              then {f(s.onramp.concurrentCapAfter, 'n0')} open at once from the month the customer success manager
              starts, counted across both shapes. An Enterprise engagement stays open for the whole sales cycle,
              so it occupies a slot far longer than a Growth programme does, and the Running column reflects that
              rather than counting starts.
              <br />
              <br />
              <b>Plan changes are not modelled.</b> A customer joins a plan and stays on it until they churn;
              there is no upgrade or downgrade path. Real books move customers between tiers, and that movement
              would change the mix independently of who joins. Naming it rather than approximating it, because an
              invented upgrade rate would look like evidence.
            </>
          }
        />
      </Section>

      {/* 2 ------------------------------------------------------------ */}
      <Section>
        <MonthlyTable
          title="2. Consumption beyond the allowance, and the usage revenue it produces"
          description="Each Suite customer's list implies a number of on-chain credits a month. The plan bundles some; the rest bills at list. That difference is the usage line."
          rows={rows}
          columns={[
            month,
            { key: 'suite', label: 'Suite customers', get: (r) => n1(IDS.reduce((a, id) => a + r.byTier[id], 0)) },
            { key: 'need', label: 'Credits a full pass needs', get: (r) => n0(IDS.reduce((a, id) => a + r.byTier[id] * chainFull[id], 0)) },
            { key: 'bundled', label: 'Bundled in the plans', get: (r) => n0(IDS.reduce((a, id) => a + r.byTier[id] * s.plans[id].chain, 0)) },
            { key: 'over', label: 'Billed as overage', get: (r) => n0(IDS.reduce((a, id) => a + r.byTier[id] * chainOverCredits[id], 0)), total: true },
            { key: 'overRev', label: 'Usage revenue', get: (r) => f(r.overage, 'm0'), total: true },
            { key: 'overCost', label: 'What those credits cost us', get: (r) => f(IDS.reduce((a, id) => a + r.byTier[id] * chainOverCost[id], 0), 'm0') },
          ]}
          footnote={
            <>
              <b>Zero by design, since 26 September.</b> Every package now bundles one full enrichment pass of
              its own contacts, so a customer who enriches their whole list once a month buys nothing extra and
              this column is empty. The cost of that pass is in the subscription: $1.05 on Launch, $10.53 on
              Growth. Until 26 September the bundles covered about 13% of a pass and the remaining 87% was
              assumed to be purchased at seven times cost, which put a third of projected revenue on a purchase
              decision nobody had observed. What is still unmeasured is activity <i>beyond</i> one pass: a wallet
              that transacts is re-enriched on the event, debounced to fifteen minutes, so a very active list can
              consume more than one pass. That would show here, and it is a cost question now, not a revenue one.
            </>
          }
        />
      </Section>

      {/* 3 ------------------------------------------------------------ */}
      <Section>
        <MonthlyTable
          title="3. What we spend, line by line"
          description="Delivery costs scale with customers; overheads and hosting do not; salaries start when a hire does. Cost of sales first, then operating costs."
          rows={rows}
          columns={[
            month,
            { key: 'cMet', label: 'Metered usage', get: (r) => f(r.cMet, 'm0') },
            { key: 'cIp', label: 'Dedicated IPs', get: (r) => f(r.cIp, 'm0') },
            { key: 'cStripe', label: 'Card fees', get: (r) => f(r.cStripe, 'm0') },
            { key: 'cPart', label: 'Partner share', get: (r) => f(r.cPart, 'm0') },
            { key: 'orCost', label: 'Onramp hours', get: (r) => f(r.orCost, 'm0') },
            { key: 'cogs', label: 'Cost of sales', get: (r) => f(r.cogs, 'm0'), total: true },
            { key: 'oInf', label: 'Hosting', get: (r) => f(r.oInf, 'm0') },
            { key: 'oOvh', label: 'Overheads', get: (r) => f(r.oOvh, 'm0') },
            { key: 'oEng', label: 'Salaries', get: (r) => f(r.oEng, 'm0') },
            { key: 'oFnd', label: 'Founder pay', get: (r) => f(r.oFnd, 'm0') },
            { key: 'oSup', label: 'Support', get: (r) => f(r.oSup, 'm0') },
            { key: 'oCac', label: 'Acquisition', get: (r) => f(r.oCac, 'm0') },
            { key: 'opex', label: 'Operating costs', get: (r) => f(r.opex, 'm0'), total: true },
            { key: 'capex', label: 'Equipment', get: (r) => f(r.capex, 'm0') },
            { key: 'head', label: 'Headcount', get: (r) => n0(r.headcount) },
          ]}
          footnote={
            <>
              <b>The contractor is not here, and that is correct.</b> A developer works on the product and is paid by{' '}
              <b>Datum Labs</b>, not by OnchainSuite. The cost sits with Datum Labs, so it is outside these numbers
              rather than hidden inside them, and no OnchainSuite payroll expense is invented to represent it. This
              page previously said a founder paid him personally; that was wrong and was corrected on 26 September.
              Support is zero because founders do it, which is a decision about payroll, not an observation about
              effort. There is no recruitment allowance: hiring is done by the founders through their own network, so the only cost that arrives with a hire is the equipment column.
              </>
          }
        />
      </Section>

      {/* 4 ------------------------------------------------------------ */}
      <Section>
        <MonthlyTable
          title="4. From profit to cash to the balance sheet"
          description="Revenue less cost is profit; profit plus the things that move cash but not profit, and minus the things that move profit but not cash, is the closing balance."
          rows={rows}
          columns={[
            month,
            { key: 'rev', label: 'Revenue', get: (r) => f(r.revenue, 'm0') },
            { key: 'cogs', label: 'Cost of sales', get: (r) => f(-r.cogs, 'm0') },
            { key: 'gp', label: 'Gross profit', get: (r) => f(r.gp, 'm0'), total: true },
            { key: 'opex', label: 'Operating costs', get: (r) => f(-r.opex, 'm0') },
            { key: 'ebitda', label: 'EBITDA', get: (r) => f(r.ebitda, 'm0'), total: true },
            { key: 'dep', label: 'Depreciation', get: (r) => f(-r.deprec, 'm0') },
            { key: 'ebit', label: 'Operating profit', get: (r) => f(r.ebit, 'm0'), total: true },
            { key: 'taxDue', label: 'Tax paid', get: (r) => f(-r.taxDue, 'm0') },
            { key: 'capex', label: 'Equipment bought', get: (r) => f(-r.capex, 'm0') },
            { key: 'fin', label: 'Bridge and raise', get: (r, i) => f((r.founderIn - (i ? rows[i - 1].founderIn : 0)) + (r.raisedIn - (i ? rows[i - 1].raisedIn : 0)), 'm0') },
            { key: 'cash', label: 'Closing cash', get: (r) => f(r.cash, 'm0'), total: true },
            { key: 'nbv', label: 'Equipment on the sheet', get: (r) => f(r.equipNbv, 'm0') },
            { key: 'cred', label: 'Payroll creditor', get: (r) => f(r.payrollPayable, 'm0') },
          ]}
          footnote={
            <>
              Depreciation reduces profit without moving cash; buying the equipment moved cash without touching
              profit, and sits on the balance sheet instead. Corporation tax is charged on a finished year and paid
              nine months later, which is why the charge and the payment are in different months. Retained earnings
              rolls forward from profit after tax while cash comes from this column, and the balance sheet check on
              page 07 compares the two independently.
            </>
          }
        />
      </Section>

      {/* 5 ------------------------------------------------------------ */}
      <Section>
        <MonthlyTable
          title="5. The downside, month by month, against the base"
          description="Bear run in full alongside the base case: 8% churn, three customers a month, slower growth, a weaker mix and customers enriching half their list. Not a description of a downside - the same model, re-run."
          rows={rows}
          columns={[
            month,
            { key: 'bc', label: 'Base cash', get: (r) => f(r.cash, 'm0') },
            { key: 'kc', label: 'Bear cash', get: (_, i) => f(bearRows[i]?.cash ?? 0, 'm0'), total: true },
            { key: 'bcu', label: 'Base customers', get: (r) => n1(r.allCust) },
            { key: 'kcu', label: 'Bear customers', get: (_, i) => n1(bearRows[i]?.allCust ?? 0) },
            { key: 'bh', label: 'Base headcount', get: (r) => n0(r.headcount) },
            { key: 'kh', label: 'Bear headcount', get: (_, i) => n0(bearRows[i]?.headcount ?? 0) },
            { key: 'be', label: 'Bear EBITDA', get: (_, i) => f(bearRows[i]?.ebitda ?? 0, 'm0') },
          ]}
          footnote={
            <>
              <b>Hiring is not integrated with the downside.</b> Hires fire on fixed months once the raise lands,
              with no revenue or cash test, so the bear column hires exactly as the base column does into a book
              that cannot carry it. That is why bear runs out of money, and removing the hires from bear turns a{' '}
              {f(Math.abs(bearRows[bearRows.length - 1]?.cash ?? 0), 'm0')} hole into a surplus. Until each hire is
              gated on trailing gross profit and a cash buffer, this row is the cost of hiring into a downturn
              rather than a genuine managed downside.
            </>
          }
        />
      </Section>
    </>
  );
}
