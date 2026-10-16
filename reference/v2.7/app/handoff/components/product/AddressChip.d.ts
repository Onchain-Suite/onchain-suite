/** Canonical wallet address display: mono, 0x1A2b…9F3e (6+4), copy affordance. */
export interface AddressChipProps {
  address?: string;
  /** Optional ENS/label rendered before the address */
  label?: string;
  copyable?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
