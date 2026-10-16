/** Circular people avatar (24/32/40) — image or initials. */
export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 24 | 32 | 40 | number;
  style?: React.CSSProperties;
  className?: string;
}
