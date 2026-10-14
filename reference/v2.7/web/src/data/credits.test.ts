import { beforeEach, describe, expect, it } from 'vitest';
import {
  CREDIT_TOPUP, buyCredits, creditBalance, creditsFor, planSpend, resetCreditPeriod,
  setPlan, spendCredits,
} from './credits';
import { CREDITS_PER_ENRICHMENT, getPlan } from './pricing';

/* Credits are money. Everything here is an arithmetic guarantee the UI states out loud and
 * nothing was checking: the balance cannot go negative, a run that cannot be paid for reads
 * as far as the balance covers and stops, and changing plan changes the allowance. */
describe('credits', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCreditPeriod();
    setPlan('growth');
    // buyCredits is additive, so zero the bought pool by spending it is not possible —
    // clearing storage is, and resetCreditPeriod zeroes usage.
  });

  it('spends nothing when nothing is read', () => {
    const before = creditBalance().left;
    expect(spendCredits(0)).toBe(0);
    expect(creditBalance().left).toBe(before);
  });

  it('stops at the balance instead of going negative', () => {
    const { left } = creditBalance();
    const affordable = Math.floor(left / CREDITS_PER_ENRICHMENT);
    // Ask for far more than the balance covers.
    const read = spendCredits(affordable + 5_000);
    expect(read).toBe(affordable);
    expect(creditBalance().left).toBeGreaterThanOrEqual(0);
    expect(creditBalance().used).toBeLessThanOrEqual(creditBalance().allowance + creditBalance().bought);
  });

  it('plans a run before it starts, and the parts add up', () => {
    const { left } = creditBalance();
    const affordable = Math.floor(left / CREDITS_PER_ENRICHMENT);
    const p = planSpend(affordable + 100);
    expect(p.affordable).toBe(affordable);
    expect(p.short).toBe(100);
    // A plan that does not account for every wallet asked about is a plan that surprises.
    expect(p.affordable + p.short).toBe(affordable + 100);
    expect(p.cost).toBe(creditsFor(affordable + 100));
    expect(p.enough).toBe(false);
  });

  it('says a run is affordable when it is', () => {
    const p = planSpend(1);
    expect(p.enough).toBe(true);
    expect(p.short).toBe(0);
  });

  it('debits exactly what was read, not what was asked for', () => {
    const before = creditBalance().used;
    const read = spendCredits(10);
    expect(read).toBe(10);
    expect(creditBalance().used - before).toBe(creditsFor(10));
  });

  it('adds bought credits to the spendable balance', () => {
    const before = creditBalance().left;
    buyCredits(2);
    expect(creditBalance().left).toBe(before + CREDIT_TOPUP.credits * 2);
  });

  it('resets the allowance each period but never the credits someone paid for', () => {
    buyCredits(1);
    spendCredits(5);
    const bought = creditBalance().bought;
    resetCreditPeriod();
    expect(creditBalance().used).toBe(0);
    // Buying credits is a purchase, not a monthly grant — a reset that cleared them would be
    // taking something the customer owns.
    expect(creditBalance().bought).toBe(bought);
  });

  it('changes the allowance when the plan changes', () => {
    setPlan('launch');
    const launch = creditBalance().allowance;
    setPlan('pro');
    const pro = creditBalance().allowance;
    expect(launch).toBe(getPlan('launch')!.allowances.onchainCredits);
    expect(pro).toBe(getPlan('pro')!.allowances.onchainCredits);
    expect(pro).toBeGreaterThan(launch);
  });

  it('treats an unknown plan as no allowance rather than throwing', () => {
    setPlan('not-a-plan');
    expect(creditBalance().allowance).toBe(0);
  });
});
