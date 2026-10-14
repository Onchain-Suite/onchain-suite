/** Underline tabs (2px blue indicator) for peer views of one object. */
export interface TabsProps {
  /** Strings or { id, label, count? } */
  tabs?: Array<string | { id: string; label: string; count?: number }>;
  active?: string;
  defaultActive?: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
  className?: string;
}
