/** Navigational link (blue.600, hover underline). Links navigate, never mutate. */
export interface LinkProps {
  href?: string;
  /** Opens in new tab + appends 16px arrow-up-right */
  external?: boolean;
  /** Always-underlined (inside prose) */
  prose?: boolean;
  children?: React.ReactNode;
  onClick?: (e: any) => void;
  style?: React.CSSProperties;
  className?: string;
}
