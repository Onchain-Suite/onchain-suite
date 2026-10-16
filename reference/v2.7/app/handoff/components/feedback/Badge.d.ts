/** System-assigned status pill (20px, radius.full). */
export interface BadgeProps {
  /** success = active/delivered · info = scheduled/pending · warning = at-risk/throttled · error = failed/reverted · neutral = draft/paused */
  status?: 'success' | 'info' | 'warning' | 'error' | 'neutral';
  /** Leading status dot */
  dot?: boolean;
  /** Pulsing dot for live surfaces */
  live?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}
