/** Bounded numeric with immediate visual feedback; paired numeric input built in. */
export interface SliderProps {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Unit hint shown beside the label */
  unit?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
