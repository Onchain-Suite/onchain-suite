/** Radio group for 2–5 mutually exclusive visible options. */
export interface RadioGroupProps {
  name: string;
  options?: Array<string | { value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  direction?: 'column' | 'row';
  style?: React.CSSProperties;
  className?: string;
}
