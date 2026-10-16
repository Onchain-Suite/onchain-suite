/** Right-side drawer (480/640) — inspect/edit without losing list context. */
export interface DrawerProps {
  open?: boolean;
  title: string;
  children?: React.ReactNode;
  /** 480 or 640 */
  width?: number;
  onClose?: () => void;
  /** Render without fixed scrim (for specimen embedding) */
  inline?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
