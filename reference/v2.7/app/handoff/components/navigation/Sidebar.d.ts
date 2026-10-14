/** App sidebar (240px): logo, icon+label nav with orange left accent on the active item, workspace switcher. */
export interface SidebarProps {
  /** { id, label, icon (Lucide name), count? } */
  items?: Array<{ id: string; label: string; icon: string; count?: number }>;
  /** Active item id */
  active?: string;
  onNavigate?: (id: string) => void;
  /** Logo image path; falls back to wordmark text */
  logoSrc?: string;
  workspace?: string;
  style?: React.CSSProperties;
  className?: string;
}
