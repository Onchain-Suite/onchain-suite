/**
 * Text field — top label, 36px control, helper/error slot.
 */
export interface InputProps {
  label?: string;
  /** Shows "· optional" beside the label */
  optional?: boolean;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  /** Helper text below; replaced by error when set */
  helper?: string;
  /** Error message — red border + alert-triangle icon */
  error?: string;
  /** Prefix slot (units, protocol) */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** Leading Lucide icon inside the control */
  icon?: string;
  /** Geist Mono input text (wallet addresses) */
  mono?: boolean;
  disabled?: boolean;
  type?: string;
  style?: React.CSSProperties;
  className?: string;
}
