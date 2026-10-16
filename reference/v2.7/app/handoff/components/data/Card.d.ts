/** Resting surface card: 1px border, radius.lg, 24px padding, NO shadow. */
export interface CardProps {
  /** heading-m header */
  title?: string;
  /** Right-aligned header actions */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Hover gains elevation.1 + stronger border */
  interactive?: boolean;
  /** 16px padding density */
  compact?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
