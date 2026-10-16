// Explicit, tree-shakeable icon map. One concept → one glyph (design-system canonical mapping).
//
// Phosphor rather than Lucide (2.7). Every icon in the product goes through this one component,
// so the swap is a change of map and nothing else — no screen imports an icon directly, which
// is the whole reason that rule existed.
//
// On size: this costs about 68kB gzipped, and the main bundle goes from 30kB to 98kB. It is
// not the barrel — deep imports from dist/csr change nothing. Every Phosphor icon ships all six
// weights in one defs module, roughly 2.3kB each, and 120 of those is the whole increase. We
// use two weights. Cutting the other four means generating a subset of the path data at build
// time, which is real machinery for a real saving; it is not here yet.
//
// Two things do not carry across and are handled here rather than at 200 call sites. Phosphor
// sizes weight by name (thin → bold) where Lucide took a numeric strokeWidth, so the existing
// "heavier when small" rule becomes a weight choice. And Phosphor's names are its own: `mail`
// is an Envelope, `zap` is Lightning, `search` is a MagnifyingGlass. The keys stay as they were
// so nothing else has to change, and so the map keeps naming concepts rather than drawings.
import type { CSSProperties } from 'react';
import {
  SquaresFour, Megaphone, Users, ClipboardText, Lightning, Sparkle, ChartLine, Faders,
  MagnifyingGlass, Bell, Sun, Moon, Envelope, DeviceMobile, CaretDown, CaretRight, CaretUpDown,
  Sidebar, SidebarSimple, Plus, X, Check, CheckCircle, Copy, ArrowUp, ArrowRight, ArrowLeft,
  Microphone, Tray, LockOpen, Fingerprint, TrendUp, TrendDown, Diamond, Gift, TreeStructure,
  Broadcast, At, ChatCircle, PaperPlaneTilt, SlidersHorizontal, Tag as TagIcon, List, Calendar,
  DotsThree, Key, CurrencyCircleDollar, ChartBar, Pulse, ArrowsLeftRight, Clock, UploadSimple,
  ShieldCheck, Pencil, ArrowsClockwise, Table, Code, FileText, FlowArrow, Warning, Repeat, Drop,
  EnvelopeOpen, CursorClick, Heartbeat, Hand, ArrowCounterClockwise, ArrowsSplit, ListPlus,
  Plugs, Pause, PencilSimpleLine, Trash, Lock, TextH, TextT, Cursor, Image as ImageIcon, Minus,
  UserMinus, CaretUp, CaretLeft, Flask, TextHOne, ArrowsVertical, Monitor, Coins, Stack,
  GridFour, Play, DownloadSimple, Compass, ArrowElbowDownRight, Question, Chat, MagicWand,
  ChartPie, CodeSimple, Globe, XLogo, Radio, SealCheck, Eye, ArrowSquareOut, QrCode, Info,
  Wallet, Target, PushPin, User, Buildings, CreditCard, Shield as ShieldIcon, ArrowUpRight,
  Brain, CornersIn, GitBranch, Database, Funnel, FileMagnifyingGlass, CircleNotch,
  type Icon as PhosphorIcon, type IconWeight,
} from '@phosphor-icons/react';

const MAP: Record<string, PhosphorIcon> = {
  'layout-grid': SquaresFour, megaphone: Megaphone, users: Users, 'clipboard-list': ClipboardText,
  zap: Lightning, sparkles: Sparkle, 'line-chart': ChartLine, 'settings-2': Faders, search: MagnifyingGlass,
  bell: Bell, sun: Sun, moon: Moon, mail: Envelope, smartphone: DeviceMobile, 'chevron-down': CaretDown,
  'chevron-right': CaretRight, 'chevrons-up-down': CaretUpDown, plus: Plus, x: X, check: Check,
  'panel-left-close': SidebarSimple, 'panel-left-open': Sidebar,
  'check-circle-2': CheckCircle, copy: Copy, 'arrow-up': ArrowUp, 'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft, mic: Microphone, inbox: Tray, 'lock-open': LockOpen, fingerprint: Fingerprint,
  'trending-up': TrendUp, 'trending-down': TrendDown, gem: Diamond, gift: Gift, network: TreeStructure,
  'radio-tower': Broadcast, 'at-sign': At, 'message-circle': ChatCircle, send: PaperPlaneTilt,
  'sliders-horizontal': SlidersHorizontal, tag: TagIcon, list: List, calendar: Calendar,
  ellipsis: DotsThree, 'key-round': Key, 'circle-dollar-sign': CurrencyCircleDollar,
  'bar-chart-3': ChartBar, activity: Pulse, 'arrow-left-right': ArrowsLeftRight, clock: Clock,
  upload: UploadSimple, 'shield-check': ShieldCheck, pencil: Pencil, refresh: ArrowsClockwise, table: Table,
  chart: ChartLine, code: Code, 'file-text': FileText, workflow: FlowArrow, moon2: Moon,
  'alert-triangle': Warning, 'triangle-alert': Warning,
  repeat: Repeat, droplets: Drop, 'file-check': FileText, 'mail-open': EnvelopeOpen,
  'mouse-pointer-click': CursorClick, 'heart-pulse': Heartbeat, hand: Hand, 'rotate-ccw': ArrowCounterClockwise,
  split: ArrowsSplit, 'list-plus': ListPlus, webhook: Plugs, pause: Pause, 'pen-line': PencilSimpleLine,
  'trash-2': Trash, lock: Lock, heading: TextH, type: TextT, 'square-mouse-pointer': Cursor,
  image: ImageIcon, minus: Minus, 'user-minus': UserMinus, 'chevron-up': CaretUp,
  'chevron-left': CaretLeft, 'flask-conical': Flask, 'chart-no-axes-column': ChartBar,
  'heading-1': TextHOne, 'unfold-vertical': ArrowsVertical, monitor: Monitor,
  coins: Coins, layers: Stack, 'grid-2x2': GridFour, play: Play, download: DownloadSimple,
  compass: Compass, 'corner-down-right': ArrowElbowDownRight, 'search-x': FileMagnifyingGlass,
  'help-circle': Question, 'message-square': Chat, 'wand-sparkles': MagicWand,
  'refresh-cw': ArrowsClockwise, 'chart-pie': ChartPie, 'chart-column': ChartBar, 'chart-line': ChartLine,
  'code-xml': CodeSimple, globe: Globe, twitter: XLogo, radio: Radio, 'mail-check': SealCheck,
  eye: Eye, 'external-link': ArrowSquareOut, 'qr-code': QrCode, info: Info, wallet: Wallet,
  target: Target, pin: PushPin, user: User, 'building-2': Buildings, 'credit-card': CreditCard,
  shield: ShieldIcon, 'arrow-up-right': ArrowUpRight,
  brain: Brain, 'minimize-2': CornersIn, 'git-branch': GitBranch, database: Database,
  funnel: Funnel, 'loader-circle': CircleNotch,
};

export type IconName = keyof typeof MAP | string;

export function Icon({
  name, size = 20, strokeWidth, color = 'currentColor', className, title, style,
}: {
  name: IconName; size?: number; strokeWidth?: number; color?: string; className?: string; title?: string; style?: CSSProperties;
}) {
  const Cmp = MAP[name] ?? Pulse;
  /* Lucide's strokeWidth is still in the signature because call sites pass it, and dropping
     the prop would silently change every one of them. It maps onto a weight instead: anything
     asking for a heavier stroke gets bold, and small glyphs get bold by default the way they
     used to get 2px, because a hairline at 14px disappears. */
  const weight: IconWeight = strokeWidth !== undefined
    ? (strokeWidth >= 2 ? 'bold' : 'regular')
    : (size <= 16 ? 'bold' : 'regular');
  return <Cmp size={size} weight={weight} color={color} className={className} style={style} aria-hidden={title ? undefined : true} aria-label={title} />;
}
