/** Deterministic wallet identicon, brand-hue quantized, circular. */
export interface IdenticonProps {
  /** Wallet address (drives the deterministic pattern) */
  address?: string;
  size?: 24 | 32 | 40 | number;
  style?: React.CSSProperties;
  className?: string;
}
