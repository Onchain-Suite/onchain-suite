/* The Overview shows the Headline and the three lanes on one screen, and they used to
   disagree (41,280 in-app actions above a lane saying 3,351). They now come from one set of
   totals; these pin that the chart engine agrees with it for the whole audience. */
import { describe, expect, it } from 'vitest';
import { computeLanes, computeSpec, newSpec } from './chartBuilder';
import { TOTALS_30D } from './workspaceTotals';

describe('the chart engine agrees with the workspace totals', () => {
  it('gives each lane the same 30-day total the Headline uses', () => {
    const totals = Object.fromEntries(computeLanes('30d').totals.map((t) => [t.lane, t.value]));
    expect(totals).toEqual({
      product: TOTALS_30D.productEvents,
      chain: TOTALS_30D.chainEvents,
      message: TOTALS_30D.messageEvents,
    });
  });

  it('counts the whole audience at its real size, not the 48-wallet sample', () => {
    const active = computeSpec({ ...newSpec(), measure: 'wallets', field: 'Any activity', audience: 'all', splitBy: 'none' });
    expect(Math.round(active.total)).toBe(TOTALS_30D.activeWallets);
    const reached = computeSpec({ ...newSpec(), measure: 'wallets', field: 'Received a campaign', audience: 'all', splitBy: 'none' });
    expect(Math.round(reached.total)).toBe(TOTALS_30D.walletsReached);
  });
});
