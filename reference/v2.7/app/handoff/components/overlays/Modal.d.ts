/** Modal dialog for interrupting decisions ≤1 screen (480/640/800). */
export interface ModalProps {
  open?: boolean;
  title: string;
  children?: React.ReactNode;
  /** s=480, m=640, l=800 */
  size?: 's' | 'm' | 'l';
  /** Footer primary action (verb) */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** 'destructive' for irreversible confirms */
  primaryVariant?: 'primary' | 'destructive';
  secondaryLabel?: string;
  onClose?: () => void;
  /** Render without the fixed scrim (for specimen/preview embedding) */
  inline?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
