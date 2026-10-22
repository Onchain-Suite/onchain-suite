import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  ComputerDesktopIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  LockClosedIcon,
  MinusIcon,
  MoonIcon,
  NumberedListIcon,
  PencilSquareIcon,
  PhotoIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StrikethroughIcon,
  TagIcon,
  TrashIcon,
  UnderlineIcon,
  UserGroupIcon,
  VariableIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

/**
 * The editor's icons by name, so block and menu definitions (plain data) can
 * name an icon without importing React. An explicit map of exactly the icons
 * used, per-icon imports only (CLAUDE.md §5).
 */
const ICONS = {
  "arrow-left": ArrowLeftIcon,
  bold: BoldIcon,
  braces: VariableIcon,
  check: CheckIcon,
  code: CodeBracketIcon,
  "code-xml": CodeBracketSquareIcon,
  columns: ViewColumnsIcon,
  copy: ClipboardDocumentIcon,
  download: ArrowDownTrayIcon,
  ellipsis: EllipsisHorizontalIcon,
  eye: EyeIcon,
  "heading-1": H1Icon,
  "heading-2": H2Icon,
  "heading-3": H3Icon,
  image: PhotoIcon,
  italic: ItalicIcon,
  link: LinkIcon,
  list: ListBulletIcon,
  "list-ordered": NumberedListIcon,
  lock: LockClosedIcon,
  minus: MinusIcon,
  monitor: ComputerDesktopIcon,
  moon: MoonIcon,
  "pen-line": PencilSquareIcon,
  quote: ChatBubbleBottomCenterTextIcon,
  redo: ArrowUturnRightIcon,
  share: ShareIcon,
  "shield-check": ShieldCheckIcon,
  smartphone: DevicePhoneMobileIcon,
  sparkles: SparklesIcon,
  "square-mouse-pointer": CursorArrowRaysIcon,
  strikethrough: StrikethroughIcon,
  tag: TagIcon,
  "trash-2": TrashIcon,
  "triangle-alert": ExclamationTriangleIcon,
  type: Bars3BottomLeftIcon,
  underline: UnderlineIcon,
  undo: ArrowUturnLeftIcon,
  "unfold-vertical": ArrowsUpDownIcon,
  upload: ArrowUpTrayIcon,
  users: UserGroupIcon,
  "align-left": Bars3BottomLeftIcon,
  "align-center": Bars3Icon,
  x: XMarkIcon,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type EditorIconName = keyof typeof ICONS;

export function EditorIcon({
  name,
  size = 16,
}: {
  name: EditorIconName;
  size?: number;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" width={size} height={size} />;
}
