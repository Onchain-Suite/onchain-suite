/** Legend for multi-series Chart; swatch order matches Chart's categorical palette. */
export interface ChartLegendItem {
  label: string;
  /** Optional trailing value (e.g. a total) */
  value?: string | number;
  /** Override the palette colour (match the Chart series' color) */
  color?: string;
}
export interface ChartLegendProps {
  /** Strings or { label, value?, color? } — index i matches Chart series i */
  items?: Array<string | ChartLegendItem>;
  /** Indices or labels currently hidden (struck through, dimmed) */
  hidden?: Array<number | string>;
  /** (index, label) => void — makes items clickable for series show/hide */
  onToggle?: (index: number, label: string) => void;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
  className?: string;
}
