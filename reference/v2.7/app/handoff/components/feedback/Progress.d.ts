/** Progress bar. Omit value for indeterminate (<3s unknowns only). */
export interface ProgressProps {
  /** 0–100; omit for indeterminate */
  value?: number;
  label?: string;
  /** Right-side meta, e.g. "12,400 / 50,000 · ~2 min left" */
  detail?: string;
  style?: React.CSSProperties;
  className?: string;
}
