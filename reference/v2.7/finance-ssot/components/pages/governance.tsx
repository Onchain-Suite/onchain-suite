'use client';
import { PageHeader } from '@/components/page-header';
import { FigureTable, Section } from '@/components/figure-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BASELINE } from '@/lib/model';
import { useModel } from '@/lib/use-model';

const DEFINITIONS: [string, string][] = [
  ['Revenue', 'Everything billed in a month: subscriptions plus on-chain overage. Not the same as MRR.'],
  ['MRR', 'Monthly recurring revenue: subscriptions only, at the end of the period. Overage is not in it.'],
  ['Gross profit', 'Revenue less the cost of serving it: metered usage, dedicated IPs, card fees and any partner share.'],
  ['Cost to serve', 'What one customer costs in one month when they consume their whole allowance. The floor, not the average.'],
  ['EBITDA', 'Gross profit less operating costs, before depreciation and tax. The founder pool is waived before the raise and is not charged; the CEO salary from June 2027 is charged, because it is paid whether or not the raise lands.'],
  ['Utilisation', 'How much of a monthly allowance a customer uses. Held at 100%, which is the stress case, not an expectation.'],
  ['Churn', 'The share of customers who cancel each month. Applied to every tier and to Send at the same rate.'],
  ['Financial year', 'Cut on 31 July, the year end at Companies House. FY2027 is an eleven-month stub.'],
];

const RULES: [string, string][] = [
  ['A plan price must exceed the cost of its own full allowance.', 'The rule from the pricing source of truth. A 70% margin floor was once asserted here as well; it appears nowhere in that document and was removed on 17 September.'],
  ['Every figure is an input or is derived from one.', 'Nothing is typed in twice. If a number appears in two places it is the same number, read from the same source.'],
  ['The decision log holds literals, never live values.', 'A binding inside a dated entry renders today’s value into a description of a past decision. The build fails if one appears.'],
  ['Any per-customer fixed cost must be gated on the usage that justifies it.', 'Dedicated IPs are the current example: provisioned above 100,000 sends a month, not given to every account.'],
  ['Hours we sell are scoped and priced, never bundled.', 'Onramp extra hours are an add-on at a list rate, and Onramp itself is a fixed 20-hour programme priced to cover the hours it consumes. Both are scoped before they are sold; neither is bundled into a plan price.'],
  ['An assumption with no measurement behind it is marked as such.', 'The register on page 10 carries the basis for every one. Dressing up a guess is how a document stops being usable.'],
];

export function GovernanceContent({ controls }: { controls?: React.ReactNode }) {
  const { s, f } = useModel();

  void controls;
  return (
    <>
      <PageHeader
        eyebrow="11 Governance and definitions"
        question="What do the words mean, and what rules does this document hold itself to?"
        answer={`Baseline ${BASELINE}. A saved scenario written against a different baseline is discarded rather than merged, because it is not the same document.`}
      />

      <Section>
        <FigureTable
          title="Definitions"
          description="Words that mean different things in different documents. These are what they mean here."
          columns={[{ key: 't', label: 'Term' }, { key: 'd', label: 'What it means in this document' }]}
          rows={DEFINITIONS.map(([t, dd]) => ({ cells: [t, <span key="d" className="block max-w-[80ch] whitespace-normal text-muted-foreground">{dd}</span>] }))}
        />
      </Section>

      <Section>
        <FigureTable
          title="Rules this document holds itself to"
          description="Each one was learnt by breaking it. The reason is recorded so it is not relearnt."
          columns={[{ key: 'r', label: 'Rule' }, { key: 'w', label: 'Why' }]}
          rows={RULES.map(([r, w]) => ({ cells: [<span key="r" className="block max-w-[46ch] whitespace-normal">{r}</span>, <span key="w" className="block max-w-[70ch] whitespace-normal text-muted-foreground">{w}</span>] }))}
        />
      </Section>

      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>We charge and earn in dollars, and file in pounds.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every figure is computed in dollars. Pounds are a display conversion at {f(s.fx.gbpUsd, 'n4')}, the same rate
            used to convert the sterling salary and overhead lines into dollars, so the two directions cannot disagree.
            The rate is frozen, so the pound figures drift as the real rate moves. Editable inputs stay in dollars
            whichever currency is displayed, because typing a pound figure into a dollar field would corrupt the model.
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
