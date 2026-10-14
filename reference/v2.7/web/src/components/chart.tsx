import { createContext, useContext, useId, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import * as Recharts from 'recharts';
import './chart.css';

/* shadcn/ui's chart primitives, ported (2.7).
 *
 * Same components, same contract — ChartContainer, ChartTooltip/Content, ChartLegend/Content,
 * a ChartConfig keyed by dataKey, and --color-<key> variables emitted per chart. Recharts does
 * the drawing; this is the thin layer over it, which is the whole point of the original: "we do
 * not wrap Recharts", so the Recharts API stays available underneath.
 *
 * Two deliberate departures, both forced by this codebase rather than chosen:
 *
 * Tailwind. shadcn's version is a wall of utility classes and this app has no Tailwind — it has
 * a mature design-token stylesheet. Installing Tailwind to get a tooltip would mean two styling
 * systems arguing over the same components forever. The classes are real CSS in chart.css, with
 * the same names, so the shape is recognisable to anyone who knows the original.
 *
 * Colours. --chart-1..5 exist now and carry our palette, so shadcn chart code pastes in
 * unchanged and comes out in our colours rather than theirs.
 */

export type ChartConfig = Record<string, {
  label?: ReactNode;
  icon?: ComponentType;
  color?: string;
}>;

const ChartContext = createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within a <ChartContainer />');
  return ctx;
}

/** Emits --color-<key> for every configured series, scoped to this chart only. */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const coloured = Object.entries(config).filter(([, c]) => c.color);
  if (!coloured.length) return null;
  return (
    <style>{`[data-chart=${id}] {\n${coloured.map(([k, c]) => `  --color-${k}: ${c.color};`).join('\n')}\n}`}</style>
  );
}

export function ChartContainer({ id, className, children, config, style, ...rest }: ComponentProps<'div'> & {
  config: ChartConfig;
  children: ComponentProps<typeof Recharts.ResponsiveContainer>['children'];
}) {
  const uid = useId();
  const chartId = `chart-${id ?? uid.replace(/:/g, '')}`;
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} className={`chart${className ? ` ${className}` : ''}`} style={style} {...rest}>
        <ChartStyle id={chartId} config={config} />
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Recharts.Tooltip;
export const ChartLegend = Recharts.Legend;

interface PayloadItem {
  name?: string | number;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

/* Config keys are slugs, because they also become --color-<key> and a CSS variable cannot
 * contain a space. A pie's legend arrives carrying the raw category off the data row — "In-app
 * push", not "in_app_push" — so the lookup has to try both or every slice is labelled with the
 * name of the field instead of its value. */
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '_');

function configFor(config: ChartConfig, item: PayloadItem, key: string) {
  const fromPayload = item.payload as Record<string, unknown> | undefined;
  const raw = typeof fromPayload?.[key] === 'string' ? String(fromPayload[key]) : undefined;
  return (raw ? config[raw] ?? config[slug(raw)] : undefined) ?? config[key] ?? config[slug(key)];
}

export function ChartTooltipContent({
  active, payload, label, labelFormatter, formatter, hideLabel = false, hideIndicator = false,
  indicator = 'dot', nameKey, labelKey, unit,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  labelFormatter?: (value: unknown, payload: PayloadItem[]) => ReactNode;
  formatter?: (value: unknown, name: string) => ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'dot' | 'line' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  /** Appended to every value — this codebase deals in ETH and percentages. */
  unit?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const rows = payload.filter((i) => i.type !== 'none');
  const [first] = rows;
  const labelText = (() => {
    if (hideLabel || !first) return null;
    const key = String(labelKey ?? first.dataKey ?? first.name ?? 'value');
    const item = configFor(config, first, key);
    const value = !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : item?.label;
    if (labelFormatter) return labelFormatter(value, rows);
    return value ?? label ?? null;
  })();

  const nested = rows.length === 1 && indicator !== 'dot';

  return (
    <div className="chart-tip">
      {!nested && labelText != null && <div className="chart-tip__label">{labelText}</div>}
      <div className="chart-tip__rows">
        {rows.map((item, i) => {
          const key = String(nameKey ?? item.name ?? item.dataKey ?? 'value');
          const item2 = configFor(config, item, key);
          const colour = (item.payload?.fill as string | undefined) ?? item.color;
          return (
            <div className={`chart-tip__row${indicator === 'dot' ? ' is-dot' : ''}`} key={i}>
              {formatter && item.value !== undefined && item.name
                ? formatter(item.value, String(item.name))
                : (
                  <>
                    {!hideIndicator && (
                      <span className={`chart-tip__ind chart-tip__ind--${indicator}`}
                        style={{ ['--color-bg' as string]: colour, ['--color-border' as string]: colour }} />
                    )}
                    <div className={`chart-tip__body${nested ? ' is-nested' : ''}`}>
                      <div className="chart-tip__names">
                        {nested && labelText != null && <div className="chart-tip__label">{labelText}</div>}
                        <span className="chart-tip__name">{item2?.label ?? item.name}</span>
                      </div>
                      {item.value != null && (
                        <span className="chart-tip__value">
                          {typeof item.value === 'number' ? item.value.toLocaleString('en-US') : String(item.value)}{unit}
                        </span>
                      )}
                    </div>
                  </>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegendContent({
  payload, verticalAlign = 'bottom', hideIcon = false, nameKey, off = [], onToggle, hint,
}: {
  payload?: PayloadItem[];
  verticalAlign?: 'top' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string;
  /* Filtering is ours, not shadcn's — their legend is a key. Keeping it here means every chart
     in the product filters the same way rather than each one inventing it. */
  off?: string[];
  onToggle?: (key: string) => void;
  hint?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className={`chart-legend chart-legend--${verticalAlign}`}>
      {payload.filter((i) => i.type !== 'none').map((item, i) => {
        /* `key` is the field to look the config up by, which for a pie is the same string for
           every slice ("label"). It is not a React key — using it as one collapsed five slices
           onto one identity. The resolved name is what differs per entry. */
        const key = String(nameKey ?? item.dataKey ?? item.name ?? 'value');
        const item2 = configFor(config, item, key);
        const label = item2?.label ?? key;
        const hidden = off.includes(key);
        const swatch = !hideIcon && (
          <span className="chart-legend__dot" style={{ background: hidden ? 'var(--text-disabled)' : item.color }} />
        );
        const reactKey = `${String(label)}-${i}`;
        if (!onToggle) return <span className="chart-legend__item" key={reactKey}>{swatch}{label}</span>;
        return (
          <button type="button" key={reactKey} aria-pressed={!hidden}
            className={`chart-legend__item chart-legend__item--btn${hidden ? ' is-off' : ''}`}
            onClick={() => onToggle(key)}>
            {swatch}{label}
          </button>
        );
      })}
      {hint && onToggle && <span className="chart-legend__hint">{hint}</span>}
    </div>
  );
}

export { Recharts };
