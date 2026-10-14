import { useState } from 'react';
import { useOfferRequest } from '../data/workspace';
import { Badge, Button, Input, Modal } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import { usePersistedState } from '../data/persist';
import { setPlan, useCredits, usePlan } from '../data/credits';
import {
  METERS, PAYG_CAPS, PLANS, PROCESSING_FEE_FIXED, PROCESSING_FEE_PCT, RENEWAL_REMINDER_DAYS,
  TOPUP_MAX, TOPUP_MIN, allowanceAtList, billingState, fmtUsd, getPlan, meterCost, overageMultiple,
  rateLabel, selectablePlans,
} from '../data/pricing';
import type { PlanId } from '../data/pricing';
import './billing.css';

/* Billing — reads every number from data/pricing.ts so the catalog is the only place a
   price lives. Shows the plan, what's left of each allowance, the overage rates that kick
   in beyond it, the push add-on, and the prepaid wallet that prevents hard cut-offs. */

/* onchainCredits is no longer in here: it is the one meter the product actually moves, so it
   comes from the credit ledger rather than a figure typed next to the others. */
const USAGE = { contacts: 3_120, emails: 42_800, push: 61_400, aiCredits: 2_140, onsPlus: 410, seats: 3 };

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const over = used > limit && limit > 0;
  return (
    <div className="bmeter">
      <div className="bmeter__top">
        <span className="bmeter__lbl">{label}</span>
        <span className={`bmeter__val${over ? ' over' : ''}`}>
          {used.toLocaleString('en-US')} <span>/ {limit ? limit.toLocaleString('en-US') : 'per unit'}{unit ? ` ${unit}` : ''}</span>
        </span>
      </div>
      <div className="bmeter__track"><div className="bmeter__fill" style={{ width: `${pct}%`, background: over ? 'var(--orange-500)' : 'var(--action-primary)' }} /></div>
      {over && <span className="bmeter__over">Over allowance. Billing usage-based from your wallet</span>}
    </div>
  );
}

export function BillingSections() {
  const offer = useOfferRequest();
  /* Read from the credits store rather than held here. Two owners of one key meant changing
     the plan never told the credit balance, and the allowance on screen was stale. */
  const planId = usePlan();
  const [wallet, setWallet] = usePersistedState<number>('wallet', 42.5);
  const [picker, setPicker] = useState(false);
  const [topup, setTopup] = useState(false);

  const plan = getPlan(planId)!;
  const credits = useCredits();
  const a = plan.allowances;
  const subscribed = plan.monthly !== null && plan.monthly > 0;
  const allowanceLeft = USAGE.emails < a.emails;
  const state = billingState({ subscribed, allowanceLeft, walletBalance: wallet });
  // What the plan's allowances would cost at list. The gap is the discount the plan buys.
  const atList = allowanceAtList(plan);

  return (
    <>
      <section className="sec">
        <div className="sec__bar">
          <span className="sec__meta"><h2>Plan &amp; usage</h2><p>Current plan, what&apos;s left this cycle, and what happens beyond it</p></span>
          <Button size="s" icon="arrow-up-right" onClick={() => setPicker(true)}>Change plan</Button>
        </div>
        <div className="sec__body">
          <div className="kv" style={{ marginBottom: 18 }}>
            <div className="mini">
              <span className="mini__label">Plan</span>
              <span className="mini__value" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {plan.name}
                {plan.legacy && <Badge status="warning">Legacy</Badge>}
              </span>
            </div>
            <div className="mini"><span className="mini__label">Price</span><span className="mini__value">{plan.custom ? (offer ? `Offer requested · ${offer.contacts.toLocaleString('en-US')} contacts` : 'Custom offer') : plan.monthly === null ? 'Usage-based' : `${fmtUsd(plan.monthly)} / mo`}</span></div>
            <div className="mini"><span className="mini__label">Billing</span><span className="mini__value">{plan.custom ? 'Invoiced' : plan.monthly === null ? 'Prepaid wallet' : 'Monthly'}</span></div>
            <div className="mini">
              <span className="mini__label">Status</span>
              <span className="mini__value">
                {state === 'subscribed' ? <Badge status="success">Active</Badge>
                  : state === 'usage-based' ? <Badge status="info">Usage-based</Badge>
                  : <Badge status="error">Blocked. Top up</Badge>}
              </span>
            </div>
          </div>

          <div className="bmeters">
            <Meter label="Wallet contacts" used={USAGE.contacts} limit={a.contacts} />
            <Meter label="Email sends" used={USAGE.emails} limit={a.emails} />
            <Meter label="In-app push" used={USAGE.push} limit={a.push} />
            <Meter label="Wallet-data credits" used={credits.used} limit={credits.allowance + credits.bought} />
            <Meter label="AI credits" used={USAGE.aiCredits} limit={a.aiCredits} />
            <Meter label="ONS+ list protection" used={USAGE.onsPlus} limit={a.onsPlus} />
            <Meter label="Team seats" used={USAGE.seats} limit={a.seats} />
          </div>

          {plan.id === 'payg' && (
            <p className="bnote">
              <Icon name="info" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              Pay-as-you-go caps: {PAYG_CAPS.contacts.toLocaleString('en-US')} contacts, {PAYG_CAPS.seats} seats, {PAYG_CAPS.automations} automations. Subscribe to lift them.
            </p>
          )}
          <p className="bnote">
            <Icon name="shield-check" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
            Running out never cuts you off. Past the allowance or past expiry, usage bills from your prepaid wallet at the rates below.
            Renewal reminders go out {RENEWAL_REMINDER_DAYS.join(', ')} days before expiry.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="sec__bar"><span className="sec__meta"><h2>Usage rates</h2><p>Pay-as-you-go, and overage once an allowance is used up</p></span></div>
        <div className="sec__body">
          <div className="rates">
            <div className="rates__head"><span>Meter</span><span>Rate</span><span>Notes</span></div>
            {METERS.map((m) => (
              <div className="rates__row" key={m.id}>
                <span className="rates__lbl">{m.label}</span>
                <span className="rates__price">{rateLabel(m)}</span>
                <span className="rates__note">{m.note ?? ''}</span>
              </div>
            ))}
          </div>
          <p className="bnote">
            <Icon name="info" size={14} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
            These sit above the plan-implied rates, so a subscription is always cheaper per unit than paying as you go.
          </p>
        </div>
      </section>

      {subscribed && (
        <section className="sec">
          <div className="sec__bar">
            <span className="sec__meta"><h2>What your plan saves you</h2><p>The same allowances bought at list, against what you pay</p></span>
          </div>
          <div className="sec__body">
            {/* v4's core idea: a plan is a discount on list, and overage is not discounted.
                Showing both numbers makes the tier ladder legible instead of arbitrary. */}
            <div className="kv" style={{ marginBottom: 16 }}>
              <div className="mini"><span className="mini__label">Allowances at list</span><span className="mini__value">{fmtUsd(atList)}</span></div>
              <div className="mini"><span className="mini__label">You pay</span><span className="mini__value">{fmtUsd(plan.monthly!)} / mo</span></div>
              <div className="mini"><span className="mini__label">You save</span><span className="mini__value">{Math.round((1 - plan.monthly! / atList) * 100)}%</span></div>
              <div className="mini"><span className="mini__label">Overage costs</span><span className="mini__value">{overageMultiple(plan).toFixed(2)}× per unit</span></div>
            </div>
            <p className="bnote">
              <Icon name="info" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              Your allowances would cost {fmtUsd(atList)} bought a unit at a time. Past them you pay list,
              which is {overageMultiple(plan).toFixed(2)}× what the same unit costs inside the plan, so
              allowances are sized for normal use and overage prices the exceptional.
            </p>
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec__bar">
          <span className="sec__meta"><h2>Prepaid wallet</h2><p>Funds usage-based billing and overage</p></span>
          <Button size="s" icon="plus" onClick={() => setTopup(true)}>Top up</Button>
        </div>
        <div className="sec__body">
          <div className="kv">
            <div className="mini"><span className="mini__label">Balance</span><span className="mini__value" style={{ color: wallet > 0 ? 'var(--text-primary)' : 'var(--status-error-text)' }}>{fmtUsd(wallet)}</span></div>
            <div className="mini"><span className="mini__label">Top-up range</span><span className="mini__value">{fmtUsd(TOPUP_MIN)} – {fmtUsd(TOPUP_MAX)}</span></div>
            <div className="mini"><span className="mini__label">Settlement</span><span className="mini__value">Stripe · {PROCESSING_FEE_PCT}% + {fmtUsd(PROCESSING_FEE_FIXED)}</span></div>
          </div>
          {wallet <= 0 && (
            <p className="bnote" style={{ borderColor: 'var(--status-error-border)' }}>
              <Icon name="triangle-alert" size={14} color="var(--status-error-text)" style={{ flexShrink: 0, marginTop: 1 }} />
              Wallet empty. Metered actions are blocked until you top up. This is the only state that hard-stops sending.
            </p>
          )}
        </div>
      </section>

      <section className="sec">
        <div className="sec__bar"><span className="sec__meta"><h2>Invoices</h2><p>Billing history</p></span></div>
        <div className="sec__body">
          <div className="grid">
            <div><div className="fld__label">Latest invoice</div><div className="fld__value os-mono">INV-2026-07-0042</div></div>
            <div><div className="fld__label">Latest amount</div><div className="fld__value">{plan.custom ? 'Per your offer' : plan.monthly === null ? fmtUsd(meterCost('emails', USAGE.emails)) : fmtUsd(plan.monthly)}</div></div>
          </div>
        </div>
      </section>

      {picker && (
        <PlanPicker current={planId}
          onPick={(id) => { setPlan(id); setPicker(false); toast(`Switched to ${getPlan(id)!.name}`); }}
          onClose={() => setPicker(false)} />
      )}
      {topup && <TopUpModal onClose={() => setTopup(false)} onTopUp={(amt) => { setWallet((w) => w + amt); setTopup(false); toast(`${fmtUsd(amt)} added to your wallet`); }} />}
    </>
  );
}

/* v4 removed annual billing, so the monthly/annual toggle went with it. */
function PlanPicker({ current, onPick, onClose }: {
  current: string; onPick: (id: PlanId) => void; onClose: () => void;
}) {
  const legacy = PLANS.filter((p) => p.legacy);
  const onLegacy = legacy.some((p) => p.id === current);
  return (
    <Modal title="Change plan" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="plans">
          {selectablePlans().map((p) => {
            const on = p.id === current;
            return (
              <button key={p.id} type="button" className={`plan${on ? ' on' : ''}`} onClick={() => onPick(p.id as PlanId)} disabled={on}>
                <span className="plan__name">{p.name}{on && <Badge status="success">Current</Badge>}</span>
                <span className="plan__price">
                  {p.custom ? 'Custom' : p.monthly === null ? 'Usage-based' : <>{fmtUsd(p.monthly)}<small> / mo</small></>}
                </span>
                <span className="plan__blurb">{p.blurb}</span>
                <span className="plan__allow">
                  {p.allowances.contacts.toLocaleString('en-US')} contacts ·{' '}
                  {p.allowances.emails ? `${p.allowances.emails.toLocaleString('en-US')} emails` : 'per-unit'} ·{' '}
                  {p.allowances.push ? `${p.allowances.push.toLocaleString('en-US')} push` : 'no push'} ·{' '}
                  {p.custom ? 'custom seats' : `${p.allowances.seats} seats`}
                </span>
              </button>
            );
          })}
        </div>

        <p className="bnote" style={{ margin: 0 }}>
          <Icon name="info" size={14} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
          There is no free tier. Pay-as-you-go is the entry point. Browsing is free, the first metered action needs a {fmtUsd(TOPUP_MIN)} top-up.
        </p>

        {onLegacy && (
          <div>
            <div className="fld__label" style={{ marginBottom: 8 }}>Legacy plans</div>
            <div className="plans">
              {legacy.filter((p) => p.id === current).map((p) => (
                <div key={p.id} className="plan plan--legacy">
                  <span className="plan__name">{p.name}<Badge status="warning">Legacy</Badge></span>
                  <span className="plan__price">{p.monthly ? <>{fmtUsd(p.monthly)}<small> / mo</small></> : 'Free'}</span>
                  <span className="plan__blurb">{p.blurb} Your meters keep working, but it can&apos;t be re-selected.</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TopUpModal({ onClose, onTopUp }: { onClose: () => void; onTopUp: (amt: number) => void }) {
  const [amt, setAmt] = useState('50');
  const n = Number(amt);
  const valid = Number.isFinite(n) && n >= TOPUP_MIN && n <= TOPUP_MAX;
  const fee = valid ? (n * PROCESSING_FEE_PCT) / 100 + PROCESSING_FEE_FIXED : 0;
  return (
    <Modal title="Top up wallet" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onTopUp(n)}>Pay {valid ? fmtUsd(n + fee) : ''}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[10, 50, 100, 500].map((v) => (
            <button key={v} type="button" className={`chip${Number(amt) === v ? ' chip--on' : ''}`} onClick={() => setAmt(String(v))}>{fmtUsd(v)}</button>
          ))}
        </div>
        <Input label="Amount (USD)" type="number" value={amt} onChange={(e) => setAmt(e.target.value)}
          helper={valid ? `${PROCESSING_FEE_PCT}% + ${fmtUsd(PROCESSING_FEE_FIXED)} processing: ${fmtUsd(fee)}. Charged via Stripe.` : `Enter between ${fmtUsd(TOPUP_MIN)} and ${fmtUsd(TOPUP_MAX)}.`} />
      </div>
    </Modal>
  );
}
