'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section, type Row } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import type { FinYear } from '@/lib/model-types';
import { monthLabel } from '@/lib/workings';

type Hire = { role: string; gbp: number; start: number; ungated?: boolean; equipment?: false; bumpGbp?: number; bumpFrom?: number };
import { CashCurve, RevenueByYear } from '@/components/charts';

export function FinancialModelContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const years = d.fin.years as unknown as FinYear[];
  const cols = [{ key: 'line', label: 'Line' }, ...years.map((y) => ({ key: y.label, label: y.label, align: 'right' as const }))];
  const line = (label: string, get: (y: FinYear) => number, fmtCode = 'm0', opts: Partial<Row> = {}): Row => ({
    cells: [label, ...years.map((y) => f(get(y), fmtCode))],
    ...opts,
  });

  return (
    <>
      <PageHeader
        eyebrow="07 Financial model"
        question="What does the business look like over five statutory years?"
        answer={`${d.fin.months} forecast months from ${s.fin.startMonth}/${s.fin.startYear}, cut on the 31 July year end at Companies House, so the first block is ${years[0].months} months. That is a forecast segment, not a confirmed statutory or tax period: first accounts and Corporation Tax periods can differ and need confirming with the accountant.`}
      />
      {controls}

      <StatRow>
        <Stat value={f(years[4].rev, 'm0')} label="Revenue in FY2031, the last modelled year" />
        <Stat value={f(years[4].endMrr, 'm0')} label="Monthly recurring revenue at the end of FY2031, subscriptions only" />
        <Stat value={f(years[4].endCust, 'n0')} label="Customers on the book at the end of FY2031" />
        <Stat value={f(years[4].profitAfterTax, 'm0')} label="Profit after corporation tax in FY2031" tone={years[4].profitAfterTax >= 0 ? 'good' : 'bad'} />
        <Stat value={f(years[4].endCash, 'm0')} label="Cash at the end of FY2031" tone={years[4].endCash >= 0 ? 'good' : 'bad'} />
        <Stat value={f(d.fin.alchemy5y, 'm0')} label="Total on-chain data cost across the five years, allowance and overage together" />
      </StatRow>

      <div className="grid grid-cols-1 gap-4 px-4 @4xl/main:grid-cols-2 lg:px-6">
        <RevenueByYear data={years.map((y) => ({ label: y.label, rev: y.rev }))} />
        <CashCurve data={d.fin.rows.map((r) => ({ m: `M${r.m}`, cash: r.cash }))} />
      </div>


      <Section>
        <FigureTable
          title="Who is on payroll, and from when"
          description="Two founder salary lines and four hires. Everyone starts at the National Living Wage except the two engineering roles, which sit at the researched UK average for the work."
          columns={[
            { key: 'r', label: 'Role' },
            { key: 'm', label: 'From' },
            { key: 'b', label: 'Base salary', align: 'right' },
            { key: 'l', label: `Loaded, plus ${f(s.fin.employerOncost, 'p0')}`, align: 'right' },
            { key: 'mo', label: 'A month', align: 'right' },
            { key: 'e', label: 'Equipment', align: 'right' },
          ]}
          rows={(s.fin.hires as Hire[]).map((h) => ({
            cells: [
              h.role,
              monthLabel(s, h.start) + (h.ungated ? ' (not gated on the raise)' : ''),
              h.bumpGbp
                ? `\u00a3${h.gbp.toLocaleString('en-GB')}, \u00a3${(h.gbp + h.bumpGbp).toLocaleString('en-GB')} from ${monthLabel(s, h.bumpFrom ?? h.start)}`
                : '\u00a3' + h.gbp.toLocaleString('en-GB'),
              '\u00a3' + Math.round((h.gbp + (h.bumpGbp ?? 0)) * (1 + s.fin.employerOncost)).toLocaleString('en-GB'),
              '\u00a3' + Math.round(((h.gbp + (h.bumpGbp ?? 0)) * (1 + s.fin.employerOncost)) / 12).toLocaleString('en-GB'),
              h.equipment === false ? 'none' : '\u00a3' + s.perHire.equipmentGbp.toLocaleString('en-GB'),
            ],
            emphasis: h.ungated,
          }))}
          footnote={
            <>
              The two founder lines are <b>ungated</b>: the company owes a wage from the month the person starts,
              whether or not the raise closes. Every other hire is paid only once the raise has landed and gross
              profit covers it, so a start month here is the earliest a person can join, not a promise that the
              month is affordable. <b>Read the months actually paid off the monthly working on page 13.</b> There
              is no recruitment allowance: hiring is done by the founders through their own network. Equipment is
              capital, written off over {f(s.perHire.equipLifeMonths, 'n0')} months; the two founders take none,
              because they are already working on the product.
            </>
          }
        />
      </Section>
      <Section>
        <FigureTable
          title="Profit and loss"
          description="Five statutory years. The founder pool is waived before the raise, so it is not charged and no liability arises. The CEO is a separate line: a salary from June 2027, inside operating costs, paid whether or not the raise lands."
          columns={cols}
          rows={[
            line('Revenue', (y) => y.rev),
            line('Cost of sales', (y) => -y.cogs),
            line('Gross profit', (y) => y.gp, 'm0', { emphasis: true }),
            line('Operating costs', (y) => -y.opex),
            line('EBITDA', (y) => y.ebitda, 'm0', { emphasis: true }),
            line('Depreciation', (y) => -y.deprec),
            line('Operating profit', (y) => y.ebit),
            line('Corporation tax', (y) => -y.tax),
            line('Profit after tax', (y) => y.profitAfterTax, 'm0', { emphasis: true }),
          ]}
          footnote={
            <>
              Corporation tax is charged at {f(s.tax.smallRate, 'p0')} to the lower limit and {f(s.tax.mainRate, 'p0')} above the
              upper, with marginal relief between. The limits are divided between associated companies, because the founders control
              Datum Labs as well, and pro-rated for the {years[0].months}-month FY2027 stub. It is paid nine months after the year
              end, which is why the charge and the payment sit in different years.
            </>
          }
        />
      </Section>

      <Section>
        <FigureTable
          title="Customers and recurring revenue at each year end"
          description="The book as it stands on 31 July each year, and what it bills monthly at that point."
          columns={cols}
          rows={[
            line('Customers', (y) => y.endCust, 'n0'),
            line('Monthly recurring revenue', (y) => y.endMrr),
            line('Cash', (y) => y.endCash, 'm0', { emphasis: true }),
          ]}
        />
      </Section>

      <Section>
        <FigureTable
          title="Cash flow"
          description="Cash is not profit. This reconciles the two, and its closing balance ties to the balance sheet in every year."
          columns={cols}
          rows={[
            { cells: ['Opening cash', ...d.fin.cashflow.map((c) => f(c.open, 'm0'))] },
            { cells: ['EBITDA', ...d.fin.cashflow.map((c) => f(c.ebitda, 'm0'))] },
            { cells: ['Tax paid', ...d.fin.cashflow.map((c) => f(-c.taxPaid, 'm0'))] },
            { cells: ['Movement in working capital', ...d.fin.cashflow.map((c) => f(c.prepaidMove + c.payrollMove, 'm0'))] },
            { cells: ['Operating cash flow', ...d.fin.cashflow.map((c) => f(c.operating, 'm0'))], emphasis: true },
            { cells: ['Investing (equipment)', ...d.fin.cashflow.map((c) => f(c.investing, 'm0'))] },
            { cells: ['Financing (bridge and raise)', ...d.fin.cashflow.map((c) => f(c.financing, 'm0'))] },
            { cells: ['Closing cash', ...d.fin.cashflow.map((c) => f(c.close, 'm0'))], emphasis: true },
          ]}
          footnote="Operating cash is EBITDA less the tax actually paid and the movement in working capital. Investing is equipment. Financing is the founder bridge and the raise."
        />
      </Section>

      <Section>
        <FigureTable
          title="Statement of financial position"
          description="What the company owns and owes at each year end. The check row is assets less liabilities less equity and must be zero."
          columns={cols}
          rows={[
            { cells: ['Cash', ...d.fin.balanceSheet.map((b) => f(b.assets.cash, 'm0'))] },
            { cells: ['Prepayments', ...d.fin.balanceSheet.map((b) => f(b.assets.prepaid, 'm0'))] },
            { cells: ['Equipment, net book value', ...d.fin.balanceSheet.map((b) => f(b.assets.equipment, 'm0'))] },
            { cells: ['Total assets', ...d.fin.balanceSheet.map((b) => f(b.totalAssets, 'm0'))], emphasis: true },
            { cells: ['Payroll creditor', ...d.fin.balanceSheet.map((b) => f(b.liabilities.payroll, 'm0'))] },
            { cells: ['Corporation tax creditor', ...d.fin.balanceSheet.map((b) => f(b.liabilities.tax, 'm0'))] },
            { cells: ["Director's loan (founder bridge)", ...d.fin.balanceSheet.map((b) => f(b.liabilities.directorsLoan, 'm0'))] },
            { cells: ['Total liabilities', ...d.fin.balanceSheet.map((b) => f(b.totalLiab, 'm0'))], emphasis: true },
            { cells: ['Share capital', ...d.fin.balanceSheet.map((b) => f(b.equity.shareCapital, 'm0'))] },
            { cells: ['Capital raised', ...d.fin.balanceSheet.map((b) => f(b.equity.capitalRaised, 'm0'))] },
            { cells: ['Retained earnings', ...d.fin.balanceSheet.map((b) => f(b.equity.retained, 'm0'))] },
            { cells: ['Check', ...d.fin.balanceSheet.map((b) => (Math.abs(b.check) < 0.01 ? '0' : f(b.check, 'm2')))], emphasis: true },
          ]}
          footnote="The founder bridge sits in liabilities as a director\u2019s loan, not in equity: no shares are issued for it, so it is money the company owes. It carries no interest and no repayment date inside the forecast, so it runs to July 2031 unchanged. Retained earnings is not a balancing figure. It rolls forward from profit after tax, cash comes independently from the month-by-month projection, and the check compares them. Tested by moving profit without moving cash: the check broke by exactly that amount in every year, so a discrepancy shows here rather than being absorbed. The one plug is the OPENING retained earnings, which is share capital issued and spent before the model starts."
        />
      </Section>
    </>
  );
}
