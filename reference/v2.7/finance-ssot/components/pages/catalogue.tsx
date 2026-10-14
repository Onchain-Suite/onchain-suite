'use client';
import { PageHeader } from '@/components/page-header';
import { FigureTable, Section } from '@/components/figure-table';
import { useModel } from '@/lib/use-model';
import type { ByPlan, PlanEco, SendRow } from '@/lib/model-types';

import { PLAN_IDS } from '@/lib/model';
import type { PlanId } from '@/lib/model-types';

const IDS = PLAN_IDS as readonly PlanId[];

export function CatalogueContent({ controls }: { controls?: React.ReactNode }) {
  const { s, d, f } = useModel();
  const eco = d.eco as unknown as ByPlan<PlanEco>;
  const sendRows = d.sendRows as unknown as SendRow[];

  return (
    <>
      <PageHeader
        eyebrow="03 Catalogue and pricing"
        question="What do we sell, and what does each plan include?"
        answer="Two products on one platform. Suite is the wallet channel switched on; Send is the same platform with the chain layer off. Prices derive from the cost of each plan's own allowance, never the other way round."
      />
      {controls}

      <Section>
        <FigureTable
          title="Suite plans"
          description="Five packages, three capability levels. Launch+ and Growth+ are larger contact sizes of the tier below them, not separate products: same features, same multiplier, same price curve. A buyer picks a package by how many profiles they manage, and capability only changes at Launch, Growth and Pro."
          columns={[
            { key: 'p', label: 'Plan' },
            { key: 'price', label: 'Price', align: 'right' },
            { key: 'contacts', label: 'Contacts', align: 'right' },
            { key: 'emails', label: 'Emails', align: 'right' },
            { key: 'push', label: 'In-app push', align: 'right' },
            { key: 'chain', label: 'On-chain credits', align: 'right' },
            { key: 'ons', label: 'ONS+', align: 'right' },
            { key: 'seats', label: 'Seats', align: 'right' },
          ]}
          rows={IDS.map((id) => ({
            cells: [
              s.plans[id].name,
              f(eco[id].price, 'm0'),
              f(s.plans[id].contacts, 'n0'),
              f(s.plans[id].emails, 'n0'),
              f(s.plans[id].push, 'n0'),
              f(s.plans[id].chain, 'n0'),
              f(s.plans[id].ons, 'n0'),
              f(s.plans[id].seats, 'n0'),
            ],
          }))}
          footnote={`Contact bands: Launch 0 to 24,999, Growth 25,000 to 74,999, Pro 75,000 and above. Extra seats are ${f(s.extraSeat.price, 'm0')} each above the included count. Pro is sold as Enterprise and custom priced: the public page no longer lists it. The ${f(eco.pro.price, 'm0')} here is still derived from the cost of its own full allowance, which makes it the floor a negotiation must not go below rather than a list price - custom deals land above it, so every Pro figure in this document is the conservative end of the top tier.`}
        />
      </Section>

      <Section>
        <FigureTable
          title="Onramp"
          description={`One service, one price: ${f(d.onramp.price, 'm0')} flat, priced into the offer. What changes is how long delivery runs. On an Enterprise deal it covers the entire sales cycle, which is the real service; on Growth and Growth+ it is a cut-down version of the same thing sized to fit a self-serve plan. Not sold on Launch or Launch+.`}
          columns={[
            { key: 'k', label: '' },
            { key: 'ent', label: 'Enterprise', align: 'right' },
            { key: 'gro', label: 'Growth and Growth+', align: 'right' },
          ]}
          rows={[
            { cells: ['Price', f(d.onramp.enterprise.price, 'm0'), f(d.onramp.growth.price, 'm0')] },
            { cells: ['Delivery runs for', `${f(d.onramp.enterprise.cycleLow, 'n0')} to ${f(d.onramp.enterprise.cycleHigh, 'n0')} months, the sales cycle`, `${f(d.onramp.growth.months, 'n0')} months`] },
            { cells: ['Hours', `${f(d.onramp.enterprise.hours, 'n0')} at ${f(d.onramp.enterprise.hoursPerMonth, 'n0')} a month`, f(d.onramp.growth.hours, 'n0')] },
            { cells: ['What delivery costs us', f(d.onramp.enterprise.cost, 'm0'), f(d.onramp.growth.cost, 'm0')] },
            { cells: ['Margin on the service alone', f(d.onramp.enterprise.margin, 'p1'), f(d.onramp.growth.margin, 'p1')] },
            { cells: ['Who gets it', 'Every Enterprise offer', `${f(d.onramp.growth.takeUp, 'p0')} of new accounts, assumed`] },
          ]}
          footnote={`The flat price is deliberate and it means the Enterprise shape runs at a loss on its own: ${f(d.onramp.enterprise.cost, 'm0')} of delivery against the same ${f(d.onramp.price, 'm0')} everyone pays. It is carried by the subscription it protects, and the deal table below shows it carried. The Growth shape covers itself at ${f(d.onramp.growth.margin, 'p1')}. The ${f(d.onramp.enterprise.hoursPerMonth, 'n0')} hours a month is a placeholder until a cycle has been run end to end: each extra hour a month is ${f(d.onramp.enterprise.perExtraHourPerMonth, 'm0')} on an Enterprise deal. Hours beyond what Onramp covers bill as ${s.conciergeLabel} at ${f(s.pConcierge, 'm0')}.`}
        />
      </Section>

      <Section>
        <FigureTable
          title="One Enterprise deal, first year"
          description={`Enterprise is the Pro tier at ${f(d.onrampPro.contacts, 'n0')} contacts and up, custom priced, with Onramp in the offer. This is the whole deal in one place.`}
          columns={[
            { key: 'k', label: '' },
            { key: 'v', label: '', align: 'right' },
          ]}
          rows={[
            { cells: ['Subscription', f(d.onrampPro.yearPrice, 'm0')] },
            { cells: ['Onramp, in the offer', f(d.onrampPro.onrampFee, 'm0')] },
            { cells: ['Cost of running them for a year', `-${f(d.onrampPro.yearRun, 'm0')}`] },
            { cells: [`Onramp delivery, ${f(d.onramp.enterprise.hours, 'n0')} hours`, `-${f(d.onrampPro.onrampCost, 'm0')}`] },
            { cells: ['Profit', f(d.onrampPro.profit, 'm0')], emphasis: true },
            { cells: ['Margin', f(d.onrampPro.margin, 'p1')] },
          ]}
          footnote={`${f(d.onrampPro.price, 'm0')} a month is the floor, not a list price: it covers the cost of the allowance, so a deal negotiated above it earns more than this and one below it earns less. It holds at both ends of the cycle - ${f(d.onrampPro.profitLow, 'm0')} on a six-month cycle, ${f(d.onrampPro.profitHigh, 'm0')} on a twelve - and the deal only stops covering its own costs once delivery passes ${f(d.onrampPro.breakEvenHours, 'n0')} hours, which is ${f(d.onrampPro.breakEvenHours / d.onramp.enterprise.hours, 'n1')} times the cycle as modelled.`}
        />
      </Section>

      <Section>
        <FigureTable
          title="Send, against the competitor we lose to most"
          description="Send is priced flat per subscriber. Every competitor discounts by volume, which is why we are cheaper at the bottom and dearer at the top."
          columns={[
            { key: 'n', label: 'Subscribers', align: 'right' },
            { key: 'price', label: 'Our price', align: 'right' },
            { key: 'cost', label: 'Our cost', align: 'right' },
            { key: 'margin', label: 'Margin', align: 'right' },
            { key: 'eo', label: 'EmailOctopus', align: 'right' },
            { key: 'delta', label: 'Difference', align: 'right' },
          ]}
          rows={sendRows.map((r) => ({
            cells: [
              f(r.n, 'n0'),
              f(r.price, 'm2'),
              f(r.cost + r.stripe, 'm2'),
              f(r.margin, 'p1'),
              r.eo ? f(r.eo, 'm2') : 'n/a',
              r.eo ? (
                <span key="d" className={r.price <= r.eo ? 'text-(--green)' : 'text-(--red)'}>
                  {r.price <= r.eo ? 'cheaper' : 'dearer'} {f(Math.abs(r.price - r.eo), 'm2')}
                </span>
              ) : (
                'n/a'
              ),
            ],
          }))}
          footnote={`We cross EmailOctopus at about ${f(d.sendCrossN, 'n0')} subscribers and are dearer beyond it. That is the price of holding one rate rather than discounting by volume.`}
        />
      </Section>
    </>
  );
}
