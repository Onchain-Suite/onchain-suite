import { describe, expect, it } from 'vitest';
import {
  METERS, PAYG_CAPS, PLANS, PROCESSING_FEE_FIXED, PROCESSING_FEE_PCT,
  PROCESSING_FEE_PCT_CROSS_CURRENCY, RENEWAL_REMINDER_DAYS, TOPUP_MAX, TOPUP_MIN,
  CREDITS_PER_CONTACT,
  allowanceAtList, billingState, getMeter, getPlan, meterCost, overageMultiple, selectablePlans,
  sendPrice,
} from './pricing';

/* Asserts every published number in the business plan (version 13, 27 September 2026), so
   drift between the plan and the product fails CI rather than reaching a customer. */

describe('plan catalog', () => {
  it('prices the Suite ladder exactly as the business plan does', () => {
    expect(getPlan('launch')!.monthly).toBe(39);
    expect(getPlan('launch-plus')!.monthly).toBe(118);
    expect(getPlan('growth')!.monthly).toBe(349);
    expect(getPlan('growth-plus')!.monthly).toBe(681);
  });

  /* Pro is retired (8 Oct 2026): the top tier is Enterprise, priced by custom offer. Pro keeps
     its business-plan numbers as a retired plan so a workspace on it keeps its meters, and
     Enterprise starts from those allowances. */
  it('sells Enterprise by custom offer at the top, with Pro retired at its last price', () => {
    const ent = getPlan('enterprise')!;
    expect(ent).toMatchObject({ selectable: true, custom: true, monthly: null });
    expect(ent.allowances.contacts).toBeGreaterThan(getPlan('growth-plus')!.allowances.contacts);
    expect(getPlan('pro')).toMatchObject({ selectable: false, legacy: true, monthly: 1_622 });
    expect(ent.allowances).toEqual(getPlan('pro')!.allowances);
  });

  /* $6 base plus $3.95 per 1,000 subscribers. The plan quotes three points; all three have
     to come out of the formula, or Send is being sold at a price we did not model. */
  it('prices Send off its formula at the quoted subscriber counts', () => {
    expect(getPlan('send')!.monthly).toBeNull();
    expect(sendPrice(2_500)).toBeCloseTo(15.88, 2);
    expect(sendPrice(10_000)).toBeCloseTo(45.50, 2);
    expect(sendPrice(25_000)).toBeCloseTo(104.75, 2);
  });

  /* One rule, four credits a contact, on every package — enough for one full monthly refresh
     when every contact is a wallet. The old table gave Launch 1,000 against 2,500 contacts,
     a tenth of the rule, which is why the allowances are now derived from it. */
  it('gives every Suite package four wallet-data credits per contact', () => {
    for (const id of ['launch', 'launch-plus', 'growth', 'growth-plus', 'enterprise']) {
      const a = getPlan(id)!.allowances;
      expect(a.onchainCredits).toBe(a.contacts * CREDITS_PER_CONTACT);
    }
  });

  it('carries the published allowances for every tier', () => {
    expect(getPlan('send')!.allowances).toMatchObject({
      emails: 50_000, push: 25_000, onchainCredits: 0, seats: 2,
    });
    expect(getPlan('launch')!.allowances).toMatchObject({
      contacts: 2_500, emails: 50_000, push: 25_000, aiCredits: 500, onchainCredits: 10_000, onsPlus: 2_500, seats: 2,
    });
    expect(getPlan('launch-plus')!.allowances).toMatchObject({
      contacts: 10_000, emails: 100_000, push: 100_000, aiCredits: 2_000, onchainCredits: 40_000, onsPlus: 10_000, seats: 3,
    });
    expect(getPlan('growth')!.allowances).toMatchObject({
      contacts: 25_000, emails: 250_000, push: 250_000, aiCredits: 8_000, onchainCredits: 100_000, onsPlus: 25_000, seats: 4, dedicatedIps: 1,
    });
    expect(getPlan('growth-plus')!.allowances).toMatchObject({
      contacts: 50_000, emails: 500_000, push: 500_000, aiCredits: 16_000, onchainCredits: 200_000, onsPlus: 50_000, seats: 5, dedicatedIps: 1,
    });
    expect(getPlan('pro')!.allowances).toMatchObject({
      contacts: 75_000, emails: 750_000, push: 1_000_000, aiCredits: 24_000, onchainCredits: 300_000, onsPlus: 75_000, seats: 7, dedicatedIps: 1,
    });
  });

  it('has no free tier and keeps the retired plans non-selectable', () => {
    expect(selectablePlans().map((p) => p.id)).toEqual(['send', 'launch', 'launch-plus', 'growth', 'growth-plus', 'enterprise']);
    for (const id of ['free', 'starter', 'pro-plus', 'payg', 'scale', 'pro']) expect(getPlan(id)!.selectable).toBe(false);
  });

  /* v4 removed annual billing outright: "No discounting until we have churn data worth
     trading against." A reappearing annual price is a pricing decision, not a refactor. */
  it('sells monthly only — no annual price anywhere', () => {
    for (const p of PLANS) expect(p).not.toHaveProperty('annual');
  });
});

describe('retired PAYG, meters intact', () => {
  it('caps PAYG so it cannot substitute for a paid tier', () => {
    expect(PAYG_CAPS).toEqual({ contacts: 1_000, seats: 2, automations: 3 });
  });

  /* The cap and the plan row are the same number in two places and once drifted apart. */
  it('keeps the PAYG contact cap identical to the PAYG plan allowance', () => {
    expect(PAYG_CAPS.contacts).toBe(getPlan('payg')!.allowances.contacts);
  });

  /* v4 cut this from 25,000 because "25,000 free contacts made Launch unsellable". */
  it('leaves Launch a reason to exist — it must beat PAYG on contacts', () => {
    expect(getPlan('launch')!.allowances.contacts).toBeGreaterThan(PAYG_CAPS.contacts);
  });

  it('keeps the prepaid wallet top-up range', () => {
    expect(TOPUP_MIN).toBe(10);
    expect(TOPUP_MAX).toBe(1_000);
  });
});

describe('metered rates (v4)', () => {
  it('prices all six meters at list', () => {
    expect(meterCost('emails', 1_000)).toBeCloseTo(1.0);
    expect(meterCost('push', 1_000)).toBeCloseTo(1.0);
    expect(meterCost('onsPlus', 1_000)).toBeCloseTo(10.0);
    expect(meterCost('onchain', 10_000)).toBeCloseTo(10.0);
    expect(meterCost('ai', 1_000)).toBeCloseTo(5.0);
    expect(meterCost('concierge', 1)).toBeCloseTo(150.0);
  });

  /* The retired $2.50 sat below GoldRush's $8.33 and lost money on any wallet the cache
     missed. Alchemy costs $1.08 per 10,000 at four credits a wallet, so $10 clears it with
     room; this is still the single most expensive meter to get wrong. */
  it('prices wallet-data credits well above supplier cost', () => {
    expect(getMeter('onchain').price).toBe(10.0);
    expect(meterCost('onchain', 10_000)).toBeGreaterThan(8.33);
  });

  it('retired the blended messages meter in favour of separate email and push', () => {
    const ids = METERS.map((m) => m.id);
    expect(ids).not.toContain('messages');
    expect(ids).toEqual(expect.arrayContaining(['emails', 'push']));
  });
});

/* The heart of v4's economics, and the thing v3 had backwards.
 *
 * A plan is a discount on list price; overage is not discounted. So a tier's allowances
 * bought at list must cost MORE than the tier, and exceeding an allowance must genuinely
 * cost more per unit. If either flips, overage becomes a cheaper way to buy the same units
 * and the tier ladder stops meaning anything. */
describe('a plan is a discount on list, and overage is not', () => {
  it('prices every tier below its own allowances at list', () => {
    for (const id of ['launch', 'launch-plus', 'growth', 'growth-plus', 'pro']) {
      const p = getPlan(id)!;
      expect(p.monthly!).toBeLessThan(allowanceAtList(p));
    }
  });

  it('matches the published list values and overage multiples', () => {
    const expected: Record<string, [number, number]> = {
      launch: [112.5, 2.885], 'launch-plus': [350, 2.966], growth: [890, 2.550],
      'growth-plus': [1_780, 2.614], pro: [2_920, 1.800],
    };
    for (const [id, [list, mult]] of Object.entries(expected)) {
      const p = getPlan(id)!;
      expect(allowanceAtList(p)).toBeCloseTo(list, 0);
      expect(overageMultiple(p)).toBeCloseTo(mult, 2);
    }
  });

  it('never lets overage become the cheaper way to buy the same units', () => {
    for (const id of ['launch', 'launch-plus', 'growth', 'growth-plus', 'pro']) {
      expect(overageMultiple(getPlan(id)!)).toBeGreaterThan(1);
    }
  });
});

describe('payment rail', () => {
  /* Blockradar at 0.75% became Stripe at 3.325% + $0.25 — 4.4x dearer and now an explicit
     cost line. Cross-currency settlement costs a further two points of margin. */
  it('charges the Stripe rate v4 priced in', () => {
    expect(PROCESSING_FEE_PCT).toBe(3.325);
    expect(PROCESSING_FEE_FIXED).toBe(0.25);
    expect(PROCESSING_FEE_PCT_CROSS_CURRENCY).toBe(5.33);
  });
});

describe('lifecycle — no revenue cliffs', () => {
  it('reminds before expiry', () => {
    expect(RENEWAL_REMINDER_DAYS).toEqual([4, 2, 1]);
  });

  it('falls through to usage-based rather than cutting anyone off', () => {
    expect(billingState({ subscribed: true, allowanceLeft: true, walletBalance: 0 })).toBe('subscribed');
    expect(billingState({ subscribed: true, allowanceLeft: false, walletBalance: 25 })).toBe('usage-based');
    expect(billingState({ subscribed: false, allowanceLeft: false, walletBalance: 25 })).toBe('usage-based');
  });

  it('blocks only when the wallet is empty too', () => {
    expect(billingState({ subscribed: false, allowanceLeft: false, walletBalance: 0 })).toBe('blocked');
  });
});
