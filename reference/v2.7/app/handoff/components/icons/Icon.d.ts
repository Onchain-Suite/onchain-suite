/**
 * Lucide icon at locked sizes. Stroke auto: 2px at ≤16, 1.5px at 20/24.
 */
export interface IconProps {
  /** Lucide icon name, kebab-case (e.g. "wallet", "chart-line", "check-circle-2") */
  name: string;
  /** 16 | 20 | 24 (locked sizes) */
  size?: 16 | 20 | 24 | number;
  /** Override the auto stroke width */
  strokeWidth?: number;
  /** Defaults to currentColor — icons inherit text colour */
  color?: string;
  /** Accessible label; omit for decorative icons (aria-hidden) */
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}
