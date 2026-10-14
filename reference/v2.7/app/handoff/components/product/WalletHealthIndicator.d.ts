/** 5-segment arc gauge for engagement health; never colour-alone (label built in). */
export interface WalletHealthIndicatorProps {
  state?: 'thriving' | 'healthy' | 'cooling' | 'at-risk' | 'churned';
  /** SVG px size */
  size?: number;
  showLabel?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
