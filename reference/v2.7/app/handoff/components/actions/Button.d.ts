/**
 * The action commit control. One primary per view region; labels are verbs.
 */
export interface ButtonProps {
  /** 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'destructive-secondary' | 'marketing' (marketing surfaces only) */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'destructive-secondary' | 'marketing';
  /** s=28px, m=36px (default), l=44px (marketing/touch) */
  size?: 's' | 'm' | 'l';
  /** Leading Lucide icon name */
  icon?: string;
  /** Trailing Lucide icon name */
  trailingIcon?: string;
  /** Spinner replaces leading icon; width locked; sets aria-busy */
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
  className?: string;
}
