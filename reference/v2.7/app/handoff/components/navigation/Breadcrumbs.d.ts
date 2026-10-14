/** Breadcrumb trail; last item = current page. */
export interface BreadcrumbsProps {
  items?: Array<string | { label: string; href?: string }>;
  style?: React.CSSProperties;
  className?: string;
}
