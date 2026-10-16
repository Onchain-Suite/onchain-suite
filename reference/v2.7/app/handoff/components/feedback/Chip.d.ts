/** Interactive filter/selection token (selected = blue.25 bg + blue border). */
export interface ChipProps {
  selected?: boolean;
  /** Leading Lucide icon */
  icon?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  /** Renders a trailing ✕; click removes the active filter */
  onRemove?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
