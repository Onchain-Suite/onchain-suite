import { BarChart, LineChart, PieChart, RadarChart, RadialChart } from './dashCharts';
import type { ChartSpec, Computed } from '../data/chartBuilder';

/* One spec, rendered as whichever chart it asks for. Kept apart from the builder so the card
 * on the dashboard and the live preview inside the builder are the same component — a preview
 * that renders through a different path is a preview of something else. */
export function SpecChart({ spec, computed }: { spec: ChartSpec; computed: Computed }) {
  const { labels, series, total, unit, rows } = computed;

  if (spec.chart === 'number') {
    return (
      <div className="card__body spec__num">
        <b>{total.toLocaleString('en-US')}{unit}</b>
        <span>{series.length > 1 ? `across ${series.length} ${spec.splitBy === 'none' ? 'buckets' : spec.splitBy}s` : 'total'}</span>
      </div>
    );
  }

  if (spec.chart === 'table') {
    return (
      <div className="card__body">
        <table className="table spec__table">
          <thead><tr><th scope="col">{spec.splitBy === 'none' ? 'Measure' : 'Bucket'}</th><th scope="col" className="num">Value</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td className="num">{r.value.toLocaleString('en-US')}{unit}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* Pie, donut and radial each draw one total divided up, so they take the bucket totals
     rather than a series over time — a pie of a time axis is a pie of nothing. */
  if (spec.chart === 'pie' || spec.chart === 'donut' || spec.chart === 'radial') {
    const single = [{ name: 'Now', color: 'var(--chart-1)', points: rows.map((r) => r.value) }];
    const names = rows.map((r) => r.name);
    const Cmp = spec.chart === 'radial' ? RadialChart : PieChart;
    return <Cmp title="" series={single} labels={names} unit={unit} bare categorical donut={spec.chart === 'donut'} />;
  }

  if (spec.chart === 'radar') {
    return <RadarChart title="" series={series} labels={labels} unit={unit} bare categorical />;
  }

  if (spec.chart === 'bar' || spec.chart === 'stacked') {
    /* A bar chart of a split is a comparison of buckets, not a trend — so the bars are the
       buckets and there is one per name, rather than a bar per time bucket repeated. */
    const single = [{ name: 'Now', color: 'var(--action-primary)', points: rows.map((r) => r.value) }];
    return spec.chart === 'stacked'
      ? <BarChart title="" series={series} labels={labels} stacked bare categorical />
      : <BarChart title="" series={single} labels={rows.map((r) => r.name)} bare categorical />;
  }

  /* The builder owns this chart's range and buckets, so the card must not offer a second
     control that quietly disagrees with the one in the builder. */
  return <LineChart title="" series={series} labels={labels} area={spec.chart === 'area'} bare categorical />;
}
