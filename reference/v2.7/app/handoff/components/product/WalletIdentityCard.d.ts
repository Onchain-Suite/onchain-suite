/**
 * One resolved identity across chains and channels — renders identically everywhere.
 */
export interface WalletIdentityCardProps {
  address?: string;
  /** ENS or label */
  ens?: string;
  health?: 'thriving' | 'healthy' | 'cooling' | 'at-risk' | 'churned';
  /** Resolved-identity summary, e.g. "3 wallets · 2 channels" */
  resolved?: string;
  /** Key stat row, e.g. [{ value: '42.8 ETH', label: 'Lifetime value' }] */
  stats?: Array<{ value: string; label: string }>;
  /** Channel reachability, e.g. [{ type: 'email', reachable: true }] */
  channels?: Array<{ type: 'email' | 'push' | 'xmtp' | 'discord'; reachable?: boolean }>;
  /** Compact row form for tables */
  compact?: boolean;
  onView?: () => void;
  onAddToSegment?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
