'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FigureTable, Section } from '@/components/figure-table';
import { PLAN_IDS } from '@/lib/model';
import type { ByPlan, PlanEco, PlanId } from '@/lib/model-types';
import { useModel } from '@/lib/use-model';

export function OverviewContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const measuredShare = d.dq.total > 0 ? d.dq.measured / d.dq.total : 0;
  // Plan prices live on the derived side: derive() writes them onto the state it is handed,
  // and the store hands it a clone. Reading s.plans[id].price gives undefined.
  const eco = d.eco as unknown as ByPlan<PlanEco>;
  const suiteRevTotal = (PLAN_IDS as readonly PlanId[]).reduce((a, k) => a + (s.mix[k] ?? 0) * eco[k].price, 0);
  // ?? [] so a state that predates this list renders an empty table rather than throwing.
  const customers = (s.fin.customers ?? []) as {
    name: string; plan: string | null; status: string; since?: string; until?: string; use?: string; note?: string;
  }[];
  const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    paying: { label: 'Paying', variant: 'default' },
    pipeline: { label: 'Not yet paying', variant: 'secondary' },
    churned: { label: 'Former', variant: 'outline' },
    internal: { label: 'Internal', variant: 'outline' },
  };
  const planName = (p: string | null) =>
    p === 'send' ? 'Send' : p === 'launch' ? s.plans.launch.name : p === 'growth' ? s.plans.growth.name : p === 'pro' ? s.plans.pro.name : 'n/a';

  return (
    <>
      <PageHeader
        eyebrow="01 Overview"
        question="The finance single source of truth"
        answer="Every number the company plans against, with its derivation. Each figure is either an input or is calculated from one, so changing an input recalculates the whole document."
      />
      {controls}

      <StatRow>
        <Stat value={f(d.gpMeasured, 'm0')} label={`Measured gross profit per customer, across the ${f(d.payingCount, 'n0')} customers paying today`} />
        <Stat value={f(d.blendGPAll, 'm0')} label="The same figure on the FORECAST mix, not today's book. It assumes 25% Send and a tier split we have not sold yet" />
        <Stat value={f(d.minFloorGM, 'p0')} label="Worst gross margin any tier reaches when a customer consumes its whole allowance" />
        <Stat value={f(d.beFull, 'n0')} label="Customers needed to cover infrastructure and current operating costs" />
        <Stat value={`M${d.fin.breakevenMonth}`} label="First month EBITDA turns positive, in the base case" />
        <Stat
          value={f(d.fin.raiseNeeded, 'm0')}
          label="External capital the base case needs, measured before the raise and the founder bridge are counted"
        />
        <Stat value={f(d.fin.years[4].rev, 'm0')} label="Revenue in FY2031, the last of the five statutory years modelled" />
      </StatRow>

      <Section>
        <FigureTable
          title="What we sell, and who we expect to buy it"
          description="Five packages on one price curve. A contact is one identifier: an email, a wallet, a Telegram or X handle each count as one. The share column is who we expect to win, not who we hold today; the revenue column is what that does to the book."
          columns={[
            { key: 'p', label: 'Package' },
            { key: 'c', label: 'Contacts', align: 'right' },
            { key: 'pr', label: 'Price', align: 'right' },
            { key: 'sh', label: 'Share of new Suite customers', align: 'right' },
            { key: 'rv', label: 'Share of Suite revenue', align: 'right' },
          ]}
          rows={(PLAN_IDS as readonly PlanId[]).map((id) => {
            const share = s.mix[id] ?? 0;
            const rev = share * eco[id].price;
            return {
              cells: [
                s.plans[id].name,
                f(s.plans[id].contacts, 'n0'),
                f(eco[id].price, 'm0'),
                f(share, 'p0'),
                f(suiteRevTotal > 0 ? rev / suiteRevTotal : 0, 'p0'),
              ],
              emphasis: id === 'pro',
            };
          })}
          footnote={
            <>
              <b>Pro is {f(s.mix.pro ?? 0, 'p0')} of customers and {f(suiteRevTotal > 0 ? ((s.mix.pro ?? 0) * eco.pro.price) / suiteRevTotal : 0, 'p0')} of Suite revenue.</b> Under the previous three-package structure it was 30% of customers and 73% of Suite subscription revenue on the same basis, or 71% of month-59 recurring revenue once Send was included — two bases, both true, and this document had quoted them interchangeably. Pro was the only way to reach a large deployment then. Growth+ covers that ground now. But revenue is the easy test: Pro is <b>43.8% of Suite subscription gross profit</b>, so losing it costs materially more margin than it does sales, and redistributing those customers across the other four packages takes Suite ARPU to $306.94. No customer has yet bought Pro.
              <br />
              <br />
              The share column is reasoned from deployment size against fixed bands, not measured: a small deployment lands on Launch, a moderate one on Launch+, a larger one on Growth, and only a large-account deployment reaches Pro. Our own Suite book is three customers, one in the Launch band and two in the Growth band, which is consistent with it but cannot evidence a five-package distribution.
            </>
          }
        />
      </Section>

      <Section>
        <FigureTable
          title="The book, by name"
          description="Every customer and what they are. Only the paying rows seed the projection; a customer who has not paid is not revenue, and our own company is not a customer."
          columns={[
            { key: 'n', label: 'Customer' },
            { key: 's', label: 'Status' },
            { key: 'p', label: 'Plan' },
            { key: 'u', label: 'What they use' },
          ]}
          rows={customers.map((c) => ({
            cells: [
              c.name,
              <Badge key="s" variant={STATUS[c.status]?.variant ?? 'outline'}>{STATUS[c.status]?.label ?? c.status}</Badge>,
              planName(c.plan),
              <span key="u" className="block max-w-[52ch] whitespace-normal text-muted-foreground">
                {c.use === 'on-chain'
                  ? 'On-chain campaigns, data, intelligence and automations'
                  : c.use === 'off-chain'
                    ? 'Off-chain campaigns and automations'
                    : (c.note ?? '')}
              </span>,
            ],
            emphasis: c.status === 'paying',
          }))}
          footnote={
            <>
              <b>All of this is before launch.</b> {f(d.payingCount, 'n0')} paying customers and{' '}
              {f(customers.filter((c) => c.status === 'pipeline').length, 'n0')} more onboarding or in the pipeline, with no paid acquisition
              and nobody employed to sell. The public beta is still {f(s.launch.month, 'n0')} months out in this model,
              which assumes {f(s.launch.preLaunch, 'n1')} signups a month until then.
              <br />
              <br />
              <b>No paying customer uses the on-chain layer today.</b> Two of the three are on Send, where the wallet
              channel is off by design and cannot be used; the third is on Launch and does not use it. The two accounts
              that do use on-chain, Predict Street and Mey Network, are onboarding rather than paying. So adoption of
              the thing this product is for is evidenced by accounts that have not yet been invoiced. That is a real
              gap and it is not closed by the forecast. What is separately unmeasured is <i>how hard</i> a customer
              enriches: every package now bundles one full pass of its contacts, carried as a cost rather than as
              revenue, and what a very active list consumes beyond one pass a month has never been measured.
              <br />
              <br />
              Two of the three paying customers are on Send, against a forecast that assumes Send is{' '}
              {f(s.sendPlan.shareEnd, 'p0')} of new signups. Early adopters taking the simpler product first is what
              you would expect in beta; the assumption that needs support is that the mix shifts after launch, not
              that the present book is wrong.
            </>
          }
        />
      </Section>

      <div className="grid grid-cols-1 gap-4 px-4 @3xl/main:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>How to read this</CardTitle>
            <CardDescription>What each page is for, and which parts you can change.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Pages 02 to 06</span> are what we sell, what it costs, and
              what a customer is worth. <span className="font-medium text-foreground">Pages 07 to 09</span> are the same
              business projected forward five statutory years.{' '}
              <span className="font-medium text-foreground">Pages 10 to 12</span> are what is still assumed, the rules,
              and every decision that produced the numbers.
            </p>
            <ul className="space-y-2">
              <li>
                <span className="font-medium text-foreground">Inputs can be edited.</span> Change one and every figure
                downstream recalculates. Nothing in this document is typed in twice.
              </li>
              <li>
                <span className="font-medium text-foreground">Bear, Base and Bull</span> move how many customers arrive,
                how fast that rate grows, how many stay and which tier they land on. Bear also assumes customers enrich
                only half their list.
              </li>
              <li>
                <span className="font-medium text-foreground">Reset</span> returns every input to the agreed baseline.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How much of this is measured</CardTitle>
            <CardDescription>
              The register on page 10 carries every assumption and its basis. This is the summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="font-medium tabular-nums text-2xl text-foreground">{f(d.dq.measured, 'n0')}</div>
                <p className="text-xs">measured from real data</p>
              </div>
              <div>
                <div className="font-medium tabular-nums text-2xl text-foreground">{f(d.dq.total, 'n0')}</div>
                <p className="text-xs">assumptions in the register</p>
              </div>
              <div>
                <div className="font-medium tabular-nums text-2xl text-foreground">{f(measuredShare, 'p0')}</div>
                <p className="text-xs">of the register measured</p>
              </div>
            </div>
            <p>
              The rest are estimated or decided. An assumption with no measurement behind it is marked as such rather
              than dressed up, because the register is what tells a reader how much of this document to trust.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
