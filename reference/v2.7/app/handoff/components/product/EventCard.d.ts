/** Blockchain event card — human sentence first, raw payload one click deeper. */
export interface EventCardProps {
  /** Event type label: "Swap", "Mint", "Unstake" */
  type?: string;
  /** Human sentence rendered from the event */
  sentence?: React.ReactNode;
  /** Chain badge text */
  chain?: string;
  /** UTC timestamp string */
  timestamp?: string;
  status?: 'success' | 'info' | 'warning' | 'error' | 'neutral';
  /** Raw JSON payload (object or string) — expandable */
  payload?: object | string;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
