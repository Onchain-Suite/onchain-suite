import { useMemo } from 'react';
import { LineChart } from './dashCharts';
import { computeLanes } from '../data/chartBuilder';
import { LANE_META } from '../data/timeline';
import { rangeMeta, useDashboardRange, type RangeId } from './chartKit';
import { RANGE_FACTOR } from '../data/workspaceTotals';
import './lanes-chart.css';

/* All three lanes, one axis (2.7).
 *
 * The dashboard could draw any one lane and never drew them together, which is the seam this
 * product exists to close: what someone does on-chain, what they do inside the operator's
 * app, and what we sent them are three records of one person. Three screens for that teaches
 * the opposite.
 *
 * The strip above the chart carries each lane's total for the dashboard's range, scaled the same
 * way as the Headline, so the two always describe the same window. Nothing is written underneath:
 * a chart that needs a paragraph to be read is a chart that has not done its job, and a
 * paragraph describing the data goes stale the moment the data does. */
const LANES_WINDOW: RangeId = '30d';

/* What each lane's number counts. "events" under all three hid that they are different things,
   which is the one fact the strip most needs to say: these three never add up. */
const COUNTS: Record<string, string> = {
  product: 'in-app events', chain: 'on-chain actions', message: 'sends, opens and clicks',
};

export function LanesChart() {
  const range = useDashboardRange()?.range ?? LANES_WINDOW;
  const lanes = useMemo(() => computeLanes(LANES_WINDOW), []);
  const window = rangeMeta(range).label.toLowerCase();

  return (
    <div className="lanes">
      <div className="lanes__strip">
        {lanes.totals.map((t) => (
          <div className="lanes__tile" key={t.lane}>
            <span className="lanes__lbl">
              <i style={{ background: LANE_META[t.lane].color }} />{t.label}
            </span>
            <b>{Math.round(t.value * RANGE_FACTOR[range]).toLocaleString('en-US')}</b>
            <span className="lanes__sub">{COUNTS[t.lane]} · {window}</span>
          </div>
        ))}
      </div>
      {/* Lines, not areas. Three filled bands on one axis read as a stack — parts of a whole —
          and these three are counts of different things that must never be added together. */}
      <LineChart title="Every lane, one timeline" meta="Product, on-chain and messages on the same axis"
        series={lanes.series} defaultRange={LANES_WINDOW} />
    </div>
  );
}

