/** Vertical timeline — status dots + 1px connector (base for the Communication Timeline). */
export interface TimelineProps {
  entries?: Array<{ title: React.ReactNode; meta?: string; status?: 'success' | 'info' | 'warning' | 'error' | 'neutral'; icon?: string }>;
  style?: React.CSSProperties;
  className?: string;
}
