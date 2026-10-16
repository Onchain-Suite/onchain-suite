/** Prev/next + numbered window pagination. */
export interface PaginationProps {
  page?: number;
  pageCount?: number;
  onChange?: (page: number) => void;
  style?: React.CSSProperties;
  className?: string;
}
