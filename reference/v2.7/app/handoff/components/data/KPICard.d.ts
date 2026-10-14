/** Analytics KPI card. Empty = "—" + "No data for this period", never 0. */
export interface KPICardProps {
  label: string;
  /** Formatted value string; null/undefined renders the empty state */
  value?: string | number | null;
  unit?: string;
  /** Percent delta; ≥0 renders sky ▲, <0 orange ▼ */
  delta?: number;
  /** e.g. "vs last 30d" */
  period?: string;
  /** Numeric series for the 32px sparkline (data.1) */
  spark?: number[];
  style?: React.CSSProperties;
  className?: string;
}
