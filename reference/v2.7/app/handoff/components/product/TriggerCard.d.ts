/** "When…" definition card: structured prose with editable operand chips + fire sparkline. */
export interface TriggerCardProps {
  /** Event-source Lucide icon */
  icon?: string;
  /** Interleave strings and { chip, onEdit } operands */
  parts?: Array<string | { chip: string; onEdit?: () => void }>;
  /** Fire count over 7d */
  fires?: number;
  /** Sparkline series */
  spark?: number[];
  onTest?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
