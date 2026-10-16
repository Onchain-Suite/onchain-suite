/** Persistent in-page status banner (status bg + 3px left border + shaped icon). */
export interface AlertProps {
  status?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  children?: React.ReactNode;
  /** Optional action label */
  action?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
