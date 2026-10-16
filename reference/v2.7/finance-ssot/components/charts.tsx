'use client';
// The document's charts. Recharts under shadcn's chart layer, which is how charts are built in this
// repo already. Colours come from lib/chart-palette.ts, which records why those steps and not the
// ramp's own first three.
//
// Every chart here sits on the same page as a table of the same figures, so a reader who cannot
// separate two hues, or who is holding a printout, still has the numbers.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { MARKET_SERIES, SERIES, SINGLE } from '@/lib/chart-palette';

const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />;
const compact = (n: number) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}m` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`;

function Frame({ title, description, children, footnote }: { title: string; description: string; children: React.ReactNode; footnote?: string }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        {footnote ? <p className="pt-3 text-xs leading-relaxed text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Change over a continuous variable, three series: a line chart.
// ---------------------------------------------------------------------------
/** One point on the utilisation axis: the label, then gross margin per package. */
export type MarginPoint = { u: string } & Partial<Record<'launch' | 'launchPlus' | 'growth' | 'growthPlus' | 'pro', number>>;

const marginConfig: ChartConfig = {
  launch: { label: 'Launch', theme: SERIES.launch },
  launchPlus: { label: 'Launch+', theme: SERIES.launchPlus },
  growth: { label: 'Growth', theme: SERIES.growth },
  growthPlus: { label: 'Growth+', theme: SERIES.growthPlus },
  pro: { label: 'Pro', theme: SERIES.pro },
};

export function MarginCurve({ data }: { data: MarginPoint[] }) {
  return (
    <Frame
      title="Gross margin against how much of the allowance a customer uses"
      description="Every line falls to its lowest point at a full allowance and climbs steeply past it, because usage beyond the allowance bills at list."
      footnote="The dip at 100% is the floor this document plans against: it is what a plan earns from a customer who uses everything they paid for."
    >
      <ChartContainer config={marginConfig} className="h-[280px] w-full">
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8 }} accessibilityLayer>
          {grid}
          <XAxis dataKey="u" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
          <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={44} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Math.round(Number(v) * 100)}%`} />} />
          {/* Recharts 3 defaults itemSorter to "value", which sorts the legend alphabetically and
              reads Growth, Launch, Pro. null keeps the order the Lines are declared in, which is
              the tier order the rest of the document uses. */}
          <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
          {(['launch', 'launchPlus', 'growth', 'growthPlus', 'pro'] as const).map((k) => (
            <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ChartContainer>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Magnitude across five ordered categories, one series: bars.
// ---------------------------------------------------------------------------
const revenueConfig: ChartConfig = { rev: { label: 'Revenue', theme: SINGLE } };

export function RevenueByYear({ data }: { data: { label: string; rev: number }[] }) {
  return (
    <Frame
      title="Revenue by financial year"
      description="Five statutory years to 31 July. FY2027 is an eleven-month stub, so it is short by a month as well as by size."
    >
      <ChartContainer config={revenueConfig} className="h-[260px] w-full">
        <BarChart data={data} margin={{ left: 4, right: 16, top: 8 }} accessibilityLayer>
          {grid}
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={52} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => compact(Number(v))} />} />
          <Bar dataKey="rev" fill="var(--color-rev)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Change over time, one series: a line. Area fill only to read the trend, not to imply volume.
// ---------------------------------------------------------------------------
const cashConfig: ChartConfig = { cash: { label: 'Cash', theme: SINGLE } };

export function CashCurve({ data }: { data: { m: string; cash: number }[] }) {
  return (
    <Frame
      title="Cash, month by month"
      description="The closing balance, month by month. The step is the raise landing in month 13; the dip before it is what the founder bridge covers."
    >
      <ChartContainer config={cashConfig} className="h-[260px] w-full">
        <AreaChart data={data} margin={{ left: 4, right: 16, top: 8 }} accessibilityLayer>
          {grid}
          <XAxis dataKey="m" tickLine={false} axisLine={false} tickMargin={8} interval={11} className="text-xs" />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={52} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => compact(Number(v))} />} />
          <Area dataKey="cash" type="monotone" stroke="var(--color-cash)" strokeWidth={2} fill="var(--color-cash)" fillOpacity={0.12} />
        </AreaChart>
      </ChartContainer>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
const custConfig: ChartConfig = { customers: { label: 'Customers', theme: SINGLE } };

export function CustomerCurve({ data }: { data: { m: string; customers: number }[] }) {
  return (
    <Frame
      title="Customers, month by month"
      description="The book, month by month. Flat at the start because the forecast is anchored to the public beta, not to the day it was written."
      footnote="Intake ramps over six months from the beta, then compounds at a rate that itself decays toward a floor. It does not compound at a constant rate."
    >
      <ChartContainer config={custConfig} className="h-[260px] w-full">
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8 }} accessibilityLayer>
          {grid}
          <XAxis dataKey="m" tickLine={false} axisLine={false} tickMargin={8} interval={11} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} width={40} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => Math.round(Number(v)).toString()} />} />
          <Line dataKey="customers" type="monotone" stroke="var(--color-customers)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartContainer>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Price against list size, log-log. Every curve here is price = a x volume^b, which is a
// straight line on log-log and a squashed hockey stick on linear. A competitor is plotted only
// inside its published range; past it the line stops rather than being extrapolated.
// ---------------------------------------------------------------------------
export type PricePoint = { n: number } & Partial<Record<keyof typeof MARKET_SERIES, number | null>>;

const priceConfig: ChartConfig = {
  ours: { label: 'Suite (ours)', theme: MARKET_SERIES.ours },
  median: { label: 'Market median', theme: MARKET_SERIES.median },
  octopus: { label: 'EmailOctopus Pro', theme: MARKET_SERIES.octopus },
  brevo: { label: 'Brevo Standard', theme: MARKET_SERIES.brevo },
  mailchimp: { label: 'Mailchimp Standard', theme: MARKET_SERIES.mailchimp },
};

const TICKS = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const kfmt = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v));

export function PriceCurve({ data }: { data: PricePoint[] }) {
  return (
    <Frame
      title="Monthly price against list size"
      description="Suite on the Growth curve, the median of every product platform we mapped, and the three we are most often compared with. Both axes are logarithmic, so a volume discount reads as a shallower slope and our flat rate as a steeper one."
      footnote="A competitor's line stops where its published pricing stops; nothing past that point is drawn. Brevo meters emails, not contacts, and is converted at six sends per subscriber a month. The median is taken only across platforms with a published price at that size."
    >
      <ChartContainer config={priceConfig} className="h-[320px] w-full">
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8 }} accessibilityLayer>
          {grid}
          <XAxis dataKey="n" type="number" scale="log" domain={[500, 100000]} ticks={TICKS} tickFormatter={kfmt} tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
          {/* Explicit domain, never 'auto', on a log axis: Recharts folds the nulls into 0 when it
              takes the auto minimum, and log(0) poisons the scale silently - no ticks, no lines,
              no legend, no error. The data runs about $7 to $1,350. */}
          <YAxis type="number" scale="log" domain={[5, 2000]} tickFormatter={compact} tickLine={false} axisLine={false} width={52} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `${Number(v).toLocaleString('en-US')} contacts`} formatter={(v) => (v == null ? 'n/a' : compact(Number(v)))} />} />
          <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
          {(Object.keys(priceConfig) as (keyof typeof MARKET_SERIES)[]).map((k) => (
            <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={k === 'ours' ? 2.5 : 2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
          ))}
        </LineChart>
      </ChartContainer>
    </Frame>
  );
}
