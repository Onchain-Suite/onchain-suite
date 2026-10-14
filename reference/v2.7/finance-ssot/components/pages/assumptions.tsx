'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { Badge } from '@/components/ui/badge';
import { ASSUMPTIONS } from '@/lib/model';
import { useModel } from '@/lib/use-model';

type Basis = 'o' | 'c' | 'e' | 'd';
const BASIS: Record<Basis, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  o: { label: 'Observed', variant: 'default' },
  c: { label: 'Contracted', variant: 'default' },
  e: { label: 'Estimate', variant: 'secondary' },
  d: { label: 'Decision or assumption', variant: 'outline' },
};

// Most entries render from the inputs alone; four also need the derived values, so every
// val() is called with both. Passing only the inputs left those four reading undefined.
type Assumption = { n: string; basis: Basis; own: string; why: string; val: (s: unknown, d: unknown) => string };

export function AssumptionsContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const rows = ASSUMPTIONS as unknown as Assumption[];
  const measuredShare = d.dq.total > 0 ? d.dq.measured / d.dq.total : 0;

  return (
    <>
      <PageHeader
        eyebrow="10 Assumptions register"
        question="How much of this document is measured, and how much is assumed?"
        answer="Every assumption the model rests on, what it is worth, who owns it and why it is still an assumption. An input with no measurement behind it is marked as such rather than dressed up."
      />
      {controls}

      <StatRow>
        <Stat value={f(d.dq.measured, 'n0')} label="Observed: measured from our own production or invoices" tone="good" />
        <Stat value={f(d.dq.contracted, 'n0')} label="Contracted or published: a supplier's rate card or a contracted price" />
        <Stat value={f(d.dq.estimated, 'n0')} label="Estimates: sized from something, but not measured" />
        <Stat value={f(d.dq.decided, 'n0')} label="Management decisions and assumptions: chosen rather than observed. Neither is evidence" />
        <Stat value={f(measuredShare, 'p0')} label="Share of the register that is an observed actual. The headline read 48% while counting decisions as measurements" />
      </StatRow>

      <Section>
        <FigureTable
          title="The register"
          description="Values are shown in dollars, because they are inputs to the model rather than outputs of it."
          columns={[
            { key: 'n', label: 'Assumption' },
            { key: 'v', label: 'Value', align: 'right' },
            { key: 'b', label: 'Basis' },
            { key: 'o', label: 'Owner' },
            { key: 'w', label: 'Why it is what it is' },
          ]}
          rows={rows.map((a) => ({
            cells: [
              a.n,
              a.val(s, d),
              <Badge key="b" variant={BASIS[a.basis].variant}>{BASIS[a.basis].label}</Badge>,
              <span key="o" className="text-muted-foreground">{a.own}</span>,
              <span key="w" className="block max-w-[60ch] whitespace-normal text-muted-foreground">{a.why}</span>,
            ],
          }))}
          footnote="Split into four categories on 25 September, after an external reviewer pointed out that zero customer acquisition cost and zero support minutes were counted as measured when both are decisions. Founders supporting every customer has no cash cost, which is a decision about payroll, not an observation about effort."
        />
      </Section>
    </>
  );
}
