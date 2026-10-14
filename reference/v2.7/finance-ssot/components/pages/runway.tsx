'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import type { WorstCase } from '@/lib/model-types';

export function RunwayContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const w = d.worstCase as unknown as WorstCase;

  return (
    <>
      <PageHeader
        eyebrow="09 Break-even and runway"
        question="What does twelve months cost if nothing goes right?"
        answer="Founder pay is excluded, because it starts when funding lands and is not what the funding is for. This is the cost of keeping the company alive for a year on the worst assumptions we would defend."
      />
      {controls}

      <StatRow>
        <Stat value={f(w.shortfall, 'm0')} label="What has to be in the bank, after the revenue a decaying book still brings" tone="bad" />
        <Stat value={f(w.monthly, 'm0')} label="Average burn a month across those twelve" />
        <Stat value={f(d.fin.raiseNeeded, 'm0')} label="External capital the base case needs, measured before the raise and bridge are counted" />
        <Stat value={f(d.beFull, 'n0')} label="Customers needed to cover infrastructure and current operating costs" />
      </StatRow>

      <Section>
        <FigureTable
          title="Worst case, twelve months, founders unpaid"
          description="No customer arrives, the existing book churns at 8%, and hosting is provisioned at full capacity."
          columns={[
            { key: 'l', label: 'Line' },
            { key: 'w', label: 'What it covers' },
            { key: 't', label: 'Total', align: 'right' },
          ]}
          rows={[
            { cells: ['Hosting', 'Droplets provisioned at capacity, backups and domains', f(w.hosting, 'm0')] },
            { cells: ['Vendor bills', 'Email, wallet data, verification and card fees for a decaying book', f(w.vendor, 'm0')] },
            { cells: ['Support', 'Founder time, no cash cost', f(w.support, 'm0')] },
            { cells: ['Acquisition', 'No paid acquisition', f(w.acquisition, 'm0')] },
            { cells: ['Company overheads', 'Insurance, accounting, domains, ICO and bank charges, billed in pounds', f(w.overheads, 'm0')] },
            { cells: ['Known operating cost', 'Twelve months', f(w.cost, 'm0')], emphasis: true },
            { cells: ['Contingency', `${f(s.worst.contingency, 'p0')} on the above, the same buffer rule used on spend`, f(w.contingency, 'm0')] },
            { cells: ['Total to fund', 'Twelve months, everything in', f(w.costPlus, 'm0')], emphasis: true },
            { cells: ['Revenue', 'What a decaying book still pays', f(-w.revenue, 'm0')] },
            { cells: ['Funding required', 'What has to be in the bank', f(w.shortfall, 'm0')], emphasis: true, tone: 'bad' },
          ]}
          footnote="Company overheads are what the founders confirmed they pay. They were estimated at four times this until 23 September, when checking them against reality cut the twelve-month requirement by more than eighty per cent."
        />
      </Section>
    </>
  );
}
