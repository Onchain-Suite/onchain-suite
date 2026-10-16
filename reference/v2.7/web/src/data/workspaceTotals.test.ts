/* The totals are mock data, but they are the numbers people read side by side, so they have
   to be possible. Each line here is a relationship that a real workspace cannot break. */
import { describe, expect, it } from 'vitest';
import { AUDIENCE, TOTALS_30D as T } from './workspaceTotals';

describe('workspace totals hold together', () => {
  it('counts no more wallets than the audience has', () => {
    for (const n of [T.walletsReached, T.activeWallets, T.onboardingFinished, T.onchainConversions]) {
      expect(n).toBeLessThanOrEqual(AUDIENCE);
    }
  });

  it('sends at least one message to every wallet it reached', () => {
    expect(T.messagesSent).toBeGreaterThanOrEqual(T.walletsReached);
    // Sends are one kind of message event, so the events cannot be fewer than the sends.
    expect(T.messageEvents).toBeGreaterThanOrEqual(T.messagesSent);
  });

  it('converts only wallets that were both active on-chain and reached', () => {
    expect(T.onchainConversions).toBeLessThanOrEqual(T.activeWallets);
    expect(T.onchainConversions).toBeLessThanOrEqual(T.walletsReached);
    expect(T.chainEvents).toBeGreaterThanOrEqual(T.activeWallets);
  });
});
