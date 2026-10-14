/** Empty state — every list/table/chart must declare one. */
export interface EmptyStateProps {
  /** Lucide icon (24px in a 48px neutral circle) */
  icon?: string;
  title: string;
  /** Explain the value, not just the absence */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  docsLabel?: string;
  docsHref?: string;
  style?: React.CSSProperties;
  className?: string;
}
