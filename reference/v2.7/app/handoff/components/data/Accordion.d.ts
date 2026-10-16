/** Accordion for FAQs and settings groups; multiple-open allowed. */
export interface AccordionProps {
  items?: Array<{ title: string; content: React.ReactNode }>;
  /** Indices open on mount */
  defaultOpen?: number[];
  style?: React.CSSProperties;
  className?: string;
}
