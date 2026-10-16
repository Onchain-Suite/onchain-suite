/** User-assigned metadata label (neutral tint, removable). */
export interface TagProps {
  children?: React.ReactNode;
  /** Shows the remove ✕ */
  onRemove?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
