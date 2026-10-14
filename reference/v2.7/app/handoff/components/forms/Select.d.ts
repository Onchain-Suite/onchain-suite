/** Native-style single-choice select for ≤ ~7 options. */
export interface SelectProps {
  label?: string;
  /** Strings or { value, label } pairs */
  options?: Array<string | { value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  helper?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
