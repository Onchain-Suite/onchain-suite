/** Checkbox (16px, radius.sm). Takes effect on save; use Switch for immediate effect. */
export interface CheckboxProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  /** Mixed state for table select-all */
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
