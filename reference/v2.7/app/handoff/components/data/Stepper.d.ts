/** Linear stepper (3–6 steps), validated advance; completed steps clickable. */
export interface StepperProps {
  steps?: string[];
  /** 0-indexed current step */
  current?: number;
  onStepClick?: (index: number) => void;
  style?: React.CSSProperties;
  className?: string;
}
