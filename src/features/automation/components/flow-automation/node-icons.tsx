/**
 * Icon maps for the automation builder: a distinct glyph per trigger/action
 * `type` (the backend catalogs otherwise ship one generic icon) and per recipe
 * `iconKey`. Per-icon named imports keep these tree-shaken (CLAUDE.md 5).
 * Extracted from create-automations.tsx (CLAUDE.md 15.5).
 */
import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BeakerIcon,
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  DocumentCheckIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  GlobeAltIcon,
  HeartIcon,
  MegaphoneIcon,
  QueueListIcon,
  ScaleIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

/** Recipe card icons, keyed by `AutomationRecipe.iconKey` (recipes.ts is JSX-free). */
export const RECIPE_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  sparkles: SparklesIcon,
  heart: HeartIcon,
  shield: ShieldCheckIcon,
  gift: GiftIcon,
  bag: ShoppingBagIcon,
  scale: ScaleIcon,
};

/** Distinct, compact icon per trigger/action type for the node library and
 *  insert menus (the backend catalogs otherwise ship one generic glyph). */
const LIBRARY_ICONS: Record<string, typeof BoltIcon> = {
  onchain_event: BoltIcon,
  on_chain_event: BoltIcon,
  holder_acquired: SparklesIcon,
  swap_completed: ArrowsRightLeftIcon,
  liquidity_added: BeakerIcon,
  governance_activity: ScaleIcon,
  liquidation_detected: ExclamationTriangleIcon,
  borrow_opened: BanknotesIcon,
  exchange_outflow: ArrowTrendingDownIcon,
  capital_withdrawn: ArrowTrendingDownIcon,
  approval_intent: DocumentCheckIcon,
  staked: BanknotesIcon,
  unstaked: ArrowTrendingDownIcon,
  loan_repaid: BanknotesIcon,
  rewards_claimed: GiftIcon,
  position_opened: ArrowTrendingUpIcon,
  position_closed: ArrowTrendingDownIcon,
  nft_sold: ShoppingBagIcon,
  nft_listed: TagIcon,
  bridged: ArrowsRightLeftIcon,
  large_transfer: BanknotesIcon,
  supply_change: BeakerIcon,
  delegated: UserGroupIcon,
  attestation: ShieldCheckIcon,
  segment_entered: UserGroupIcon,
  segment_exited: UserGroupIcon,
  list_joined: QueueListIcon,
  form_submitted: ClipboardDocumentListIcon,
  email_opened: EnvelopeOpenIcon,
  email_clicked: CursorArrowRaysIcon,
  tag_added: TagIcon,
  campaign_completed: MegaphoneIcon,
  health_threshold: ChartBarIcon,
  defi_health_factor: HeartIcon,
  send_email: EnvelopeIcon,
  email: EnvelopeIcon,
  send_inapp: DevicePhoneMobileIcon,
  inapp: DevicePhoneMobileIcon,
  wait: ClockIcon,
  branch: ArrowsUpDownIcon,
  add_tag: TagIcon,
  add_to_list: QueueListIcon,
  webhook: GlobeAltIcon,
  dispatch_campaign: MegaphoneIcon,
};

export function LibraryIcon({
  type,
  className = "h-3.5 w-3.5",
}: {
  type: string;
  className?: string;
}) {
  const Icon = LIBRARY_ICONS[type] ?? BoltIcon;
  return <Icon aria-hidden="true" className={className} />;
}
