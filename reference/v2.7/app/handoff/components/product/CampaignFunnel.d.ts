/** Campaign funnel card; "Converted on-chain" is a first-class stage. */
export interface CampaignFunnelProps {
  title?: string;
  status?: 'success' | 'info' | 'warning' | 'error' | 'neutral';
  statusLabel?: string;
  /** In funnel order; display overrides the formatted number */
  stages?: Array<{ label: string; value: number; display?: string }>;
  style?: React.CSSProperties;
  className?: string;
}
