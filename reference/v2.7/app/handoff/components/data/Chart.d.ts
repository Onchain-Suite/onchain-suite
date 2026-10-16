/** Token-driven SVG chart (line / area / bar) for analytics surfaces. */
export interface ChartSeries {
  /** Numeric values */
  data: number[];
  /** Series label (for legends you render alongside) */
  label?: string;
  /** Override the categorical palette colour */
  color?: string;
}
export interface ChartProps {
  /** 'line' (default) | 'area' | 'bar' */
  type?: 'line' | 'area' | 'bar';
  /** Array of series objects, or raw number[][] */
  series?: Array<ChartSeries | number[]>;
  /** X-axis category labels */
  labels?: string[];
  /** SVG height in px (width is responsive) */
  height?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  /** Fix the Y max; omit to auto-scale to the data */
  maxY?: number;
  /** Y tick formatter; defaults to a 1.2k-style compactor */
  yFormat?: (v: number) => string;
  /** Animate once on mount (default true; respects reduced-motion via tokens) */
  animate?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
