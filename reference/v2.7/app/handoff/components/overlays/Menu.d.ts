/** Dropdown menu panel (row menus, "…"). Position it yourself or inside a popover. */
export interface MenuProps {
  items?: Array<
    | { label: string; icon?: string; destructive?: boolean; disabled?: boolean; onSelect?: () => void }
    | { separator: true }
    | { group: string }
  >;
  style?: React.CSSProperties;
  className?: string;
}
