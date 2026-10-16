/** Hover/focus tooltip — navy.900, label-s, max 240px. No interactive content inside. */
export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}
