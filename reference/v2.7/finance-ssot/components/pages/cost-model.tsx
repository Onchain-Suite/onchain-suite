'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import type { InfraTierRow, SesPlanRow } from '@/lib/model-types';

const METERS: { key: 'email' | 'push' | 'ons' | 'chain' | 'ai' | 'concierge'; label: string; unit: string; note: string }[] = [
  { key: 'email', label: 'Email sending', unit: 'per 1,000', note: 'AWS SES Essentials, verified against the account' },
  { key: 'push', label: 'In-app push', unit: 'per 1,000', note: 'Delivered through the customer own application' },
  { key: 'ons', label: 'ONS+ verification', unit: 'per 1,000', note: 'Two stages: ours first, an external check for what it cannot settle' },
  { key: 'chain', label: 'On-chain enrichment', unit: 'per 10,000', note: 'Alchemy, measured from production on 11 September 2026' },
  { key: 'ai', label: 'AI', unit: 'per 1,000', note: 'Blended across cached and uncached input' },
  { key: 'concierge', label: 'Onramp extra hours', unit: 'per hour', note: 'Renamed from Concierge 13 Oct 2026 and taken off the public pricing page. Same rate, still optional on every tier; hours beyond Onramp 20 bill here' },
];

export function CostModelContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const sesRows = d.sesPlanRows as unknown as SesPlanRow[];
  const tiers = d.infraTierRows as unknown as InfraTierRow[];

  return (
    <>
      <PageHeader
        eyebrow="04 Cost model"
        question="What does each thing we sell actually cost us?"
        answer={`Every meter at its loaded cost, with a ${f(d.bufPct, 'p1')} buffer on top, against what we charge for it. A plan price must exceed the cost of its own full allowance; that is the rule, and every plan passes it.`}
      />
      {controls}

      <StatRow>
        <Stat value={f(d.bEmail, 'm3')} label="Loaded cost of sending 1,000 emails" />
        <Stat value={f(d.bChain, 'm2')} label="Loaded cost of 10,000 on-chain credits, measured not quoted" />
        <Stat value={f(d.bOns, 'm3')} label="Loaded cost of verifying 1,000 addresses" />
        <Stat value={f(d.overheadTotal, 'm2')} label="Company overheads a month, billed in pounds and confirmed by the founder" />
      </StatRow>

      <Section>
        <FigureTable
          title="What each meter costs and what it sells for"
          description="Loaded cost against list price. Margin is what is left after the cost of delivering that unit."
          columns={[
            { key: 'm', label: 'Meter' },
            { key: 'u', label: 'Unit' },
            { key: 'margin', label: 'Margin', align: 'right' },
            { key: 'markup', label: 'Markup', align: 'right' },
            { key: 'note', label: 'Where the number comes from' },
          ]}
          rows={METERS.map((m) => ({
            cells: [m.label, m.unit, f(d.rate[m.key].margin, 'p1'), f(d.rate[m.key].markup, 'n1') + 'x', <span key="n" className="text-muted-foreground">{m.note}</span>],
          }))}
        />
      </Section>

      <Section>
        <FigureTable
          title="Which AWS sending plan we are on"
          description="Essentials is what we pay today. The alternatives are priced here so the choice stays visible rather than inherited."
          columns={[
            { key: 'p', label: 'Plan' },
            { key: 'rate', label: 'Per 1,000', align: 'right' },
            { key: 'fee', label: 'Monthly fee', align: 'right' },
            { key: 'note', label: 'Note' },
          ]}
          rows={sesRows.map((r) => ({
            cells: [r.plan + (r.current ? ' (current)' : ''), f(r.rate, 'm2'), f(r.fee, 'm0'), <span key="n" className="text-muted-foreground">{r.note}</span>],
            emphasis: r.current,
          }))}
        />
      </Section>

      <Section>
        <FigureTable
          title="Hosting, and where it steps"
          description="One droplet carries the book to the first tier; the projection crosses that step in month 42."
          columns={[
            { key: 'u', label: 'Up to', align: 'right' },
            { key: 'r', label: 'Droplet rate', align: 'right' },
            { key: 't', label: 'Total a month', align: 'right' },
            { key: 'pu', label: 'Per customer', align: 'right' },
          ]}
          rows={tiers.map((t) => ({
            cells: [f(t.maxUsers, 'n0') + ' customers', f(t.rate, 'm0'), f(t.total, 'm2'), f(t.perUser, 'm3')],
          }))}
          footnote={`Backups are ${f(s.infraSpec.backupPct, 'p0')} of the droplet cost and domains are ${f(s.infraSpec.domains, 'm0')} a month. Nothing else is unattributed.`}
        />
      </Section>
    </>
  );
}
