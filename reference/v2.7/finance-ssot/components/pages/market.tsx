'use client';
import { PageHeader } from '@/components/page-header';
import { Stat, StatRow } from '@/components/stat';
import { FigureTable, Section } from '@/components/figure-table';
import { Badge } from '@/components/ui/badge';
import { PriceCurve, type PricePoint } from '@/components/charts';
import { useModel } from '@/lib/use-model';

export function MarketContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const rows = [...d.h2h].sort((a, b) => b.score - a.score || a.theirs - b.theirs);
  type ProRow = { name: string; theirs: number; quoted: boolean; score: number; wallet: number; chain: number };
  const proRivals = ([...(d.proH2h ?? [])] as unknown as ProRow[]).sort((a, b) => b.score - a.score || a.theirs - b.theirs);
  const acPro = proRivals.find((r) => r.name === 'ActiveCampaign Pro');
  const hubSpot = proRivals.find((r) => r.name === 'HubSpot Professional');

  // The price curves. Each competitor is priced from its fitted curve only inside its published
  // range; outside it the point is null and the line stops. Email-metered platforms are converted
  // to contacts through the send ratio. The median is across every product platform in range.
  type Comp = { n: string; meter: string; a: number; b: number; pts?: [number, number][] };
  const comps = s.market as unknown as Comp[];
  const products = new Set(d.h2h.map((c: { name: string }) => c.name));
  const priceAt = (c: Comp, contacts: number): number | null => {
    const v = c.meter === 'emails' ? contacts * s.send.ratio : contacts;
    const pts = c.pts ?? [];
    if (!pts.length || v < pts[0][0] || v > pts[pts.length - 1][0]) return null;
    return c.a * Math.pow(v, c.b);
  };
  const named = (re: RegExp) => comps.find((c) => re.test(c.n));
  const eo = named(/^EmailOctopus Pro/), bv = named(/^Brevo Standard/), mc = named(/^Mailchimp Standard/);
  const curve: PricePoint[] = [500, 750, 1000, 1500, 2500, 4000, 5000, 7500, 10000, 15000, 25000, 40000, 50000, 75000, 100000].map((n) => {
    const inRange = comps.filter((c) => products.has(c.n)).map((c) => priceAt(c, n)).filter((v): v is number => v != null).sort((x, y) => x - y);
    const median = inRange.length ? inRange[Math.floor(inRange.length / 2)] : null;
    return {
      n,
      ours: d.suiteAt(n),
      median,
      octopus: eo ? priceAt(eo, n) : null,
      brevo: bv ? priceAt(bv, n) : null,
      mailchimp: mc ? priceAt(mc, n) : null,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="02 Market research"
        question="How do we compare with the platforms a customer would buy instead?"
        answer={`${f(d.marketCount, 'n0')} published price ladders collected 21 August 2026, each fitted to price = a x volume^b and converted onto one axis, then scored on what the product actually does. Both our lines are benchmarked on the contact meter every rival uses.`}
      />
      {controls}

      <StatRow>
        <Stat value={f(d.suiteScore, 'n1') + ' / 11'} label="Capabilities Suite ships, scored against the same list as every competitor. SMS is the only outright gap" />
        <Stat value={f(d.marketMedian10k, 'm0')} label="Median competitor price at 10,000 contacts" />
        <Stat value={f(d.suiteAt10k, 'm0')} label="Suite at 10,000 contacts" />
        <Stat value="0 of 26" label="Competitors that carry wallet messaging or on-chain triggers. Not one of them does" tone="good" />
      </StatRow>

      <Section>
        <PriceCurve data={curve} />
      </Section>

      <Section>
        <FigureTable
          title="Head to head"
          description="Every mapped platform at 10,000 contacts, with what it does as well as what it charges. Ranked by capability score."
          columns={[
            { key: 'n', label: 'Platform' },
            { key: 'who', label: 'Who buys it' },
            { key: 'score', label: 'Capability', align: 'right' },
            { key: 'theirs', label: 'Their price', align: 'right' },
            { key: 'vs', label: 'Suite vs them', align: 'right' },
          ]}
          rows={rows.map((c) => ({
            cells: [
              c.name,
              <span key="w" className="text-muted-foreground">{c.who}</span>,
              `${f(c.score, 'n1')} / 11`,
              f(c.theirs, 'm0'),
              <span key="v" className={c.vsSuite < 0 ? 'text-(--green)' : 'text-(--red)'}>
                {c.vsSuite < 0 ? 'cheaper ' : 'dearer '}
                {f(Math.abs(c.vsSuite), 'p0')}
              </span>,
            ],
          }))}
          footnote="Capability is scored 1 full, 0.5 partial, 0 absent, on the same eleven items for everyone including us. Scoring ourselves generously would make the rest of this page worthless."
        />
      </Section>


      <Section>
        <FigureTable
          title={`At Pro size: ${f(d.proSize, 'n0')} contacts`}
          description="Page 02 compares at 10,000 contacts, where we are under the median. This is the same field at the size that carries most of Suite's gross profit. Ranked by what the product does, not by what it costs."
          columns={[
            { key: 'n', label: 'Product' },
            { key: 'cap', label: 'Capability', align: 'right' },
            { key: 'w', label: 'Wallet channel', align: 'right' },
            { key: 'c', label: 'On-chain triggers', align: 'right' },
            { key: 'p', label: `At ${f(d.proSize, 'n0')} contacts`, align: 'right' },
          ]}
          rows={[
            {
              cells: [
                'OnchainSuite Pro',
                `${f(d.suiteScore, 'n1')} / 11`,
                'yes',
                'yes',
                f(d.proAtSize, 'm0'),
              ],
              emphasis: true,
              tone: 'good' as const,
            },
            ...proRivals.map((r) => ({
              cells: [
                r.name + (r.quoted ? '' : ' *'),
                `${f(r.score, 'n1')} / 11`,
                'no',
                'no',
                f(r.theirs, 'm0'),
              ],
            })),
          ]}
          footnote={
            <>
              Ranked by capability, because ranking by price tells you the wrong thing: the cheapest
              products here are cheap because they do almost nothing. Amazon SES scores 1 of 11 and is a
              sending pipe, not a marketing product. <b>We are the dearest product in this field bar one</b>{' '}
              at this size, and that is deliberate &mdash; Pro carries a 1.6&times; multiplier. The two most
              capable rivals score 8 of 11 and sit at {f(acPro?.theirs ?? 0, 'm0')} and{' '}
              {f(hubSpot?.theirs ?? 0, 'm0')}; Suite scores {f(d.suiteScore, 'n1')} and sits between them.
              <br />
              <br />
              <b>None of the {f(proRivals.length, 'n0')} carries a wallet channel or on-chain triggers at any
              price.</b> At this size the comparison is not a cheaper version of the same thing, it is the
              only version of a different thing. SMS is the one capability in the field we do not ship.
              <br />
              <br />
              * published pricing does not reach this size, so the figure is our fitted curve beyond the end
              of their evidence.
            </>
          }
        />
      </Section>
      <Section>
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Badge variant="outline" className="mb-2">The finding that matters</Badge>
          <p>
            Not one of the {f(d.marketCount, 'n0')} platforms mapped carries wallet messaging or on-chain triggers. The
            comparison above is therefore about price and general capability only; on the thing the product is actually
            for, there is no competitor in this set to compare against.
          </p>
        </div>
      </Section>
    </>
  );
}
