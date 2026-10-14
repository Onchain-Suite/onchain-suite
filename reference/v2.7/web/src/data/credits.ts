import { useSyncExternalStore } from 'react';
import { loadPersisted, savePersisted } from './persist';
import { CREDITS_PER_ENRICHMENT, getMeter, getPlan, meterCost } from './pricing';

/* Wallet-data credits, and what spends them (2.7).
 *
 * The plan sells these: four credits per contact on every package, four credits per full
 * wallet enrichment, US$10 per additional 10,000. Billing drew a meter for them and nothing
 * in the product ever moved it — a sync could read forty thousand wallets and the balance
 * would sit where it started. That is the one number a customer is actually buying, so it
 * has to come down when the thing they bought it for runs.
 *
 * The run-out behaviour is a decision the plan records as not yet taken. It is taken here,
 * and deliberately the cautious way: a run that cannot be paid for in full reads as many
 * wallets as the balance covers and stops, rather than charging a card nobody authorised in
 * the middle of a job. The shortfall is stated before the run starts, so the choice to top up
 * is made by a person and not by us.
 */

export const CREDIT_TOPUP = { credits: 10_000, usd: 10 };

interface CreditState {
  /** Credits used this billing period. The allowance comes from the plan. */
  used: number;
  /** Credits bought on top of the allowance, which do not reset with the period. */
  bought: number;
}

const KEY = 'credits';
const PLAN_KEY = 'plan';
let state: CreditState = loadPersisted<CreditState>(KEY, { used: 0, bought: 0 });
const subs = new Set<() => void>();
const emit = () => { savePersisted(KEY, state); subs.forEach((fn) => fn()); };
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };

/* The plan the workspace is on.
 *
 * It lived in Billing's own component state while this module read the same localStorage key
 * behind its back. Billing could change the plan and nothing subscribed here was told, so the
 * credit allowance on screen was whatever the last unrelated render had computed — the
 * silent-divergence failure, on the number that decides what a customer can spend.
 *
 * One owner now, with the same store-and-emit shape everything else uses. */
let planId: string = loadPersisted<string>(PLAN_KEY, 'growth');

export function setPlan(id: string): void {
  planId = id;
  savePersisted(PLAN_KEY, planId);
  emit();
}

export function usePlan(): string {
  return useSyncExternalStore(subscribe, () => planId);
}

function planAllowance(): number {
  return getPlan(planId)?.allowances.onchainCredits ?? 0;
}

export interface CreditBalance {
  allowance: number;
  bought: number;
  used: number;
  /** What is left to spend. */
  left: number;
}

function snapshot(): CreditBalance {
  const allowance = planAllowance();
  const left = Math.max(allowance + state.bought - state.used, 0);
  return { allowance, bought: state.bought, used: state.used, left };
}

let cached: CreditBalance = snapshot();
let cacheKey = '';
function current(): CreditBalance {
  // useSyncExternalStore compares by identity, so the same balance must be the same object.
  const key = `${state.used}:${state.bought}:${planAllowance()}`;
  if (key !== cacheKey) { cacheKey = key; cached = snapshot(); }
  return cached;
}

export function useCredits(): CreditBalance {
  return useSyncExternalStore(subscribe, current, current);
}

export const creditBalance = current;

/** Credits a run over `wallets` wallets would cost. */
export const creditsFor = (wallets: number) => wallets * CREDITS_PER_ENRICHMENT;

/** What those credits cost at the published top-up rate, for showing alongside a count. */
export const creditCostUsd = (credits: number) => meterCost('onchain', credits);

export interface SpendPlan {
  /** Wallets the balance can actually pay for. */
  affordable: number;
  /** Wallets that will not be read because the balance runs out first. */
  short: number;
  cost: number;
  enough: boolean;
}

/** What a run of this size would do to the balance, worked out before it starts. */
export function planSpend(wallets: number): SpendPlan {
  const { left } = current();
  const cost = creditsFor(wallets);
  const affordable = Math.min(wallets, Math.floor(left / CREDITS_PER_ENRICHMENT));
  return { affordable, short: wallets - affordable, cost, enough: cost <= left };
}

/** Debit for `wallets` actually read. Returns how many the balance covered. */
export function spendCredits(wallets: number): number {
  const { affordable } = planSpend(wallets);
  state = { ...state, used: state.used + creditsFor(affordable) };
  emit();
  return affordable;
}

export function buyCredits(packs = 1) {
  state = { ...state, bought: state.bought + CREDIT_TOPUP.credits * packs };
  emit();
}

/** New billing period: the allowance resets, bought credits do not. */
export function resetCreditPeriod() {
  state = { ...state, used: 0 };
  emit();
}

export const topUpPriceLabel = () => {
  const m = getMeter('onchain');
  return `$${m.price.toFixed(2)} per ${m.per.toLocaleString('en-US')}`;
};
