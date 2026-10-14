/** Icon-only button for dense repeated actions; aria-label + tooltip built in. */
export interface IconButtonProps {
  /** Lucide icon name */
  icon: string;
  /** Required accessible label (also the tooltip) */
  label: string;
  /** s=28px, m=36px */
  size?: 's' | 'm';
  /** Adds surface bg + default border */
  bordered?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
