import { AUDIENCE } from './workspaceTotals';

/* The holder base (2.7).
 *
 * The audience is who you can talk to. The holder base is everyone holding the token, which
 * is a much larger number and the one that matters for "how much of this can we reach" — the
 * product's whole premise is that we index the chain and discover wallets you do not have a
 * channel for yet. Comparing reachable value against the contacts you already hold answers a
 * question nobody asked and always answers it "nearly all of it".
 *
 * Value follows a power law because token holdings do; linkage is independent of size, which
 * is the finding rather than a modelling convenience. Nothing about having a lot of a token
 * makes someone more likely to have connected a wallet to your dApp or given you an email,
 * so the biggest holders are unreachable at roughly the base rate — and that is exactly the
 * thing an operator does not discover until they try to run a campaign at them.
 */

export interface Holder {
  /** Index is the identity; the mock does not need addresses for an aggregate. */
  i: number;
  eth: number;
  linked: boolean;
}

const COUNT = AUDIENCE;
/** Share of holders who have given us any channel at all. */
const LINK_RATE = 0.34;

function hash(n: number): number {
  let h = 0x811c9dc5 ^ n;
  h = Math.imul(h, 0x01000193) >>> 0;
  h ^= h >>> 15;
  return Math.imul(h, 0x2545f491) >>> 0;
}

/** Deterministic, built once. A Zipf-ish curve: the top holder is large, the tail is long. */
export const HOLDERS: Holder[] = Array.from({ length: COUNT }, (_, i) => ({
  i,
  eth: Math.round((18_000 / (i + 1) ** 0.82) * 100) / 100,
  linked: hash(i) % 1000 < LINK_RATE * 1000,
}));

export const holderTotalEth = HOLDERS.reduce((a, h) => a + h.eth, 0);
