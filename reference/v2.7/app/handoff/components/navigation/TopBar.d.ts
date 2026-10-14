/** App top bar: breadcrumb · ⌘K search · environment pill · notifications · avatar. */
export interface TopBarProps {
  breadcrumbs?: Array<string | { label: string; href?: string }>;
  /** e.g. "Sandbox" — orange pill; omit in production context */
  env?: string;
  /** Initials source */
  user?: string;
  notificationCount?: number;
  /** Current theme; when set alongside onToggleTheme, renders a sun/moon toggle */
  theme?: 'light' | 'dark';
  /** Handler for the theme toggle button */
  onToggleTheme?: () => void;
  style?: React.CSSProperties;
  className?: string;
}
