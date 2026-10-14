/** Data table with the normative rules baked in: right-aligned tabular numerals, hover tint, selection, sticky header, no zebra stripes. */
export interface TableProps {
  columns?: Array<{ key: string; label: string; numeric?: boolean; sortable?: boolean; render?: (row: any) => React.ReactNode }>;
  rows?: any[];
  /** Adds the selection column */
  selectable?: boolean;
  /** Selected row keys */
  selected?: Array<string | number>;
  onSelect?: (ids: Array<string | number>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  /** 36px rows instead of 44px */
  compact?: boolean;
  /** Row identity field, default "id" */
  rowKey?: string;
  style?: React.CSSProperties;
  className?: string;
}
