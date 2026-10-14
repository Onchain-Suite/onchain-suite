/** Transient outcome feedback card (bottom-right stack, max 3). */
export interface ToastProps {
  status?: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  /** e.g. "Undo" */
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
