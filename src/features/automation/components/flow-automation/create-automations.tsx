"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BeakerIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  DocumentCheckIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  GlobeAltIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  QueueListIcon,
  ScaleIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  TrashIcon,
  UserGroupIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatRelativeTime } from "@/lib/date";
import { cn, isJsonObject } from "@/lib/utils";

import "reactflow/dist/style.css";
import {
  automationService,
  type AutomationWatchTrigger,
  type OnchainCatalogDefinition,
} from "../../automation.service";
import { Confetti } from "../confetti";
import {
  AddableEdge,
  EdgeInsertContext,
  type EdgeInsertTarget,
} from "./addable-edge";
import { AutoGrowTextarea } from "./auto-grow-textarea";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";
import { BuilderIssuesPanel } from "./builder-issues-panel";
import { DefiHealthFactorFields } from "./defi-health-factor-fields";
import { FlowSettingsPanel } from "./flow-settings-panel";
import {
  AddToListNode,
  BranchNode,
  DispatchCampaignNode,
  EmailNode,
  InappNode,
  PlaceholderNode,
  TagNode,
  TriggerNode,
  WaitNode,
  WebhookNode,
} from "./nodes";
import { OnchainTriggerFields } from "./onchain-trigger-fields";
import {
  PROPERTY_HINT_CLASS,
  PROPERTY_INPUT_CLASS,
  PROPERTY_LABEL_CLASS,
  PropertySelect,
  type PropertySelectOption,
} from "./property-select";
import { AUTOMATION_RECIPES, type AutomationRecipe } from "./recipes";
import { audienceService } from "@/features/audience/audience.service";
import {
  emailTemplates as fallbackEmailTemplates,
  eventTypes,
  mockContracts,
} from "@/features/automation/data";
import {
  autoLayoutNodes,
  getAutomationData,
  getInitialEdges,
  getInitialNodes,
  isValidConnection,
} from "@/features/automation/utils";
import {
  buildCatalog,
  type CatalogEntry,
  CLIENT_TRIGGER_TYPES,
  CURATED_ACTION_COPY,
  CURATED_TRIGGER_COPY,
  FIXED_ACTIONS,
  FIXED_TRIGGERS,
  GENERIC_ONCHAIN_TRIGGER_TYPES,
  nodeIsTrigger,
  NON_ONCHAIN_TRIGGER_TYPES,
  ON_CHAIN_TRIGGER_TYPES,
  solanaVerdict,
  type SvmSupport,
  TRIGGER_NODE_TYPES,
  TRIGGER_TO_GOAL_EVENT,
} from "@/features/automation/utils/builder-catalog";
import {
  canonicalNodeType,
  fromWireNodes,
  KNOWN_ACTION_TYPES,
  KNOWN_TRIGGER_TYPES,
  toWireGraph,
} from "@/features/automation/utils/builder-graph";
import {
  type BuilderIssue,
  buildLocalIssues,
  isBuilderInvalidError,
  mergeIssues,
  type NodeSetupIssue,
  nodeSetupIssue,
  parseBuilderErrorIssues,
  parseDurationToSeconds,
  parseValidationIssues,
  parseWatchesSkipped,
  parseWatchState,
  summarizeIssues,
} from "@/features/automation/utils/builder-issues";
import {
  BRANCH_OPERATORS,
  BRANCH_VALUELESS_OPERATORS,
  type BranchRule,
  type BuilderSchemaField,
  normalizeBranchRule,
  normalizeSchemaFields,
} from "@/features/automation/utils/builder-schema";
import {
  asBoolean,
  asNumber,
  asString,
  pickArray,
  pickText,
} from "@/features/automation/utils/coerce";
import { resolveContractCatalog } from "@/features/automation/utils/contracts";
import { canRunLendingHealthFactorNow } from "@/features/automation/utils/run-now";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { ContractAddressNudge } from "@/features/settings/components/contract-address-nudge";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { SendConfirmDialog } from "@/shared/components/common/send-confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

// This is a known benign error with ReactFlow that can be safely ignored
if (typeof window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalError = (window as any).onerror;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).onerror = (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ) => {
    if (
      typeof message === "string" &&
      message.includes("ResizeObserver loop")
    ) {
      return true; // Suppress the error
    }
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };
}

/**
 * Paints the analytics overlay's per-node funnel (reached / dropped) as a small
 * chip just under any node, without every node component knowing about it. The
 * chip is absolutely positioned so it never disturbs the card layout or the
 * ReactFlow handles inside it. No stats → renders exactly the wrapped node.
 */
function withNodeStats<P extends { data?: { stats?: unknown } }>(
  Component: React.ComponentType<P>
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => {
    const stats = (props.data?.stats ?? null) as {
      reached: number;
      dropped: number;
    } | null;
    return (
      <div className="relative">
        <Component {...props} />
        {stats ? (
          <div className="pointer-events-none absolute -bottom-3 left-4 z-10 flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm">
            <span className="text-emerald-600 dark:text-emerald-400">
              {stats.reached.toLocaleString()} reached
            </span>
            {stats.dropped > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {stats.dropped.toLocaleString()} dropped
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };
  Wrapped.displayName = `withNodeStats(${
    Component.displayName ?? Component.name ?? "Node"
  })`;
  return Wrapped;
}

const TriggerNodeA = withNodeStats(TriggerNode);
const WaitNodeA = withNodeStats(WaitNode);
const BranchNodeA = withNodeStats(BranchNode);
const EmailNodeA = withNodeStats(EmailNode);
const InappNodeA = withNodeStats(InappNode);
const TagNodeA = withNodeStats(TagNode);
const AddToListNodeA = withNodeStats(AddToListNode);
const WebhookNodeA = withNodeStats(WebhookNode);
const DispatchCampaignNodeA = withNodeStats(DispatchCampaignNode);

const nodeTypes = {
  // Renderer keys used by the drag-and-drop builder.
  trigger: TriggerNodeA,
  wait: WaitNodeA,
  branch: BranchNodeA,
  email: EmailNodeA,
  inapp: InappNodeA,
  tag: TagNodeA,
  list: AddToListNodeA,
  webhook: WebhookNodeA,
  dispatch: DispatchCampaignNodeA,
  placeholder: PlaceholderNode,
  // Canonical backend types - so a graph saved/applied with these (e.g. built-in
  // templates use `node.type: "send_inapp"`, "holder_acquired", …) still renders
  // the correct styled node when loaded onto the canvas.
  send_email: EmailNodeA,
  send_inapp: InappNodeA,
  add_tag: TagNodeA,
  add_to_list: AddToListNodeA,
  dispatch_campaign: DispatchCampaignNodeA,
  onchain_event: TriggerNodeA,
  holder_acquired: TriggerNodeA,
  governance_activity: TriggerNodeA,
  swap_completed: TriggerNodeA,
  liquidity_added: TriggerNodeA,
  borrow_opened: TriggerNodeA,
  exchange_outflow: TriggerNodeA,
  capital_withdrawn: TriggerNodeA,
  liquidation_detected: TriggerNodeA,
  approval_intent: TriggerNodeA,
  segment_entered: TriggerNodeA,
  segment_exited: TriggerNodeA,
  list_joined: TriggerNodeA,
  form_submitted: TriggerNodeA,
  email_opened: TriggerNodeA,
  email_clicked: TriggerNodeA,
  tag_added: TriggerNodeA,
  campaign_completed: TriggerNodeA,
  health_threshold: TriggerNodeA,
  defi_health_factor: TriggerNodeA,
};

/** Custom edge with an inline "+" to insert a step between two nodes. */
const edgeTypes = {
  addable: AddableEdge,
};

/** Human title for the config panel, keyed by the node's renderer/canonical type. */
const NODE_PANEL_LABELS: Record<string, string> = {
  trigger: "Trigger",
  email: "Send email",
  send_email: "Send email",
  inapp: "Send in-app push",
  send_inapp: "Send in-app push",
  wait: "Wait",
  branch: "Branch",
  tag: "Add tag",
  add_tag: "Add tag",
  webhook: "Webhook",
  dispatch: "Dispatch campaign",
  dispatch_campaign: "Dispatch campaign",
};

const nodePanelLabel = (type?: string) => {
  if (!type) return "Step";
  return (
    NODE_PANEL_LABELS[type] ??
    type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
};

/**
 * Maps an action catalog `type` (from GET /automations/builder/actions) to the
 * ReactFlow node renderer key above. Anything not listed falls through to its
 * own type (e.g. `wait`, `branch`). Triggers never use this - they all render
 * with the `trigger` node.
 */
const ACTION_NODE_RENDERER: Record<string, string> = {
  send_email: "email",
  send_inapp: "inapp",
  dispatch_campaign: "dispatch",
  add_tag: "tag",
  add_to_list: "list",
  webhook: "webhook",
  wait: "wait",
  branch: "branch",
};

/**
 * Is this node fully configured? Delegates to the shared inspector so the
 * orange dot on the canvas, the issues list, and the go-live gate can never
 * disagree - and so each reason carries the backend's own code.
 */
function inspectNode(
  node: Pick<Node, "type" | "data">,
  outgoingEdgeCount = 0
): NodeSetupIssue | null {
  const type = node.type ?? "";
  const data = isJsonObject(node.data) ? node.data : {};
  const triggerType = asString(data.triggerType) || type;
  const isTrigger = nodeIsTrigger(type, asString(data.triggerType));
  return nodeSetupIssue(
    {
      type: ACTION_NODE_RENDERER[type] ?? type,
      isTrigger,
      triggerType,
      data,
    },
    { outgoingEdgeCount }
  );
}

/** Recipe card icons, keyed by `AutomationRecipe.iconKey` (recipes.ts is JSX-free). */
const RECIPE_ICONS: Record<
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

/** HTTP methods for the webhook action's Method field. */
const WEBHOOK_METHODS: PropertySelectOption[] = [
  { value: "POST", label: "POST" },
  { value: "GET", label: "GET" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

/** Chain scoping options for an on-chain trigger's Chain field. */
const CHAIN_OPTIONS: PropertySelectOption[] = [
  { value: "All Chains", label: "All chains" },
  { value: "Ethereum", label: "Ethereum" },
  { value: "Base", label: "Base" },
  { value: "Optimism", label: "Optimism" },
  { value: "Arbitrum", label: "Arbitrum" },
  { value: "Polygon", label: "Polygon" },
  { value: "Solana", label: "Solana" },
];

/**
 * Keep a node's currently-stored value selectable even when it isn't in the
 * fetched catalog yet (list still loading, or a value typed before pickers
 * existed), so switching to a picker never silently drops the saved selection.
 */
const ensureOption = (
  options: PropertySelectOption[],
  value: string,
  label?: string
): PropertySelectOption[] =>
  value && !options.some((o) => o.value === value)
    ? [{ value, label: label ?? value }, ...options]
    : options;

type PathPerformanceRow = {
  path: string;
  entries: number;
  conversions: number;
  rate: number;
  revenue: number;
};

type RecentEntryRow = {
  id: string;
  wallet: string;
  email: string;
  timestamp: string;
  outcome: string;
  revenue: number;
  path: string;
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

function LibraryIcon({
  type,
  className = "h-3.5 w-3.5",
}: {
  type: string;
  className?: string;
}) {
  const Icon = LIBRARY_ICONS[type] ?? BoltIcon;
  return <Icon aria-hidden="true" className={className} />;
}

const EDGE_COLORS = {
  default: "rgba(120,130,160,0.5)",
  success: "#22c55e",
  danger: "#f97316",
} as const;

type NodeLibraryItem = {
  type: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  /**
   * Set when the node cannot be used on the chain this flow is already on —
   * currently only Solana, for a preset with no verified program. Rendering it
   * greyed with the reason beats letting someone drag it on and discover at
   * publish that it can never bind.
   */
  disabledReason?: string;
};

const NODE_ACCENTS = {
  sky: {
    tile: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hover: "hover:border-sky-500/50",
    dot: "bg-sky-500",
  },
  orange: {
    tile: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    hover: "hover:border-orange-500/50",
    dot: "bg-orange-500",
  },
  indigo: {
    tile: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    hover: "hover:border-indigo-500/50",
    dot: "bg-indigo-500",
  },
} as const;

/** A draggable, color-accented group of builder nodes in the left library. */
function NodeLibrarySection({
  title,
  accent,
  nodes,
}: {
  title: string;
  accent: keyof typeof NODE_ACCENTS;
  nodes: NodeLibraryItem[];
}) {
  const a = NODE_ACCENTS[accent];
  if (nodes.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full ${a.dot}`}
          aria-hidden="true"
        />
        {title}
        <span aria-hidden="true" className="text-muted-foreground/60">
          ·
        </span>
        <span className="tabular-nums text-muted-foreground/80">
          {nodes.length}
        </span>
      </h3>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div
            key={node.type}
            draggable={!node.disabledReason}
            tabIndex={0}
            role="button"
            aria-disabled={node.disabledReason ? true : undefined}
            title={node.disabledReason}
            aria-label={
              node.disabledReason
                ? `${node.label} — ${node.disabledReason}`
                : `Drag ${node.label} onto the canvas`
            }
            onDragStart={(e) => {
              if (node.disabledReason) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData("application/reactflow", node.type);
              e.dataTransfer.setData("application/label", node.label);
            }}
            className={
              node.disabledReason
                ? "group flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-border/40 bg-background/40 p-2 opacity-45"
                : `group flex cursor-grab items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/30 ${a.hover}`
            }
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${a.tile}`}
            >
              {node.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {node.label}
              </p>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {node.description}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="flex flex-col gap-[3px] pr-0.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
            >
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CreateAutomationContent = () => {
  const params = useParams();
  const automationId = params?.id as string;
  const isNew = automationId === "new-id";

  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState(
    getInitialNodes(automationId)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    getInitialEdges(automationId)
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Flow-level guardrail settings (re-entry policy, frequency cap) persisted in
  // the graph's `settings` and read by the runtime. Hydrated from the backend.
  const [flowSettings, setFlowSettings] = useState<Record<string, unknown>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [automationData, setAutomationData] = useState(
    getAutomationData(automationId)
  );
  const [showNodeSelector, setShowNodeSelector] = useState<{
    show: boolean;
    x: number;
    y: number;
    sourceNode?: string;
  }>({ show: false, x: 0, y: 0 });
  // The edge whose "+" was clicked, and where to float the insert palette.
  const [activeInsertEdge, setActiveInsertEdge] = useState<string | null>(null);
  const [jsonFieldDrafts, setJsonFieldDrafts] = useState<
    Record<string, string>
  >({});
  const [nodeSearch, setNodeSearch] = useState("");
  const [showTriggerPicker, setShowTriggerPicker] = useState(false);
  // Guard before an automation goes live and starts enrolling contacts.
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  // What the backend said about the graph, and the graph it said it about.
  // Kept separate from the local pre-flight so a stale verdict can be labelled
  // rather than silently trusted after the user edits a step.
  const [serverIssues, setServerIssues] = useState<BuilderIssue[]>([]);
  const [checkedGraphKey, setCheckedGraphKey] = useState<string | null>(null);
  // Watch state is about the PUBLISHED automation, not the draft graph, so it
  // is kept apart from the validation verdict: editing a step must not clear
  // "this trigger published but never subscribed", and re-validating must not
  // clear it either. The backend persists `watchesSkipped` on the automation,
  // so it survives a reload.
  const [watchIssues, setWatchIssues] = useState<BuilderIssue[]>([]);

  // On phones the node library renders as an overlay covering the canvas, so
  // start it closed there (post-mount to stay SSR/hydration safe). Desktop
  // keeps the docked, open-by-default sidebar.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const { project, setCenter } = useReactFlow();

  // Identity of the graph the backend last passed judgement on, so a verdict is
  // marked stale the moment a step changes instead of quietly going out of date.
  const graphKey = useMemo(
    () =>
      JSON.stringify({
        n: nodes.map((n) => [n.id, n.type, n.data]),
        e: edges.map((e) => [e.source, e.target, e.sourceHandle ?? null]),
      }),
    [edges, nodes]
  );

  const labelForNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return "Deleted step";
      const label = (
        isJsonObject(node.data) ? asString(node.data.label) : ""
      ).trim();
      return label !== "" ? label : nodePanelLabel(node.type);
    },
    [nodes]
  );

  // Select a step from the issue list and bring it into view, so "Fix" lands
  // the user on the exact field that's wrong.
  const focusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      setSelectedNode(nodeId);
      if (!node) return;
      setCenter(node.position.x + 180, node.position.y + 60, {
        zoom: 1,
        duration: 400,
      });
    },
    [nodes, setCenter]
  );

  /**
   * Record what the backend said about this exact graph and point the user at
   * the first blocking step. `AUTOMATION_BUILDER_INVALID` arrives as a single
   * opaque line ("Automation builder graph is invalid") with the useful part in
   * `errors[]`, so anything we can attribute to a step goes in the issues panel
   * and the toast stays a one-line summary.
   */
  const recordServerIssues = useCallback(
    (parsed: BuilderIssue[]) => {
      setServerIssues(parsed);
      setCheckedGraphKey(graphKey);
      const firstBlocking = parsed.find(
        (issue) => issue.severity === "error" && issue.nodeId
      );
      if (firstBlocking?.nodeId) focusNode(firstBlocking.nodeId);
      return parsed.filter((issue) => issue.severity === "error");
    },
    [focusNode, graphKey]
  );

  /**
   * Turn a thrown request error into panel issues when it carries them, and
   * report it either way. Returns true when the failure was a graph rejection
   * we could explain in the panel.
   */
  const reportGraphError = useCallback(
    (error: unknown, fallback: string): boolean => {
      const parsed = parseBuilderErrorIssues(error);
      if (parsed.length > 0) {
        const blocking = recordServerIssues(parsed);
        toast.error(
          blocking.length > 0
            ? `Can't save yet - ${summarizeIssues(parsed)}`
            : "The graph was rejected - see the issue list above the canvas."
        );
        return true;
      }
      if (isBuilderInvalidError(error)) {
        // The backend rejected the graph but sent no per-step detail. Fall back
        // to the local pre-flight, which at least names the likely steps.
        toast.error(
          "This flow can't be saved yet - check the issue list above the canvas."
        );
        return true;
      }
      toast.error(error instanceof Error ? error.message : fallback);
      return false;
    },
    [recordServerIssues]
  );

  const hydrateBuilderState = useCallback(
    (payload: unknown) => {
      const record = isJsonObject(payload)
        ? (payload as Record<string, unknown>)
        : null;
      // Backend nodes carry CANONICAL types (`swap_completed`, `add_tag`);
      // the canvas keys off renderer types. Convert on the way in so cards and
      // config panels behave exactly as they do for a freshly dragged step.
      const nextNodes = fromWireNodes(pickArray(record?.nodes) as Node[]);
      // Force every loaded edge to the "addable" renderer so the inline "+"
      // insert affordance shows on flows loaded from a template or the backend.
      const nextEdges = (pickArray(record?.edges) as Edge[]).map((edge) => ({
        ...edge,
        type: "addable",
      }));
      setNodes(nextNodes);
      setEdges(nextEdges);
      if (record) {
        setAutomationData((prev) => ({
          ...prev,
          status: asString(record.status) || prev.status,
        }));
        if (isJsonObject(record.settings)) {
          setFlowSettings(record.settings as Record<string, unknown>);
        }
        // `watchesSkipped` rides on every builder response and is replaced
        // outright on each watch sync (including with []), so mirroring it here
        // keeps "published but not firing" visible across reloads instead of
        // only in the publish response.
        if (Array.isArray(record.watchesSkipped)) {
          setWatchIssues(parseWatchesSkipped(record));
        }
      }
      setSelectedNode(null);
      setShowNodeSelector({ show: false, x: 0, y: 0 });
    },
    [setEdges, setNodes]
  );

  const emailTemplatesQuery = useQuery({
    queryKey: ["automations", "builder", "email-templates"],
    queryFn: async () => {
      try {
        const res = await automationService.listBuilderEmailTemplates();
        return pickArray(res);
      } catch {
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // The catalogs are the authority on what can be published: the backend
  // rejects any node whose `type` is in neither of them
  // (`UNSUPPORTED_NODE_TYPE`). Fetch them so the palette cannot offer a step
  // that fails at publish, and fall back to the documented list when the fetch
  // fails rather than emptying the sidebar.
  const catalogTypesQuery = useQuery({
    queryKey: ["automations", "builder", "catalog-types"],
    queryFn: async () => {
      const [triggers, actions] = await Promise.all([
        automationService.listTriggerTypes().catch(() => null),
        automationService.listActionTypes().catch(() => null),
      ]);
      const entries = (payload: unknown): CatalogEntry[] =>
        pickArray(payload)
          .map((entry) =>
            isJsonObject(entry)
              ? {
                  type: asString(entry.type),
                  label: asString(entry.label),
                  description: asString(entry.description),
                  // Whether the trigger can run on Solana, and the program id
                  // to watch if so. Spread rather than set to undefined, so an
                  // older backend that sends no `svm` produces an entry
                  // without the key instead of one that claims to know.
                  ...(isJsonObject(entry.svm)
                    ? { svm: entry.svm as unknown as SvmSupport }
                    : {}),
                }
              : null
          )
          .filter((e): e is CatalogEntry => e !== null && e.type.length > 0);
      return {
        triggers: entries(triggers),
        actions: entries(actions),
      };
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
  });

  /** Solana support per trigger type, straight from the backend catalog. */
  const svmByTriggerType = useMemo(() => {
    const map = new Map<string, SvmSupport>();
    for (const t of catalogTypesQuery.data?.triggers ?? []) {
      if (t.svm) map.set(t.type, t.svm);
    }
    return map;
  }, [catalogTypesQuery.data?.triggers]);

  const supportedTriggerTypes = useMemo(() => {
    const live = catalogTypesQuery.data?.triggers ?? [];
    return new Set([
      ...(live.length > 0 ? live.map((t) => t.type) : KNOWN_TRIGGER_TYPES),
      // Kept supported regardless of the live catalog, which never lists it.
      ...CLIENT_TRIGGER_TYPES,
    ]);
  }, [catalogTypesQuery.data?.triggers]);
  const supportedActionTypes = useMemo(() => {
    const live = catalogTypesQuery.data?.actions ?? [];
    return new Set(
      live.length > 0 ? live.map((a) => a.type) : KNOWN_ACTION_TYPES
    );
  }, [catalogTypesQuery.data?.actions]);
  const supportedNodeTypes = useMemo(
    () => new Set([...supportedTriggerTypes, ...supportedActionTypes]),
    [supportedActionTypes, supportedTriggerTypes]
  );

  const triggerCatalog = useMemo(() => {
    const built = buildCatalog(
      catalogTypesQuery.data?.triggers ?? [],
      CURATED_TRIGGER_COPY,
      FIXED_TRIGGERS,
      supportedTriggerTypes
    ).map((t) => ({ ...t, icon: <LibraryIcon type={t.type} /> }));
    // The live catalog never lists client-only triggers, so append their curated
    // copy when the build did not already include them (it does in the fallback).
    const present = new Set(built.map((t) => t.type));
    const extra = CLIENT_TRIGGER_TYPES.filter((type) => !present.has(type))
      .map((type) => CURATED_TRIGGER_COPY.get(type))
      .filter((entry): entry is CatalogEntry => entry !== undefined)
      .map((entry) => ({ ...entry, icon: <LibraryIcon type={entry.type} /> }));
    return [...built, ...extra];
  }, [catalogTypesQuery.data?.triggers, supportedTriggerTypes]);

  const actionCatalog = useMemo(
    () =>
      buildCatalog(
        catalogTypesQuery.data?.actions ?? [],
        CURATED_ACTION_COPY,
        FIXED_ACTIONS,
        supportedActionTypes
      ).map((a) => ({ ...a, icon: <LibraryIcon type={a.type} /> })),
    [catalogTypesQuery.data?.actions, supportedActionTypes]
  );

  const matchesNodeSearch = useCallback(
    (item: { label?: string; description?: string }) => {
      const q = nodeSearch.trim().toLowerCase();
      if (q.length === 0) return true;
      return (
        (item.label ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    },
    [nodeSearch]
  );
  const filteredTriggerCatalog = useMemo(
    () => triggerCatalog.filter(matchesNodeSearch),
    [triggerCatalog, matchesNodeSearch]
  );
  /**
   * The chain this flow is already on, read off its trigger node.
   *
   * The palette has no chain of its own — chain is per-node — so the only
   * honest signal is what the flow already targets. Undefined on an empty
   * canvas, which correctly disables nothing.
   */
  const flowChain = useMemo(() => {
    const trigger = nodes.find((n) =>
      nodeIsTrigger(n.type, String((n.data as { type?: string })?.type ?? ""))
    );
    const chain = String((trigger?.data as { chain?: string })?.chain ?? "");
    return chain.length > 0 ? chain : undefined;
  }, [nodes]);

  const filteredOnchainTriggers = useMemo(
    () =>
      filteredTriggerCatalog
        .filter((t) => ON_CHAIN_TRIGGER_TYPES.has(t.type))
        .map((t) => {
          // Grey out a preset that has no verified Solana program once the
          // flow is on Solana. Dragging it on would look fine and then refuse
          // to bind at publish, after the whole panel had been filled in.
          const verdict = solanaVerdict(
            svmByTriggerType.get(t.type),
            flowChain
          );
          return verdict && !verdict.supported
            ? { ...t, disabledReason: verdict.reason }
            : t;
        }),
    [filteredTriggerCatalog, svmByTriggerType, flowChain]
  );
  const filteredOffchainTriggers = useMemo(
    () =>
      filteredTriggerCatalog.filter((t) => !ON_CHAIN_TRIGGER_TYPES.has(t.type)),
    [filteredTriggerCatalog]
  );
  const filteredActionCatalog = useMemo(
    () => actionCatalog.filter(matchesNodeSearch),
    [actionCatalog, matchesNodeSearch]
  );

  const emailTemplateOptions = useMemo<
    Array<{
      id: string;
      name: string;
      subject: string;
      category: string;
      previewText: string;
      body: string;
      source?: string;
    }>
  >(() => {
    const fetched = emailTemplatesQuery.data ?? [];
    if (fetched.length === 0) {
      return fallbackEmailTemplates.map((template) => ({
        ...template,
        source: undefined,
      }));
    }

    const normalized = fetched
      .map((template) => {
        if (!isJsonObject(template)) return null;
        const record = template as Record<string, unknown>;
        const id = pickText(record.id, record.templateId, record.slug);
        const name = pickText(record.name, record.title, record.subject);
        if (id.length === 0 || name.length === 0) return null;
        const description = pickText(
          record.previewText,
          record.description,
          record.summary
        );
        return {
          id,
          name,
          subject: pickText(record.subject, name),
          category: pickText(record.category, record.folder, "Template"),
          previewText: description,
          body: pickText(record.body, record.html),
          source: pickText(record.source, record.provider),
        };
      })
      .filter(
        (
          template
        ): template is {
          id: string;
          name: string;
          subject: string;
          category: string;
          previewText: string;
          body: string;
          source: string;
        } => Boolean(template)
      );

    return normalized.length > 0
      ? normalized
      : fallbackEmailTemplates.map((template) => ({
          ...template,
          source: undefined,
        }));
  }, [emailTemplatesQuery.data]);

  const projectSettingsQuery = useQuery({
    queryKey: ["project-settings", "automations"],
    queryFn: () => projectSettingsService.getProjectSettings(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Verified sender identities feed the send_email node's "Sender" picker.
  // The backend resolves node `senderEmail` → org default identity →
  // most-recently-verified identity → platform fallback (docs/backend.md).
  const senderIdentitiesQuery = useQuery({
    queryKey: ["automations", "builder", "sender-identities"],
    queryFn: () => senderIdentitiesService.listSenderIdentities(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const verifiedSenderIdentities = useMemo(
    () =>
      (senderIdentitiesQuery.data ?? []).filter(
        (identity) => identity.status === "verified"
      ),
    [senderIdentitiesQuery.data]
  );

  // Action-node pickers pull from the existing catalogs so a step references a
  // real campaign/list/tag instead of a hand-typed id. Each inherits the
  // builder's no-refetch, fail-soft query defaults.
  const campaignsQuery = useQuery({
    queryKey: ["automations", "builder", "campaigns"],
    queryFn: () => campaignsService.listCampaigns({ limit: 100 }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const campaignOptions = useMemo<PropertySelectOption[]>(
    () =>
      (campaignsQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.name || c.id,
        hint: c.status,
      })),
    [campaignsQuery.data]
  );

  const segmentsQuery = useQuery({
    queryKey: ["automations", "builder", "segments"],
    queryFn: () => audienceService.listSegments({ limit: 100 }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const segmentOptions = useMemo<PropertySelectOption[]>(
    () =>
      (segmentsQuery.data ?? []).map((s) => ({
        value: s.id,
        label: s.name || s.id,
        hint:
          typeof s.count === "number"
            ? `${s.count.toLocaleString()} contacts`
            : undefined,
      })),
    [segmentsQuery.data]
  );

  const tagsQuery = useQuery({
    queryKey: ["automations", "builder", "tags"],
    queryFn: () => audienceService.listTags(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const tagOptions = useMemo<PropertySelectOption[]>(() => {
    const res = tagsQuery.data;
    // listTags returns its response un-unwrapped: an array, or { items }/{ data }.
    const list = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
    return list
      .map((t) => asString(t?.name))
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
  }, [tagsQuery.data]);

  // Builder-scoped contract list from the backend (indexed project contracts);
  // project settings then the static list are fallbacks only.
  const builderContractsQuery = useQuery({
    queryKey: ["automations", "builder", "project-contracts"],
    queryFn: () => automationService.getBuilderProjectContracts(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // On-chain event catalog - backend source of truth for the event picker
  // (normalized EVM + Solana definitions).
  const onchainCatalogQuery = useQuery({
    queryKey: ["automations", "builder", "onchain-catalog"],
    queryFn: () => automationService.getOnchainCatalog(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  });

  // Chain picker options — dynamic from the backend catalog (every supported
  // network), falling back to the static list while the catalog loads. Mainnets
  // list first; testnets follow, tagged so a test deployment on Sepolia/Amoy is
  // reachable (teams trigger off testnets before going to mainnet).
  const chainOptions = useMemo<PropertySelectOption[]>(() => {
    const chains = onchainCatalogQuery.data?.chains ?? [];
    if (chains.length === 0) return CHAIN_OPTIONS;
    const mainnets = chains.filter((c) => !c.testnet);
    const testnets = chains.filter((c) => c.testnet);
    return [
      { value: "all", label: "All chains" },
      ...mainnets.map((c) => ({ value: c.slug, label: c.label })),
      ...testnets.map((c) => ({
        value: c.slug,
        label: c.label,
        hint: "testnet",
      })),
    ];
  }, [onchainCatalogQuery.data]);

  const contractCatalog = useMemo(() => {
    const backendContracts = builderContractsQuery.data?.contracts ?? [];
    if (backendContracts.length > 0) {
      return backendContracts
        .filter(
          (contract) =>
            typeof contract.address === "string" &&
            contract.address.trim().length > 0
        )
        .map((contract) => {
          const chain = contract.chain?.trim() ?? "";
          const name = contract.label?.trim() ?? "";
          return {
            address: contract.address,
            chain: chain.length > 0 ? chain : "Unknown",
            name: name.length > 0 ? name : contract.address,
          };
        });
    }
    return resolveContractCatalog(
      projectSettingsQuery.data?.contractAddresses,
      mockContracts
    );
  }, [
    builderContractsQuery.data?.contracts,
    projectSettingsQuery.data?.contractAddresses,
  ]);

  // Custom Events API names (30-day distinct) - the app_event trigger's
  // matching key is the plain event name, so these merge straight into the
  // event picker alongside the on-chain catalog.
  const eventsCatalogQuery = useQuery({
    queryKey: ["automations", "builder", "events-catalog"],
    queryFn: () => automationService.getEventsCatalog(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  });

  const eventOptions = useMemo(() => {
    const definitions = onchainCatalogQuery.data?.definitions ?? [];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const def of definitions) {
      const value = def.eventName ?? def.label;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: def.label ?? value });
    }
    if (options.length === 0) {
      for (const e of eventTypes) {
        seen.add(e);
        options.push({ value: e, label: e });
      }
    }
    for (const name of eventsCatalogQuery.data ?? []) {
      if (seen.has(name)) continue;
      seen.add(name);
      options.push({ value: name, label: `${name} · app event` });
    }
    return options;
  }, [onchainCatalogQuery.data?.definitions, eventsCatalogQuery.data]);

  // Selecting a catalog event persists its runtime match identifiers on the
  // node (goldrushEventId, eventStandard, topic0, programId, instructionName
  // drive efficient runtime matching). These are internal wire keys, never
  // surfaced in the UI.
  const eventDefinitionByValue = useMemo(() => {
    const map = new Map<string, OnchainCatalogDefinition>();
    for (const def of onchainCatalogQuery.data?.definitions ?? []) {
      const value = def.eventName ?? def.label;
      if (value && !map.has(value)) map.set(value, def);
    }
    return map;
  }, [onchainCatalogQuery.data?.definitions]);

  const automationDetailQuery = useQuery({
    queryKey: ["automations", "detail", automationId],
    queryFn: () => automationService.getAutomation(automationId),
    enabled:
      !isNew && typeof automationId === "string" && automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const builderQuery = useQuery({
    queryKey: ["automations", automationId, "builder"],
    queryFn: () => automationService.getBuilder(automationId),
    enabled:
      !isNew && typeof automationId === "string" && automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // What the automation is subscribed to RIGHT NOW. Only meaningful once it is
  // live, and it is the ONLY place a watch the reconciler later marked `failed`
  // shows up - a clean publish says nothing about the days after it.
  const watchesQuery = useQuery({
    queryKey: ["automations", automationId, "watches"],
    queryFn: () => automationService.getWatches(automationId),
    enabled:
      !isNew &&
      automationData.status === "active" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const publishMutation = useMutation({
    mutationFn: async () => automationService.publishAutomation(automationId),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      await automationDetailQuery.refetch();
      // A publish can succeed while a trigger registers no watch - the
      // automation then reads ACTIVE and never fires, which is the silent
      // failure worth shouting about. `watchesSkipped` names the node.
      const skipped = parseWatchesSkipped(res);
      setWatchIssues(skipped);
      watchesQuery.refetch().catch(() => undefined);
      if (skipped.length === 0) return;
      toast.warning(
        `Published, but ${skipped.length} ${
          skipped.length === 1 ? "trigger isn't" : "triggers aren't"
        } live yet - see the issue list above the canvas.`
      );
    },
    onError: (err) => {
      // Publish validates the draft graph server-side; on rejection the useful
      // detail rides in `errors[]`, so route it to the issues panel.
      reportGraphError(err, "Failed to publish");
    },
  });

  // Run the DeFi lending Health Factor (`defi_health_factor`) trigger
  // immediately, ignoring its 30-minute schedule. Hits the lending endpoint,
  // which reads on-chain positions for a configured pool/protocol/chain - never
  // wire this to `health_threshold` (the contact-score trigger, which has no
  // pool). The response's two numbers are both actionable, so the
  // toast distinguishes "read nothing" (bad pool/chain/no wallets) from "read
  // fine, nothing crossed" (docs/backend.md).
  const runHealthFactorMutation = useMutation({
    mutationFn: async () => automationService.runHealthFactorNow(automationId),
    onSuccess: (res) => {
      const positionsRead = res.positionsRead ?? 0;
      const crossings = res.crossings ?? 0;
      const positions = `${positionsRead} position${positionsRead === 1 ? "" : "s"}`;
      if (positionsRead === 0) {
        toast.warning(
          "Ran, but read 0 positions - check the pool address and chain, and that at least one contact has a wallet."
        );
      } else if (crossings === 0) {
        toast.success(`Read ${positions} - none crossed your threshold.`);
      } else {
        toast.success(
          `Read ${positions} - ${crossings} crossed and entered the flow.`
        );
      }
    },
    onError: (err) => {
      reportGraphError(err, "Couldn't run the health-factor check");
    },
  });

  const statsOverviewQuery = useQuery({
    queryKey: ["automations", automationId, "stats"],
    queryFn: () => automationService.getStatsOverview(automationId),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsPerformanceQuery = useQuery({
    queryKey: ["automations", automationId, "performance"],
    queryFn: () => automationService.getPerformance(automationId),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsPreviewQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "preview"],
    queryFn: () => automationService.getStatsPreview(automationId),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsTimeSeriesQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "time-series", "30days"],
    queryFn: () =>
      automationService.getStatsTimeSeries(automationId, { period: "30days" }),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsPathsQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "paths"],
    queryFn: () => automationService.getStatsPaths(automationId),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsEntriesQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "entries"],
    queryFn: () =>
      automationService.listStatsEntries(automationId, { page: 1, limit: 10 }),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsRevenueQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "revenue"],
    queryFn: () => automationService.getStatsRevenue(automationId),
    enabled:
      !isNew &&
      activeTab === "stats" &&
      typeof automationId === "string" &&
      automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const statsOverview =
    statsOverviewQuery.data ??
    statsPerformanceQuery.data ??
    statsPreviewQuery.data ??
    {};
  const statsEntries = asNumber(
    (statsOverview as Record<string, unknown>).entries
  );
  const statsConversions = asNumber(
    (statsOverview as Record<string, unknown>).conversions
  );
  // The "Completed" card showed CONVERSION rate, so a flow whose every
  // enrolment finished still read 0% unless it also converted. They are
  // different measures: an enrolment COMPLETES when it reaches the end of its
  // flow, and CONVERTS when it hits the flow's configured goal event.
  const statsCompletionRate = asNumber(
    (statsOverview as Record<string, unknown>).completionRate
  );
  const statsConvRate =
    asNumber((statsOverview as Record<string, unknown>).conversionRate) ||
    (statsEntries > 0
      ? Math.round((statsConversions / statsEntries) * 1000) / 10
      : 0);

  const chartData = useMemo(() => {
    const list = pickArray((statsTimeSeriesQuery.data as unknown) ?? []);
    const mapped = list
      .map((r) => {
        if (!isJsonObject(r)) return null;
        const rec = r as Record<string, unknown>;
        return {
          date: asString(rec.date) || asString(rec.at) || "-",
          entries: asNumber(rec.entries),
          conversions: asNumber(rec.conversions),
          revenue: asNumber(rec.revenue),
        };
      })
      .filter(
        (
          x
        ): x is {
          date: string;
          entries: number;
          conversions: number;
          revenue: number;
        } => !!x
      );
    return mapped;
  }, [statsTimeSeriesQuery.data]);

  const pathRows = useMemo(() => {
    const list = pickArray((statsPathsQuery.data as unknown) ?? []);
    const mapped = list
      .map((p) => {
        if (!isJsonObject(p)) return null;
        const rec = p as Record<string, unknown>;
        const rate = asNumber(rec.rate ?? rec.conversionRate);
        return {
          path: asString(rec.path) || "Path",
          entries: asNumber(rec.entries),
          conversions: asNumber(rec.conversions),
          rate,
          revenue: asNumber(rec.revenue),
        };
      })
      .filter((x): x is PathPerformanceRow => !!x);
    return mapped;
  }, [statsPathsQuery.data]);

  const recentRows = useMemo(() => {
    const list = pickArray((statsEntriesQuery.data as unknown) ?? []);
    const mapped = list
      .map((e) => {
        if (!isJsonObject(e)) return null;
        const rec = e as Record<string, unknown>;
        return {
          id: asString(rec.id) || asString(rec.entryId) || crypto.randomUUID(),
          wallet: asString(rec.wallet) || "-",
          email: asString(rec.email) || "-",
          timestamp: asString(rec.timestamp ?? rec.at) || "-",
          outcome: asString(rec.outcome ?? rec.status) || "entered",
          revenue: asNumber(rec.revenue),
          path: asString(rec.path) || "-",
        };
      })
      .filter((x): x is RecentEntryRow => !!x);
    return mapped;
  }, [statsEntriesQuery.data]);

  // "Messages in this flow" is derived from the flow's send steps. Per-message
  // delivery counts have no backend endpoint yet, so metrics render as "-".
  const messageRows = useMemo(() => {
    const sendTypes = new Set([
      "send_email",
      "email",
      "send_inapp",
      "inapp",
      "dispatch_campaign",
    ]);
    return nodes
      .filter((n) => typeof n.type === "string" && sendTypes.has(n.type))
      .map((n) => {
        const data = isJsonObject(n.data)
          ? (n.data as Record<string, unknown>)
          : {};
        const channel =
          n.type === "send_email" || n.type === "email"
            ? "Email"
            : n.type === "dispatch_campaign"
              ? "Campaign"
              : "In-app push";
        const title =
          asString(data.subject) ||
          asString(data.title) ||
          asString(data.label) ||
          channel;
        return { id: n.id, title, channel };
      });
  }, [nodes]);

  const isStatsLoading =
    !isNew &&
    activeTab === "stats" &&
    [
      statsOverviewQuery,
      statsPerformanceQuery,
      statsPreviewQuery,
      statsTimeSeriesQuery,
      statsPathsQuery,
      statsEntriesQuery,
      statsRevenueQuery,
    ].some((query) => query.isLoading || query.isFetching);

  /**
   * The goal event this flow's trigger would collide with, so the goal picker
   * can warn before the user configures a rate that is always 100%.
   */
  const triggerEventType = useMemo(() => {
    const trigger = nodes.find((n) =>
      nodeIsTrigger(n.type, String((n.data as { type?: string })?.type ?? ""))
    );
    if (!trigger) return undefined;
    const key =
      String((trigger.data as { type?: string })?.type ?? "") || trigger.type;
    return TRIGGER_TO_GOAL_EVENT[key ?? ""];
  }, [nodes]);

  const selectedNodeDetails = useMemo(
    () => nodes.find((n) => n.id === selectedNode) ?? null,
    [nodes, selectedNode]
  );
  const selectedNodeData = useMemo(
    () =>
      isJsonObject(selectedNodeDetails?.data)
        ? (selectedNodeDetails.data as Record<string, unknown>)
        : {},
    [selectedNodeDetails]
  );
  // Tag node stores a string[] (with `tag` mirroring the first for legacy reads).
  const selectedTags = useMemo<string[]>(
    () =>
      Array.isArray(selectedNodeData.tags)
        ? (selectedNodeData.tags as unknown[]).map(asString).filter(Boolean)
        : asString(selectedNodeData.tag)
          ? [asString(selectedNodeData.tag)]
          : [],
    [selectedNodeData]
  );
  // Recognize triggers/email nodes by either the drag renderer key OR the
  // canonical backend type (so loaded templates get the bespoke config blocks).
  const selectedIsTrigger =
    TRIGGER_NODE_TYPES.has(asString(selectedNodeDetails?.type)) ||
    TRIGGER_NODE_TYPES.has(asString(selectedNodeData.triggerType));
  const selectedIsEmail =
    selectedNodeDetails?.type === "email" ||
    selectedNodeDetails?.type === "send_email" ||
    asString(selectedNodeData.actionType) === "send_email";
  const selectedIsBranch =
    selectedNodeDetails?.type === "branch" ||
    asString(selectedNodeData.nodeType) === "branch" ||
    asString(selectedNodeData.actionType) === "branch" ||
    asString(selectedNodeData.type) === "branch";
  // Normalize the selected node to its action renderer so each action type gets
  // its own config block (send_inapp → "inapp", add_to_list → "list", …).
  const selectedRenderer =
    ACTION_NODE_RENDERER[asString(selectedNodeDetails?.type)] ??
    asString(selectedNodeDetails?.type);
  const selectedActionType =
    ACTION_NODE_RENDERER[asString(selectedNodeData.actionType)] ??
    asString(selectedNodeData.actionType);
  const isSelectedRenderer = (key: string) =>
    selectedRenderer === key || selectedActionType === key;
  const selectedIsInapp = isSelectedRenderer("inapp");
  const selectedIsWebhook = isSelectedRenderer("webhook");
  const selectedIsDispatch = isSelectedRenderer("dispatch");
  const selectedIsTag = isSelectedRenderer("tag");
  const selectedIsList = isSelectedRenderer("list");
  const selectedIsWait = isSelectedRenderer("wait");
  // Action nodes have their own dedicated config panels above, so the generic
  // schema "Configuration" dump is redundant noise for them - hide it. It stays
  // for off-chain triggers (segment/form) where it is still the only config.
  const selectedHasDedicatedPanel =
    selectedIsEmail ||
    selectedIsInapp ||
    selectedIsWebhook ||
    selectedIsDispatch ||
    selectedIsTag ||
    selectedIsList ||
    selectedIsWait;
  const selectedTemplate = useMemo(() => {
    const templateId = asString(selectedNodeData.templateId);
    return (
      emailTemplateOptions.find((template) => template.id === templateId) ??
      null
    );
  }, [emailTemplateOptions, selectedNodeData]);
  const selectedNodeStats = useMemo(
    () =>
      isJsonObject(selectedNodeData.stats)
        ? (selectedNodeData.stats as Record<string, unknown>)
        : {},
    [selectedNodeData]
  );
  // Per-node performance numbers are attached to node.data.stats by the backend
  // once an automation is published and starts processing entries. Drafts have
  // none, so we surface an explicit empty state instead of a wall of zeros.
  const selectedNodeStatsView = useMemo(() => {
    const conversions = asNumber(selectedNodeStats.conversions);
    const active = asNumber(selectedNodeStats.active);
    const clickRate = asNumber(selectedNodeStats.clickRate);
    const revenue = asNumber(selectedNodeStats.revenue);
    return {
      conversions,
      active,
      clickRate,
      revenue,
      hasData: conversions > 0 || active > 0 || clickRate > 0 || revenue > 0,
    };
  }, [selectedNodeStats]);
  const selectedNodeSchemaType = useMemo(
    () =>
      pickText(
        selectedNodeData.nodeType,
        selectedNodeData.triggerType,
        selectedNodeData.actionType,
        selectedNodeData.type,
        selectedNodeDetails?.type
      ),
    [selectedNodeData, selectedNodeDetails?.type]
  );
  // The DeFi lending "Health Factor Crossed" trigger (`defi_health_factor`) is
  // the one trigger that can be run on demand
  // (POST /automations/{id}/defi/health-factor/run), so it gets a "Run now"
  // control - but only once the automation is saved (needs a real id). It also
  // owns its own pool/threshold/chain panel rather than the contract/event one.
  // NOTE: this is NOT `health_threshold` (a CONTACT-SCORE trigger); the lending
  // endpoint reads on-chain positions and requires a pool/protocol/chain, which
  // the score trigger never has. `canRunLendingHealthFactorNow` is the tested
  // guard that keeps the two from being conflated.
  const selectedIsDefiHealthTrigger =
    selectedIsTrigger && canRunLendingHealthFactorNow(selectedNodeSchemaType);
  // On-chain triggers ask for a contract; only the GENERIC on-chain trigger
  // ("On-chain event") also asks for a raw event. Business presets imply their
  // event, so their panel is just the contract (+ optional chain). Off-chain
  // triggers (segment/list/form/email) need neither. The DeFi trigger is grouped
  // on-chain but is configured by pool + threshold, so it is excluded here.
  const selectedTriggerIsOnchain =
    selectedIsTrigger &&
    ON_CHAIN_TRIGGER_TYPES.has(selectedNodeSchemaType) &&
    !selectedIsDefiHealthTrigger;
  const selectedTriggerHasImpliedEvent =
    selectedTriggerIsOnchain &&
    !GENERIC_ONCHAIN_TRIGGER_TYPES.has(selectedNodeSchemaType);
  const selectedNodeSchemaQuery = useQuery({
    queryKey: [
      "automations",
      "builder",
      "schema",
      selectedNodeDetails?.type,
      selectedNodeSchemaType,
    ],
    queryFn: async () => {
      if (selectedIsTrigger) {
        return automationService.getTriggerSchema(selectedNodeSchemaType);
      }
      return automationService.getActionSchema(selectedNodeSchemaType);
    },
    enabled:
      Boolean(selectedNode) &&
      Boolean(selectedNodeSchemaType) &&
      selectedNodeDetails?.type !== undefined &&
      selectedNodeDetails?.type !== "placeholder" &&
      !isJsonObject(selectedNodeData.schema),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const selectedNodeSchemaFields = useMemo(
    () =>
      normalizeSchemaFields(
        isJsonObject(selectedNodeData.schema)
          ? selectedNodeData.schema
          : selectedNodeSchemaQuery.data
      ),
    [selectedNodeData.schema, selectedNodeSchemaQuery.data]
  );
  // Only the essential (non-advanced) config fields are shown - the low-level
  // advanced fields (topic0, filters…) are dropped so a node's panel is the one
  // or two inputs that matter, not a wall of forms.
  const schemaEssentialFields = useMemo(
    () => selectedNodeSchemaFields.filter((f) => !f.advanced),
    [selectedNodeSchemaFields]
  );

  const updateSelectedNodeData = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== selectedNode) return node;
          const currentData = isJsonObject(node.data)
            ? (node.data as Record<string, unknown>)
            : {};
          return {
            ...node,
            data: {
              ...currentData,
              ...patch,
            },
          };
        })
      );
    },
    [selectedNode, setNodes]
  );

  const updateSchemaFieldValue = useCallback(
    (field: BuilderSchemaField, value: unknown) => {
      updateSelectedNodeData({ [field.key]: value });
    },
    [updateSelectedNodeData]
  );

  // The email node's explicit sender override. The runtime accepts either
  // `senderEmail` or `from` in node data - `senderEmail` is canonical here,
  // but a graph loaded with `from` (template/older build) stays readable and
  // both keys are kept in sync on write so the stale one can't win at runtime.
  const selectedNodeSenderEmail = pickText(
    selectedNodeData.senderEmail,
    selectedNodeData.from
  );

  const senderSelectOptions = useMemo<PropertySelectOption[]>(() => {
    const options: PropertySelectOption[] = [
      {
        value: "",
        label: "Organization default",
        hint: "resolved at send time",
      },
      ...verifiedSenderIdentities.map((identity) => ({
        value: identity.email,
        label: identity.email,
        ...(identity.isDefault ? { hint: "Default" } : {}),
      })),
    ];
    // Preserve a pre-existing free-text override (e.g. from an applied
    // template) as a selectable option instead of silently dropping it.
    if (
      selectedNodeSenderEmail.length > 0 &&
      !verifiedSenderIdentities.some(
        (identity) => identity.email === selectedNodeSenderEmail
      )
    ) {
      options.push({
        value: selectedNodeSenderEmail,
        label: selectedNodeSenderEmail,
        hint: "custom",
      });
    }
    return options;
  }, [selectedNodeSenderEmail, verifiedSenderIdentities]);

  const updateSenderEmail = useCallback(
    (next: string) => {
      const value = next.trim().length > 0 ? next.trim() : undefined;
      updateSelectedNodeData({
        senderEmail: value,
        // Only mirror onto `from` when the node already carries that alias.
        ...("from" in selectedNodeData ? { from: value } : {}),
      });
    },
    [selectedNodeData, updateSelectedNodeData]
  );

  // Branch rules, normalized from either `branches` (builder key) or `rules`
  // (legacy/runtime key) so a node loaded from any source stays editable.
  const branchRules = useMemo<BranchRule[]>(() => {
    const raw = Array.isArray(selectedNodeData.branches)
      ? selectedNodeData.branches
      : Array.isArray(selectedNodeData.rules)
        ? selectedNodeData.rules
        : [];
    return raw.map(normalizeBranchRule);
  }, [selectedNodeData.branches, selectedNodeData.rules]);

  const branchDefaultTarget = pickText(
    selectedNodeData.defaultTarget,
    selectedNodeData.elseTarget,
    selectedNodeData.fallbackTarget
  );

  // Nodes selectable as branch targets (everything except this node + blanks).
  const branchTargetOptions = useMemo(
    () =>
      nodes
        .filter(
          (node) => node.id !== selectedNode && node.type !== "placeholder"
        )
        .map((node) => ({
          value: node.id,
          label:
            asString(isJsonObject(node.data) ? node.data.label : "") ||
            asString(node.type) ||
            node.id,
        })),
    [nodes, selectedNode]
  );

  // Persist rules under both keys so the runtime (reads `rules`/`branches`) and
  // the builder stay in sync - mirrors the tolerant wait/`seconds` fix.
  const writeBranchRules = useCallback(
    (next: BranchRule[]) => {
      updateSelectedNodeData({ branches: next, rules: next });
    },
    [updateSelectedNodeData]
  );

  const addBranchRule = useCallback(() => {
    writeBranchRules([
      ...branchRules,
      {
        id: `rule-${Date.now().toString(36)}`,
        field: "",
        operator: "eq",
        value: "",
        target: "",
      },
    ]);
  }, [branchRules, writeBranchRules]);

  const updateBranchRule = useCallback(
    (id: string, patch: Partial<BranchRule>) => {
      writeBranchRules(
        branchRules.map((rule) =>
          rule.id === id ? { ...rule, ...patch } : rule
        )
      );
    },
    [branchRules, writeBranchRules]
  );

  const removeBranchRule = useCallback(
    (id: string) => {
      writeBranchRules(branchRules.filter((rule) => rule.id !== id));
    },
    [branchRules, writeBranchRules]
  );

  useEffect(() => {
    if (isNew) return;
    const detail = automationDetailQuery.data;
    if (!detail || !isJsonObject(detail)) return;
    setAutomationData((prev) => ({
      ...prev,
      id: automationId,
      name: asString(detail.name) || prev.name,
      description: asString(detail.description) || prev.description,
      status: asString(detail.status) || prev.status,
      createdAt:
        asString(detail.updatedAt ?? detail.createdAt) || prev.createdAt,
      lastTriggered: asString(detail.lastTriggered) || prev.lastTriggered,
    }));
  }, [automationDetailQuery.data, automationId, isNew]);

  useEffect(() => {
    if (isNew) return;
    const payload = builderQuery.data;
    if (!payload || !isJsonObject(payload)) return;
    hydrateBuilderState(payload);
  }, [builderQuery.data, hydrateBuilderState, isNew]);

  useEffect(() => {
    if (!selectedNode) return;
    if (nodes.some((node) => node.id === selectedNode)) return;
    setSelectedNode(null);
    setShowNodeSelector({ show: false, x: 0, y: 0 });
  }, [nodes, selectedNode]);

  useEffect(() => {
    setJsonFieldDrafts({});
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedNodeSchemaQuery.data) return;
    if (isJsonObject(selectedNodeData.schema)) return;
    updateSelectedNodeData({ schema: selectedNodeSchemaQuery.data });
  }, [
    selectedNodeData.schema,
    selectedNodeSchemaQuery.data,
    updateSelectedNodeData,
  ]);

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return { errors: [], warnings: [] };
      return automationService.validateBuilder(
        automationId,
        toWireGraph({ nodes, edges })
      );
    },
  });

  const selectedTriggerRuntimeType = useMemo(() => {
    if (selectedNodeDetails?.type !== "trigger") return null;
    const nodeType = pickText(
      selectedNodeData.nodeType,
      selectedNodeData.triggerType,
      selectedNodeData.type
    ).toLowerCase();
    const label = pickText(selectedNodeData.label).toLowerCase();

    // The DeFi Health Factor trigger has no runtime ingest endpoint - it is
    // tested by the "Run now" sweep instead - so it never uses this synthetic
    // test-event path. Checked first: its type contains "health", which would
    // otherwise fall into the contact-score branch below.
    if (nodeType.includes("defi")) {
      return null;
    }
    if (nodeType.includes("segment") || label.includes("segment")) {
      return "segment_entered" as const;
    }
    if (nodeType.includes("form") || label.includes("form")) {
      return "form_submitted" as const;
    }
    if (
      nodeType.includes("list_joined") ||
      nodeType.includes("joined") ||
      label.includes("joined a list")
    ) {
      return "list_joined" as const;
    }
    if (nodeType.includes("email") || label.includes("email")) {
      return "email_opened" as const;
    }
    if (nodeType.includes("health") || label.includes("health")) {
      return "health_threshold" as const;
    }
    return "onchain_event" as const;
  }, [selectedNodeData, selectedNodeDetails?.type]);

  const runtimeTriggerMutation = useMutation({
    mutationFn: async () => {
      if (isNew || !selectedNode || selectedNodeDetails?.type !== "trigger") {
        throw new Error("Save the automation before sending a test trigger");
      }
      if (selectedTriggerRuntimeType === null) {
        // The DeFi trigger has no synthetic test event; it is swept via Run now.
        throw new Error("Use Run now to test this trigger");
      }

      const sourceEventId = `preview-${selectedNode}-${Date.now()}`;
      const sharedPayload = {
        automationId,
        triggerNodeId: selectedNode,
        preview: true,
      };

      switch (selectedTriggerRuntimeType) {
        case "segment_entered":
          return automationService.triggerSegmentEntered({
            segmentId:
              asString(selectedNodeData.segmentId) || "preview-segment",
            email: "preview@onchainsuite.com",
            sourceEventId,
            payload: sharedPayload,
          });
        case "list_joined":
          return automationService.triggerListJoined({
            segmentId:
              asString(selectedNodeData.segmentId) ||
              asString(selectedNodeData.listId) ||
              "preview-segment",
            email: "preview@onchainsuite.com",
            sourceEventId,
            payload: sharedPayload,
          });
        case "form_submitted":
          return automationService.triggerFormSubmitted({
            formId: asString(selectedNodeData.formId) || "preview-form",
            email: "preview@onchainsuite.com",
            sourceEventId,
            payload: sharedPayload,
          });
        case "email_opened":
          return automationService.triggerEmailOpened({
            campaignId: automationId,
            email: "preview@onchainsuite.com",
            sourceEventId,
            payload: sharedPayload,
          });
        case "health_threshold":
          return automationService.triggerHealthThreshold({
            score: asNumber(selectedNodeData.score) || 75,
            email: "preview@onchainsuite.com",
            sourceEventId,
            payload: sharedPayload,
          });
        default:
          return automationService.triggerOnchainEvent({
            chain: asString(selectedNodeData.chain) || "base-mainnet",
            event: asString(selectedNodeData.event) || "contract.interaction",
            contractAddress:
              asString(selectedNodeData.contractAddress) || undefined,
            walletAddress: "0x000000000000000000000000000000000000dEaD",
            sourceEventId,
            payload: sharedPayload,
          });
      }
    },
    onSuccess: (result) => {
      const entries = asNumber(
        (result as Record<string, unknown> | undefined)?.entries
      );
      const matched = asNumber(
        (result as Record<string, unknown> | undefined)?.matchedAutomations
      );
      // The runtime always accepts the event, so a bare "sent" tells the user
      // nothing about whether the flow actually reacted. Report the three real
      // outcomes distinctly instead.
      if (matched <= 0) {
        toast.warning(
          "Test event delivered, but no live automation matched it. " +
            "Activate this flow, then check the trigger's chain, event and " +
            "contract line up with the test."
        );
        return;
      }
      if (entries <= 0) {
        toast.info(
          `Matched ${matched.toLocaleString()} automation${
            matched === 1 ? "" : "s"
          }, but nobody was enrolled — re-entry or the frequency cap likely ` +
            "skipped this test contact."
        );
        return;
      }
      toast.success(
        `Test event enrolled ${entries.toLocaleString()} ${
          entries === 1 ? "entry" : "entries"
        } across ${matched.toLocaleString()} automation${
          matched === 1 ? "" : "s"
        }. Open the Entries tab to watch it run.`
      );
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to send test trigger";
      toast.error(message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name =
        typeof automationData.name === "string"
          ? automationData.name.trim()
          : "";
      if (name.length === 0) throw new Error("Automation name is required");

      if (isNew) {
        const created = await automationService.createAutomation({
          name,
          description: automationData.description ?? "",
          builder: toWireGraph({ nodes, edges }),
        });
        const createdId = created.automationId;
        if (createdId) {
          await automationService.saveBuilder(createdId, {
            ...toWireGraph({ nodes, edges }),
            settings: flowSettings,
          });
        }
        return { createdId };
      }

      await automationService.updateAutomation(automationId, {
        name,
        description: automationData.description ?? "",
      });
      const builder = await automationService.saveBuilder(automationId, {
        ...toWireGraph({ nodes, edges }),
        settings: flowSettings,
      });
      return { createdId: null as string | null, builder };
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setIsSaving(false);
      if ("builder" in res && res.builder) {
        hydrateBuilderState(res.builder);
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      if (res.createdId) {
        window.location.href = `/automations/${res.createdId}`;
      }
    },
    onError: (err) => {
      setIsSaving(false);
      reportGraphError(err, "Failed to save");
    },
  });

  // Persist the automation NAME the moment the user finishes editing it (blur /
  // Enter), like the campaign editor. The builder autosave below only saves
  // nodes/edges, so without this the title would revert unless the user hit the
  // explicit Save. New (uncreated) automations get their name on first Save.
  const persistName = () => {
    if (isNew) return;
    const next =
      typeof automationData.name === "string" ? automationData.name.trim() : "";
    if (next.length === 0) return;
    automationService
      .updateAutomation(automationId, {
        name: next,
        description: automationData.description ?? "",
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["automations"] }))
      .catch(() => undefined);
  };

  const draftSaveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return;
      await automationService.saveBuilderDraft(
        automationId,
        toWireGraph({ nodes, edges })
      );
    },
  });

  useEffect(() => {
    if (isNew) return;
    const t = window.setTimeout(() => {
      draftSaveMutation.mutate();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [automationId, draftSaveMutation, edges, isNew, nodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const validation = isValidConnection(params, nodes, edges);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      const edgeColor =
        params.sourceHandle === "yes"
          ? EDGE_COLORS.success
          : params.sourceHandle === "no"
            ? EDGE_COLORS.danger
            : EDGE_COLORS.default;

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "addable",
            animated: false,
            style: { stroke: edgeColor, strokeWidth: 1.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
          },
          eds
        )
      );
    },
    [edges, nodes, setEdges]
  );

  /**
   * Run the backend validation pass and publish the verdict into the issues
   * panel. Fired by the header's "Check flow" button and before every save, so
   * the user can ask "what's wrong with this?" without having to save first.
   */
  const runValidation = useCallback(async (): Promise<BuilderIssue[]> => {
    const validation = await validateMutation.mutateAsync();
    const parsed = parseValidationIssues(validation);
    recordServerIssues(parsed);
    return parsed;
  }, [recordServerIssues, validateMutation]);

  const handleCheckFlow = async () => {
    try {
      const parsed = await runValidation();
      const blocking = parsed.filter((issue) => issue.severity === "error");
      if (blocking.length === 0 && errorIssues.length === 0) {
        toast.success("No issues - this flow is ready to go live.");
        return;
      }
      toast.error(
        `${blocking.length || errorIssues.length} ${
          (blocking.length || errorIssues.length) === 1 ? "issue" : "issues"
        } to fix - ${summarizeIssues(
          blocking.length > 0 ? parsed : errorIssues
        )}`
      );
    } catch (err) {
      reportGraphError(err, "Couldn't check this flow");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Validate first: a save the backend refuses comes back as one opaque line
    // ("Automation builder graph is invalid"), whereas the validate pass names
    // the offending steps.
    let parsed: BuilderIssue[] = [];
    try {
      parsed = await runValidation();
    } catch (err) {
      if (
        isBuilderInvalidError(err) ||
        parseBuilderErrorIssues(err).length > 0
      ) {
        setIsSaving(false);
        reportGraphError(err, "Failed to save");
        return;
      }
      // The validation call itself failed (offline, 5xx, endpoint missing).
      // Don't hold the draft hostage to it - PUT /builder validates server-side
      // too, and its rejection lands in the same panel.
    }
    const blocking = parsed.filter((issue) => issue.severity === "error");
    if (blocking.length > 0) {
      setIsSaving(false);
      toast.error(`Can't save yet - ${summarizeIssues(parsed)}`);
      return;
    }
    saveMutation.mutate();
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Classify a catalog `type` as a trigger or action (via the fetched trigger
  // catalog) and resolve its ReactFlow renderer key + initial node data. This
  // replaces the old includes("email") / === "onchain" heuristic, which
  // misrouted every on-chain preset and misclassified `email_opened` (a trigger)
  // as the email action node.
  const resolveNodeShape = useCallback(
    (type: string, label: string) => {
      const category: "trigger" | "action" = triggerCatalog.some(
        (t) => t.type === type
      )
        ? "trigger"
        : "action";
      const rendererType =
        category === "trigger"
          ? "trigger"
          : (ACTION_NODE_RENDERER[type] ?? type);
      const data: Record<string, unknown> = {
        label,
        nodeType: type,
        ...(category === "trigger"
          ? { triggerType: type }
          : { actionType: type }),
        // No "Select Contract" / "Select Event" placeholder text: it made a
        // brand-new trigger read as configured (no orange dot, no issue) and
        // could be saved as a literal value. An unset field stays empty, and a
        // PRESET trigger is never asked for an event at all - its event names
        // are baked into the preset server-side (swap_completed → Swap /
        // TokenExchange, holder_acquired → Transfer from 0x0, …).
      };
      return { category, rendererType, data };
    },
    [triggerCatalog]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/label");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = project({
        x: event.clientX - 200, // Adjust for sidebar
        y: event.clientY - 64, // Adjust for header
      });

      const { category, rendererType, data } = resolveNodeShape(type, label);
      // One trigger per automation — refuse a dragged-in second trigger.
      if (
        category === "trigger" &&
        nodes.some((n) =>
          nodeIsTrigger(
            n.type,
            isJsonObject(n.data) ? asString(n.data.triggerType) : ""
          )
        )
      ) {
        toast.error(
          "An automation can have only one trigger — remove the current one first."
        );
        return;
      }
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: rendererType,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes, resolveNodeShape, nodes]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    if (node.type === "placeholder") {
      setShowNodeSelector({
        show: true,
        x: node.position.x,
        y: node.position.y,
        sourceNode: node.id,
      });
    } else {
      setShowNodeSelector({ show: false, x: 0, y: 0 });
    }
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setShowNodeSelector({ show: false, x: 0, y: 0 });
    setActiveInsertEdge(null);
  };

  /** Actions offered by the inline "+" add-step grid on each edge. */
  const insertMenuItems = useMemo(
    () =>
      actionCatalog.map((a) => ({
        type: a.type,
        label: a.label,
        icon: <LibraryIcon type={a.type} className="h-5 w-5" />,
      })),
    [actionCatalog]
  );

  // While the inline "Add step" grid is open on an edge, push the target step
  // and everything below it down so the grid sits in the opened gap instead of
  // covering the next node.
  // Analytics overlay: fetch the per-node funnel and paint reached/dropped onto
  // each node on the canvas. Off by default (a live automation only).
  const [showAnalytics, setShowAnalytics] = useState(false);
  const flowAnalyticsQuery = useQuery({
    queryKey: ["automations", "flow-analytics", automationId],
    queryFn: () => automationService.getFlowAnalytics(automationId),
    enabled: !isNew && showAnalytics,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
  const nodeStatsById = useMemo(() => {
    const map = new Map<
      string,
      { reached: number; dropped: number; completed: number }
    >();
    for (const n of flowAnalyticsQuery.data?.nodes ?? []) {
      map.set(n.nodeId, {
        reached: n.reached,
        dropped: n.dropped,
        completed: n.completed,
      });
    }
    return map;
  }, [flowAnalyticsQuery.data]);

  const displayNodes = useMemo(() => {
    let out = nodes;
    if (activeInsertEdge) {
      const edge = edges.find((e) => e.id === activeInsertEdge);
      const targetNode = edge
        ? nodes.find((n) => n.id === edge.target)
        : undefined;
      if (targetNode) {
        const threshold = targetNode.position.y;
        const offset = 250;
        out = nodes.map((n) =>
          n.position.y >= threshold
            ? { ...n, position: { ...n.position, y: n.position.y + offset } }
            : n
        );
      }
    }
    if (showAnalytics) {
      out = out.map((n) => ({
        ...n,
        data: { ...n.data, stats: nodeStatsById.get(n.id) ?? null },
      }));
    }
    return out;
  }, [nodes, edges, activeInsertEdge, showAnalytics, nodeStatsById]);

  const addNode = (type: string, label: string) => {
    const { category, rendererType, data } = resolveNodeShape(type, label);
    // One trigger per automation — refuse a second (computed from `nodes`
    // directly to avoid a use-before-define on the memo).
    if (
      category === "trigger" &&
      nodes.some((n) =>
        nodeIsTrigger(
          n.type,
          isJsonObject(n.data) ? asString(n.data.triggerType) : ""
        )
      )
    ) {
      toast.error(
        "An automation can have only one trigger — remove the current one first."
      );
      return;
    }
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: rendererType,
      position: { x: 0, y: 0 }, // Will be calculated
      data,
    };

    const layout = autoLayoutNodes(nodes, newNode);
    newNode.position = layout;

    setNodes((nds) => nds.concat(newNode));
    setShowNodeSelector({ show: false, x: 0, y: 0 });
    setSelectedNode(newNode.id);

    if (!isNew) {
      const schemaType = type;
      const loadSchema = async () => {
        try {
          const schema =
            newNode.type === "trigger"
              ? await automationService.getTriggerSchema(schemaType)
              : await automationService.getActionSchema(schemaType);
          setNodes((nds) =>
            nds.map((n) =>
              n.id === newNode.id
                ? {
                    ...n,
                    data: { ...(n.data as Record<string, unknown>), schema },
                  }
                : n
            )
          );
        } catch (_e) {
          String(_e);
        }
      };
      loadSchema().catch(() => undefined);
    }
  };

  // Drop a pre-wired recipe onto a blank canvas: build a linear spine of nodes
  // (trigger → actions) and the "addable" edges between them, so the flow lands
  // ready to configure and publish. Recipe steps carry a `data` override merged
  // over the resolved node data (a wait's duration, a tag, starter in-app copy).
  const applyRecipe = (recipe: AutomationRecipe) => {
    const stamp = Date.now();
    const newNodes: Node[] = recipe.steps.map((step, i) => {
      const { rendererType, data } = resolveNodeShape(step.type, step.label);
      return {
        id: `recipe-${recipe.id}-${i}-${stamp}`,
        type: rendererType,
        position: { x: 400, y: 50 + i * 130 },
        data: { ...data, ...(step.data ?? {}) },
      };
    });

    const color = EDGE_COLORS.default;
    const newEdges: Edge[] = newNodes.slice(1).map((node, i) => {
      const source = newNodes[i].id;
      return {
        id: `e-${source}-${node.id}`,
        source,
        target: node.id,
        type: "addable",
        animated: false,
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(newNodes[0]?.id ?? null);
    setShowNodeSelector({ show: false, x: 0, y: 0 });
    setShowTriggerPicker(false);
    toast.success(`Started from "${recipe.title}"`);

    // Mirror addNode: on a saved (non-new) automation, hydrate each node's
    // config schema so the properties panel is populated without a click.
    if (!isNew) {
      newNodes.forEach((node) => {
        const schemaType = String(
          (node.data as Record<string, unknown>).nodeType ?? ""
        );
        if (!schemaType) return;
        const loadSchema = async () => {
          try {
            const schema =
              node.type === "trigger"
                ? await automationService.getTriggerSchema(schemaType)
                : await automationService.getActionSchema(schemaType);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      data: { ...(n.data as Record<string, unknown>), schema },
                    }
                  : n
              )
            );
          } catch (_e) {
            String(_e);
          }
        };
        loadSchema().catch(() => undefined);
      });
    }
  };

  // Insert an action node that splits the clicked edge (source → new → target).
  const insertNodeOnEdge = (
    target: EdgeInsertTarget,
    type: string,
    label: string
  ) => {
    const { rendererType, data } = resolveNodeShape(type, label);
    const newId = `${type}-${Date.now()}`;
    const srcNode = nodes.find((n) => n.id === target.source);
    const tgtNode = nodes.find((n) => n.id === target.target);
    const position =
      srcNode && tgtNode
        ? {
            x: (srcNode.position.x + tgtNode.position.x) / 2,
            y: (srcNode.position.y + tgtNode.position.y) / 2,
          }
        : autoLayoutNodes(nodes, {
            id: newId,
            type: rendererType,
            position: { x: 0, y: 0 },
            data,
          });
    const newNode: Node = { id: newId, type: rendererType, position, data };
    const color = EDGE_COLORS.default;
    const mkEdge = (source: string, dest: string): Edge => ({
      id: `e-${source}-${dest}-${newId}`,
      source,
      target: dest,
      type: "addable",
      animated: false,
      style: { stroke: color, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    });
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => [
      ...eds.filter((e) => e.id !== target.edgeId),
      mkEdge(target.source, newId),
      mkEdge(newId, target.target),
    ]);
    setSelectedNode(newId);
    setActiveInsertEdge(null);
  };

  const statusToggleMutation = useMutation({
    mutationFn: async (nextStatus: "active" | "paused") => {
      if (isNew || !automationId) {
        throw new Error("Save the automation before activating it.");
      }
      return automationService.updateAutomationStatus(automationId, {
        status: nextStatus,
      });
    },
    onSuccess: (res, nextStatus) => {
      setAutomationData((prev) => ({ ...prev, status: nextStatus }));
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      // Un-pausing re-runs the same watch sync a publish does and can skip the
      // same triggers, so ACTIVE-but-not-live is a real outcome here too. Any
      // other status releases the watches and returns an empty array.
      const skipped = parseWatchesSkipped(res);
      setWatchIssues(skipped);
      if (nextStatus === "active") {
        watchesQuery.refetch().catch(() => undefined);
        if (skipped.length > 0) {
          toast.warning(
            `Turned on, but ${skipped.length} ${
              skipped.length === 1 ? "trigger isn't" : "triggers aren't"
            } live - see the issue list above the canvas.`
          );
        }
      }
    },
  });

  // Turn a ready draft/paused automation on. Drafts publish first, then flip to
  // active; paused ones activate directly. Fired from the confirm dialog.
  const activateAutomation = () => {
    const finish = () => setShowActivateConfirm(false);
    if (automationData.status === "draft") {
      publishMutation.mutate(undefined, {
        onSuccess: () =>
          statusToggleMutation.mutate("active", {
            onSuccess: finish,
            onError: finish,
          }),
        onError: finish,
      });
    } else {
      statusToggleMutation.mutate("active", {
        onSuccess: finish,
        onError: finish,
      });
    }
  };

  // Onchain triggers fire off enriched wallet activity, which needs a saved
  // contract; surface the contract nudge only when such a trigger is in the flow.
  const hasOnchainTrigger = useMemo(
    () =>
      nodes.some((n) => {
        if (n.type !== "trigger") return false;
        const triggerType = isJsonObject(n.data)
          ? asString(n.data.triggerType)
          : "";
        return (
          triggerType.length > 0 &&
          !NON_ONCHAIN_TRIGGER_TYPES.has(triggerType) &&
          // The DeFi trigger reads a pool address of its own, not a saved
          // project contract, so the "save a contract" nudge does not apply.
          triggerType !== "defi_health_factor"
        );
      }),
    [nodes]
  );
  const hasSavedContracts =
    (projectSettingsQuery.data?.contractAddresses?.length ?? 0) > 0;

  const builderNodeCount = nodes.length;

  // Exactly one trigger per automation — a flow has a single entry point.
  const triggerCount = useMemo(
    () =>
      nodes.filter((n) =>
        nodeIsTrigger(
          n.type,
          isJsonObject(n.data) ? asString(n.data.triggerType) : ""
        )
      ).length,
    [nodes]
  );
  // A send-email step needs a verified sending domain, or it can't deliver to
  // Gmail/Outlook (they reject/spam unauthenticated senders). The runtime falls
  // back to the platform sender, but that's poor deliverability — so block
  // go-live until the org has verified at least one domain.
  const hasEmailNode = useMemo(
    () =>
      nodes.some((n) => {
        const t = isJsonObject(n.data) ? asString(n.data.nodeType) : "";
        return (
          n.type === "email" ||
          t === "send_email" ||
          (isJsonObject(n.data) && asString(n.data.actionType) === "send_email")
        );
      }),
    [nodes]
  );
  const emailNeedsSender =
    hasEmailNode &&
    !senderIdentitiesQuery.isLoading &&
    verifiedSenderIdentities.length === 0;

  // Client-side pre-flight, recomputed on every graph change: the same checks
  // the backend runs, but attached to the step that failed them and available
  // before anything is sent. The backend stays the authority — its verdict is
  // merged over this one below.
  const localIssues = useMemo(
    () =>
      buildLocalIssues({
        nodes: nodes.map((n) => {
          const label = (
            isJsonObject(n.data) ? asString(n.data.label) : ""
          ).trim();
          const triggerType = isJsonObject(n.data)
            ? asString(n.data.triggerType)
            : "";
          return {
            id: n.id,
            // The inspector reasons in canonical types, not renderer keys.
            type: ACTION_NODE_RENDERER[n.type ?? ""] ?? n.type,
            label: label !== "" ? label : nodePanelLabel(n.type),
            isTrigger: nodeIsTrigger(n.type, triggerType),
            triggerType: triggerType || n.type,
            // What the backend will actually see, and therefore what its
            // catalogs get checked against.
            wireType: canonicalNodeType(n),
            data: n.data,
          };
        }),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
        emailNeedsSender,
        supportedTypes: supportedNodeTypes,
      }),
    [edges, emailNeedsSender, nodes, supportedNodeTypes]
  );

  const serverVerdictStale =
    checkedGraphKey !== null && checkedGraphKey !== graphKey;

  // Live watch state, from the endpoint that knows about subscriptions the
  // reconciler dropped after a clean publish.
  const liveWatchIssues = useMemo(
    () => parseWatchState(watchesQuery.data),
    [watchesQuery.data]
  );
  // Watch issues describe the PUBLISHED automation, so they are not cleared by
  // a stale draft verdict - only by the next watch sync.
  const issues = useMemo(
    () =>
      mergeIssues(localIssues, [
        ...(serverVerdictStale ? [] : serverIssues),
        ...(liveWatchIssues.length > 0 ? liveWatchIssues : watchIssues),
      ]),
    [
      liveWatchIssues,
      localIssues,
      serverIssues,
      serverVerdictStale,
      watchIssues,
    ]
  );
  const errorIssues = useMemo(
    () => issues.filter((issue) => issue.severity === "error"),
    [issues]
  );
  const issuesByNodeId = useMemo(() => {
    const map = new Map<string, BuilderIssue["severity"]>();
    for (const issue of issues) {
      if (!issue.nodeId) continue;
      if (issue.severity === "error" || !map.has(issue.nodeId)) {
        map.set(issue.nodeId, issue.severity);
      }
    }
    return map;
  }, [issues]);

  // Paint the offending steps on the canvas itself: a red ring for anything
  // blocking, amber for a warning. Without this the issue list would name a
  // step the user still has to hunt for in a long flow.
  //
  // Each node also gets `needsSetup` / `setupHint` from the SAME inspection the
  // issues list uses, so its orange dot is on exactly when a setting is still
  // missing - the nodes' own guesses used to drift (an on-chain trigger seeded
  // with "Select Contract" read as configured and never showed a dot).
  const canvasNodes = useMemo(() => {
    const outgoing = new Map<string, number>();
    for (const edge of edges) {
      outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    }
    // Per-trigger subscription state, so a live automation says on the canvas
    // which triggers are actually receiving events and when each last fired.
    const watchByNode = new Map<string, AutomationWatchTrigger>();
    for (const trigger of watchesQuery.data?.triggers ?? []) {
      if (trigger?.nodeId) watchByNode.set(trigger.nodeId, trigger);
    }
    const subscriptionsKnown =
      watchesQuery.data?.subscriptions !== "unavailable";
    return displayNodes.map((n) => {
      const setup = inspectNode(n, outgoing.get(n.id) ?? 0);
      const severity = issuesByNodeId.get(n.id);
      const watch = watchByNode.get(n.id);
      return {
        ...n,
        data: {
          ...n.data,
          needsSetup: setup !== null,
          setupHint: setup?.message ?? "",
          // Undefined (not false) while the read is unavailable: "we don't
          // know" must never render as "dead".
          watchLive: subscriptionsKnown
            ? (watch?.live ?? undefined)
            : undefined,
          watchLastEventAt: watch?.lastEventAt ?? null,
        },
        className: severity
          ? cn(
              n.className,
              "rounded-lg ring-2 ring-offset-2 ring-offset-background",
              severity === "error" ? "ring-red-500/70" : "ring-amber-500/70"
            )
          : n.className,
      };
    });
  }, [
    displayNodes,
    edges,
    issuesByNodeId,
    watchesQuery.data?.subscriptions,
    watchesQuery.data?.triggers,
  ]);

  // A flow may go live only with a trigger, at least one step, NOTHING
  // half-configured, and a verified sender when it sends email — i.e. no
  // blocking issue left in the list above.
  const canActivate =
    builderNodeCount > 0 && triggerCount === 1 && errorIssues.length === 0;

  // While an existing automation's graph hydrates, show the layout-matching
  // skeleton instead of the empty chrome + spinner - same shape the route-level
  // loading.tsx renders, so there's no jump.
  if (!isNew && builderQuery.isLoading) {
    return <AutomationBuilderSkeleton />;
  }

  return (
    <motion.div
      variants={{
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
      }}
      initial="initial"
      animate="animate"
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-3"
    >
      <Confetti show={!showConfetti} />

      <SendConfirmDialog
        open={showActivateConfirm}
        onOpenChange={setShowActivateConfirm}
        icon={BoltIcon}
        title="Turn this automation on?"
        description="It will start enrolling contacts that match its trigger."
        details={[
          {
            label: "Automation",
            value: automationData.name.trim() || "Untitled automation",
          },
          {
            label: "Steps",
            value: `${builderNodeCount} ${
              builderNodeCount === 1 ? "step" : "steps"
            }`,
          },
        ]}
        note={
          // Same list the issues panel shows, so the dialog never says
          // "something's wrong" without naming it.
          errorIssues.length > 0
            ? `Fix ${errorIssues.length} ${errorIssues.length === 1 ? "issue" : "issues"} first - ${summarizeIssues(errorIssues, 3)}`
            : undefined
        }
        confirmLabel="Turn on"
        confirmingLabel="Turning on…"
        confirming={statusToggleMutation.isPending || publishMutation.isPending}
        confirmDisabled={!canActivate}
        onConfirm={activateAutomation}
      />

      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/automations"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <input
              type="text"
              value={automationData.name}
              onChange={(e) =>
                setAutomationData({ ...automationData, name: e.target.value })
              }
              onBlur={persistName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="Automation name"
              className="min-w-0 max-w-[45vw] rounded-md bg-transparent px-1 text-base font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none sm:max-w-none"
            />
            {/* Autosave runs silently in the background - the status badge
                stays fixed on setup/ready so it never flickers between states
                on every keystroke-triggered save. */}
            {/* One status badge, and it never says "0 issues": either steps
                are unfinished (click to jump to the first one) or the flow is
                ready. Autosave stays silent so this doesn't flicker on every
                keystroke. */}
            {errorIssues.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const first = errorIssues.find((issue) => issue.nodeId);
                  if (first?.nodeId) focusNode(first.nodeId);
                }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-amber-500"
                />
                {errorIssues.length}{" "}
                {errorIssues.length === 1 ? "step needs" : "steps need"} setup
              </button>
            ) : builderNodeCount > 0 ? (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon aria-hidden="true" className="h-3 w-3" />
                {checkedGraphKey === graphKey ? "Checked" : "Ready"}
              </span>
            ) : null}
            <span className="text-[13px] text-muted-foreground">
              {builderNodeCount} {builderNodeCount === 1 ? "node" : "nodes"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-[180px] grid-cols-2 border border-border bg-muted/60 sm:w-[220px]">
              <TabsTrigger value="builder" className="text-xs">
                Builder
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">
                Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden h-6 w-px bg-border sm:block" />

          {/* Reference header keeps only the live toggle: flipping a ready
              draft On publishes it; On/Off otherwise activates/pauses. */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {automationData.status === "active" ? "Active" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={automationData.status === "active"}
              aria-label={
                automationData.status === "active"
                  ? "Deactivate automation"
                  : "Activate automation"
              }
              disabled={
                isNew ||
                statusToggleMutation.isPending ||
                publishMutation.isPending
              }
              onClick={() => {
                // Pausing is safe and instant; going live asks first.
                if (automationData.status === "active") {
                  statusToggleMutation.mutate("paused");
                } else {
                  setShowActivateConfirm(true);
                }
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                automationData.status === "active"
                  ? "bg-emerald-500"
                  : "bg-muted"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  automationData.status === "active"
                    ? "left-[22px]"
                    : "left-0.5"
                }`}
              />
            </button>
          </div>
          {/* Ask the backend what's wrong WITHOUT having to save first - the
              answer lands in the issues panel, per step. */}
          {!isNew && builderNodeCount > 0 ? (
            <button
              type="button"
              onClick={handleCheckFlow}
              disabled={validateMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <ShieldCheckIcon
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5",
                  validateMutation.isPending ? "animate-pulse" : ""
                )}
              />
              {validateMutation.isPending ? "Checking…" : "Check flow"}
            </button>
          ) : null}
          <button
            className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-[0_10px_28px_-14px_rgba(86,112,255,0.9)] transition-colors hover:bg-primary/90 disabled:opacity-80"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ArrowPathIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin"
              />
            ) : (
              <ArrowDownTrayIcon aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            Save draft
          </button>
        </div>
      </header>

      {activeTab === "builder" && hasOnchainTrigger ? (
        <ContractAddressNudge
          context="automation"
          hasContracts={hasSavedContracts}
        />
      ) : null}

      {/* What's wrong and where — the builder's answer to a backend graph
          rejection, which otherwise arrives as one opaque line. */}
      {activeTab === "builder" && issues.length > 0 ? (
        <BuilderIssuesPanel
          issues={issues}
          labelForNode={labelForNode}
          onFocusNode={focusNode}
          onRecheck={handleCheckFlow}
          checking={validateMutation.isPending}
          stale={serverVerdictStale}
        />
      ) : null}

      {/* Main Content */}
      <div
        className={cn(
          "relative flex min-h-0 gap-4",
          activeTab === "builder"
            ? "h-[75vh] min-h-[560px] overflow-hidden"
            : ""
        )}
      >
        {activeTab === "builder" ? (
          <>
            {/* Sidebar */}
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 304, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="absolute inset-y-0 left-0 z-20 flex max-w-full flex-col overflow-hidden border-r border-border bg-card md:static md:z-auto md:rounded-xl md:border md:border-border md:bg-card"
                >
                  <div className="flex items-center gap-2 p-4 pb-3">
                    <label className="group relative block min-w-0 flex-1">
                      <MagnifyingGlassIcon
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      />
                      <input
                        type="text"
                        value={nodeSearch}
                        onChange={(e) => setNodeSearch(e.target.value)}
                        placeholder="Search triggers & actions…"
                        aria-label="Search nodes"
                        className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close node library"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                    >
                      <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="scrollbar-sleek flex-1 space-y-6 overflow-y-auto px-4 pb-5">
                    <NodeLibrarySection
                      title="On-chain triggers"
                      accent="orange"
                      nodes={filteredOnchainTriggers}
                    />
                    <NodeLibrarySection
                      title="Off-chain triggers"
                      accent="sky"
                      nodes={filteredOffchainTriggers}
                    />
                    <NodeLibrarySection
                      title="Actions"
                      accent="indigo"
                      nodes={filteredActionCatalog}
                    />
                    {filteredTriggerCatalog.length === 0 &&
                    filteredActionCatalog.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
                        No nodes match “{nodeSearch}”.
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Canvas Area - clean flat surface (reference has no graph pill
                or helper banner overlay). */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              >
                {sidebarOpen ? (
                  <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                )}
              </button>

              <EdgeInsertContext.Provider
                value={{
                  activeEdgeId: activeInsertEdge,
                  items: insertMenuItems,
                  open: (t) => setActiveInsertEdge(t.edgeId),
                  close: () => setActiveInsertEdge(null),
                  pick: (t, type, label) => insertNodeOnEdge(t, type, label),
                }}
              >
                <ReactFlow
                  nodes={canvasNodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  onPaneClick={handlePaneClick}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={{
                    type: "addable",
                    animated: false,
                    style: { stroke: EDGE_COLORS.default, strokeWidth: 1.5 },
                  }}
                  connectionLineStyle={{
                    stroke: EDGE_COLORS.default,
                    strokeWidth: 1.5,
                  }}
                  snapToGrid
                  snapGrid={[24, 24]}
                  // Without this, ANY pointer movement between press and release
                  // is treated as a drag and onNodeClick never fires — so only a
                  // pixel-perfect tap (which happened to land on the title) would
                  // open the editor. A few px of slop makes the whole card a
                  // reliable click target.
                  nodeDragThreshold={5}
                  fitView
                  fitViewOptions={{ maxZoom: 1, minZoom: 0.85, padding: 0.15 }}
                  minZoom={0.5}
                  maxZoom={1.25}
                >
                  <Background
                    color="rgba(120,130,160,0.14)"
                    gap={24}
                    size={1.2}
                  />
                  {/* Reference builder is a clean linear spine: no minimap, and
                      a minimal zoom control tucked bottom-left. */}
                  <Controls
                    position="bottom-left"
                    showInteractive={false}
                    className="overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-sm [&_button]:border-border [&_button]:bg-card [&_button]:text-foreground [&_button:hover]:bg-muted"
                  />
                  {!isNew ? (
                    <Panel position="top-center">
                      <div className="flex items-center gap-3 rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur">
                        <button
                          type="button"
                          onClick={() => setShowAnalytics((v) => !v)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            showAnalytics
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <ChartBarIcon className="h-3.5 w-3.5" />
                          Analytics
                        </button>
                        {showAnalytics && flowAnalyticsQuery.data ? (
                          <div className="flex items-center gap-3 pr-1.5 text-xs tabular-nums">
                            <span className="text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {flowAnalyticsQuery.data.overall.enrolled.toLocaleString()}
                              </span>{" "}
                              enrolled
                            </span>
                            <span
                              className="text-muted-foreground/50"
                              aria-hidden="true"
                            >
                              →
                            </span>
                            <span className="text-muted-foreground">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {flowAnalyticsQuery.data.overall.completed.toLocaleString()}
                              </span>{" "}
                              completed
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                              {flowAnalyticsQuery.data.overall.completionRate}%
                            </span>
                          </div>
                        ) : showAnalytics && flowAnalyticsQuery.isFetching ? (
                          <span className="pr-2 text-xs text-muted-foreground">
                            Loading…
                          </span>
                        ) : null}
                      </div>
                    </Panel>
                  ) : null}
                </ReactFlow>
              </EdgeInsertContext.Provider>

              {nodes.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                  <div className="scrollbar-sleek pointer-events-auto max-h-[calc(100%-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-border bg-card p-7 text-center shadow-[0_32px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <GlobeAltIcon aria-hidden="true" className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                      Start from a clean canvas
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Add your first trigger to begin this automation, or drag
                      triggers and actions from the left panel onto the canvas.
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowTriggerPicker(true)}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Add trigger
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Browse blocks
                      </button>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Or start from a recipe
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {AUTOMATION_RECIPES.map((recipe) => {
                        const Icon =
                          RECIPE_ICONS[recipe.iconKey] ?? SparklesIcon;
                        return (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => applyRecipe(recipe)}
                            className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                              <Icon aria-hidden="true" className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">
                                  {recipe.title}
                                </span>
                                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {recipe.category}
                                </span>
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">
                                {recipe.description}
                              </span>
                              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                                {recipe.steps.length} steps
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* "Add trigger" grid - choose the automation's entry trigger. */}
              {showTriggerPicker ? (
                <>
                  <div
                    className="absolute inset-0 z-30"
                    aria-hidden="true"
                    onClick={() => setShowTriggerPicker(false)}
                  />
                  <div
                    role="dialog"
                    aria-label="Add trigger"
                    className="absolute left-1/2 top-4 z-40 w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Add a trigger
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTriggerPicker(false)}
                        aria-label="Close trigger picker"
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="scrollbar-sleek max-h-[60vh] space-y-4 overflow-y-auto">
                      {(
                        [
                          {
                            title: "On-chain triggers",
                            items: triggerCatalog.filter((t) =>
                              ON_CHAIN_TRIGGER_TYPES.has(t.type)
                            ),
                          },
                          {
                            title: "Off-chain triggers",
                            items: triggerCatalog.filter(
                              (t) => !ON_CHAIN_TRIGGER_TYPES.has(t.type)
                            ),
                          },
                        ] as const
                      ).map((group) =>
                        group.items.length === 0 ? null : (
                          <div key={group.title}>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {group.title}
                              <span className="ml-1 text-muted-foreground/70">
                                · {group.items.length}
                              </span>
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {group.items.map((node) => (
                                <button
                                  key={node.type}
                                  type="button"
                                  onClick={() => {
                                    addNode(node.type, node.label);
                                    setShowTriggerPicker(false);
                                  }}
                                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                                >
                                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                                    {node.icon}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-semibold text-foreground">
                                      {node.label}
                                    </span>
                                    <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                                      {node.description}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {/* Node Selector for Placeholders */}
              {showNodeSelector.show && (
                <div
                  className="absolute z-20 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur"
                  style={{
                    // Offset from node, clamped so the menu stays on-canvas
                    // at narrow (phone) widths.
                    left: `min(${showNodeSelector.x + 250}px, calc(100% - 17rem))`,
                    top: showNodeSelector.y,
                  }}
                >
                  <p className="mb-2 px-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Add step
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {actionCatalog.map((node) => (
                      <button
                        key={node.type}
                        onClick={() => addNode(node.type, node.label)}
                        className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
                          {node.icon}
                        </span>
                        <span className="line-clamp-1">{node.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* The "+" add-step menu now renders inline on each edge
                  (AddableEdge), so there is no floating palette here. */}
            </div>

            {/* Properties Panel */}
            <AnimatePresence>
              {selectedNode &&
                !selectedNodeDetails?.type?.includes("placeholder") && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="scrollbar-sleek absolute inset-y-0 right-0 z-30 w-[min(344px,100%)] overflow-y-auto border-l border-border bg-card p-6 shadow-2xl md:static md:z-auto md:w-[344px] md:rounded-xl md:border md:border-border md:bg-card md:shadow-none"
                  >
                    <div className="mb-6 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Cog6ToothIcon
                            aria-hidden="true"
                            className="h-5 w-5"
                          />
                        </span>
                        <div>
                          <h3 className="font-semibold leading-tight tracking-tight text-foreground">
                            {nodePanelLabel(selectedNodeDetails?.type)}
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Step settings
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedNode(null)}
                        aria-label="Close properties panel"
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Properties Content based on node type */}
                    <div className="space-y-6">
                      {/* Common fields */}
                      <div className="space-y-2">
                        <label className={PROPERTY_LABEL_CLASS}>Label</label>
                        <input
                          type="text"
                          className={PROPERTY_INPUT_CLASS}
                          value={asString(selectedNodeData.label)}
                          onChange={(e) =>
                            updateSelectedNodeData({ label: e.target.value })
                          }
                        />
                      </div>

                      {/* Specific fields */}
                      {selectedIsTrigger && (
                        <>
                          {/* DeFi Health Factor: pool + threshold + chain, then
                              run the sweep on demand instead of waiting for the
                              30-minute schedule. */}
                          {selectedIsDefiHealthTrigger && (
                            <DefiHealthFactorFields
                              nodeData={selectedNodeData}
                              onChange={updateSelectedNodeData}
                              chainOptions={chainOptions}
                            />
                          )}
                          {/* Run the lending check on demand instead of waiting
                              for the 30-minute schedule. Saved automations only
                              (needs a persisted id + a configured pool/chain). */}
                          {selectedIsDefiHealthTrigger && !isNew && (
                            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground">
                                    Run now
                                  </div>
                                  <p className={PROPERTY_HINT_CLASS}>
                                    Check every position immediately, ignoring
                                    the 30-minute schedule.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runHealthFactorMutation.mutate()
                                  }
                                  disabled={runHealthFactorMutation.isPending}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <BoltIcon
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  {runHealthFactorMutation.isPending
                                    ? "Running…"
                                    : "Run now"}
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedTriggerIsOnchain && (
                            <OnchainTriggerFields
                              nodeData={selectedNodeData}
                              onChange={updateSelectedNodeData}
                              schemaType={selectedNodeSchemaType}
                              hasImpliedEvent={selectedTriggerHasImpliedEvent}
                              contractCatalog={contractCatalog}
                              chainOptions={chainOptions}
                              svm={svmByTriggerType.get(selectedNodeSchemaType)}
                              eventOptions={eventOptions}
                              eventDefinitionByValue={eventDefinitionByValue}
                            />
                          )}
                          {/* The DeFi trigger has no synthetic runtime event -
                              its "Run now" sweep above is how it is tested. */}
                          {!isNew && !selectedIsDefiHealthTrigger ? (
                            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-medium text-foreground">
                                  Test runtime trigger
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runtimeTriggerMutation.mutate()
                                  }
                                  disabled={runtimeTriggerMutation.isPending}
                                  className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                  {runtimeTriggerMutation.isPending
                                    ? "Sending..."
                                    : "Send test event"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}

                      {selectedIsEmail && (
                        <>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Template
                            </label>
                            <PropertySelect
                              placeholder="Select template"
                              value={asString(selectedNodeData.templateId)}
                              options={emailTemplateOptions.map((t) => ({
                                value: t.id,
                                label: t.name,
                              }))}
                              onChange={(next) => {
                                const template =
                                  emailTemplateOptions.find(
                                    (item) => item.id === next
                                  ) ?? null;
                                updateSelectedNodeData({
                                  templateId: next,
                                  templateName: template?.name ?? "",
                                  subject: template?.subject ?? "",
                                  previewText: template?.previewText ?? "",
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Subject line
                            </label>
                            <input
                              type="text"
                              className={PROPERTY_INPUT_CLASS}
                              value={asString(selectedNodeData.subject)}
                              onChange={(e) =>
                                updateSelectedNodeData({
                                  subject: e.target.value,
                                })
                              }
                              placeholder="What lands in the inbox subject line"
                            />
                            <p className={PROPERTY_HINT_CLASS}>
                              Required — Gmail and Outlook reject mail with no
                              subject. Choosing a template fills this in; edit
                              to override.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Preview text
                            </label>
                            <input
                              type="text"
                              className={PROPERTY_INPUT_CLASS}
                              value={asString(selectedNodeData.previewText)}
                              onChange={(e) =>
                                updateSelectedNodeData({
                                  previewText: e.target.value,
                                })
                              }
                              placeholder="Preheader shown after the subject"
                            />
                            <p className={PROPERTY_HINT_CLASS}>
                              Optional — the snippet inbox clients show next to
                              the subject line.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Send as
                            </label>
                            <PropertySelect
                              placeholder={
                                senderIdentitiesQuery.isLoading
                                  ? "Loading senders…"
                                  : "Organization default"
                              }
                              value={selectedNodeSenderEmail}
                              options={senderSelectOptions}
                              onChange={updateSenderEmail}
                            />
                            {!senderIdentitiesQuery.isLoading &&
                            verifiedSenderIdentities.length === 0 ? (
                              <p className={PROPERTY_HINT_CLASS}>
                                No verified sender identity yet - emails from
                                this node will use the platform fallback sender
                                (DoNotReply@…azurecomm.net). Verify a domain and
                                add a sender in Settings to send from your own
                                address.
                              </p>
                            ) : (
                              <p className={PROPERTY_HINT_CLASS}>
                                Verified sender used as the From address.
                                &quot;Organization default&quot; lets the
                                backend pick your org&apos;s default identity at
                                send time.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!asString(selectedNodeData.templateId)) {
                                  toast.error(
                                    "Pick a template first, then open the builder to edit it."
                                  );
                                  return;
                                }
                                if (isNew) {
                                  toast.error(
                                    "Save the automation first - the builder attaches the design to a saved draft."
                                  );
                                  return;
                                }
                                const qs = new URLSearchParams({
                                  campaign: automationId,
                                  returnTo: `/automations/${automationId}`,
                                  templateName: asString(
                                    selectedNodeData.templateName
                                  ),
                                  subject: asString(selectedNodeData.subject),
                                });
                                window.open(
                                  `/campaigns/editor?${qs.toString()}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                              <PencilSquareIcon
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              Open email builder
                            </button>
                            <p className={PROPERTY_HINT_CLASS}>
                              Edit the selected template&apos;s design in the
                              visual editor.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-card p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Preview
                            </p>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-foreground">
                                Subject:{" "}
                                {(selectedTemplate?.subject ??
                                  asString(selectedNodeData.subject)) ||
                                  "Select a template"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedTemplate?.previewText ??
                                  asString(selectedNodeData.previewText)) ||
                                  "Template preview text will appear here."}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedIsInapp && (
                        <>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Title
                            </label>
                            <input
                              type="text"
                              className={PROPERTY_INPUT_CLASS}
                              value={asString(selectedNodeData.title)}
                              onChange={(e) =>
                                updateSelectedNodeData({
                                  title: e.target.value,
                                })
                              }
                              placeholder="Notification title"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Message
                            </label>
                            <textarea
                              className={`${PROPERTY_INPUT_CLASS} min-h-[80px]`}
                              value={asString(selectedNodeData.body)}
                              onChange={(e) =>
                                updateSelectedNodeData({ body: e.target.value })
                              }
                              placeholder="What should the in-app push say?"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Link (optional)
                            </label>
                            <input
                              type="text"
                              className={PROPERTY_INPUT_CLASS}
                              value={asString(selectedNodeData.url)}
                              onChange={(e) =>
                                updateSelectedNodeData({ url: e.target.value })
                              }
                              placeholder="/app/rewards"
                            />
                          </div>
                        </>
                      )}

                      {selectedIsWebhook && (
                        <>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Endpoint URL
                            </label>
                            <input
                              type="text"
                              className={PROPERTY_INPUT_CLASS}
                              value={asString(selectedNodeData.url)}
                              onChange={(e) =>
                                updateSelectedNodeData({ url: e.target.value })
                              }
                              placeholder="https://api.example.com/hook"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Method
                            </label>
                            <PropertySelect
                              placeholder="POST"
                              value={
                                asString(selectedNodeData.method) || "POST"
                              }
                              options={WEBHOOK_METHODS}
                              onChange={(next) =>
                                updateSelectedNodeData({ method: next })
                              }
                            />
                          </div>
                        </>
                      )}

                      {selectedIsDispatch && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>
                            Campaign
                          </label>
                          <PropertySelect
                            value={asString(selectedNodeData.campaignId)}
                            options={ensureOption(
                              campaignOptions,
                              asString(selectedNodeData.campaignId)
                            )}
                            onChange={(next) =>
                              updateSelectedNodeData({ campaignId: next })
                            }
                            placeholder={
                              campaignsQuery.isLoading
                                ? "Loading campaigns…"
                                : "Select a campaign"
                            }
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            The campaign to dispatch when this step runs.
                          </p>
                        </div>
                      )}

                      {selectedIsTag && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>Tags</label>
                          {selectedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    aria-label={`Remove ${tag}`}
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      const tags = selectedTags.filter(
                                        (t) => t !== tag
                                      );
                                      updateSelectedNodeData({
                                        tags,
                                        tag: tags[0] ?? "",
                                      });
                                    }}
                                  >
                                    <XMarkIcon
                                      aria-hidden="true"
                                      className="size-3"
                                    />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <PropertySelect
                            value=""
                            options={tagOptions.filter(
                              (o) => !selectedTags.includes(o.value)
                            )}
                            onChange={(next) => {
                              if (!next || selectedTags.includes(next)) return;
                              const tags = [...selectedTags, next];
                              updateSelectedNodeData({
                                tags,
                                tag: tags[0] ?? "",
                              });
                            }}
                            placeholder={
                              tagsQuery.isLoading
                                ? "Loading tags…"
                                : "Add a tag"
                            }
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            Tags to apply to the contact. Pick from your
                            existing tags.
                          </p>
                        </div>
                      )}

                      {selectedIsList && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>List</label>
                          <PropertySelect
                            value={
                              asString(selectedNodeData.listId) ||
                              asString(selectedNodeData.listName)
                            }
                            options={ensureOption(
                              segmentOptions,
                              asString(selectedNodeData.listId) ||
                                asString(selectedNodeData.listName),
                              asString(selectedNodeData.listName) || undefined
                            )}
                            onChange={(next) => {
                              const picked = segmentOptions.find(
                                (o) => o.value === next
                              );
                              updateSelectedNodeData({
                                listId: next,
                                listName: picked?.label ?? next,
                              });
                            }}
                            placeholder={
                              segmentsQuery.isLoading
                                ? "Loading lists…"
                                : "Select a list"
                            }
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            The contact will be added to this list.
                          </p>
                        </div>
                      )}

                      {selectedIsWait && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>
                            Duration
                          </label>
                          <input
                            type="text"
                            className={PROPERTY_INPUT_CLASS}
                            value={asString(selectedNodeData.duration)}
                            onChange={(e) => {
                              // The runtime wants a positive `seconds`, not
                              // prose - without this the step reads "Wait 2
                              // days" on the canvas and publish still fails
                              // with INVALID_WAIT_CONFIG.
                              const duration = e.target.value;
                              updateSelectedNodeData({
                                duration,
                                seconds: parseDurationToSeconds(duration),
                              });
                            }}
                            placeholder="e.g. 2 days"
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            {parseDurationToSeconds(selectedNodeData.duration) >
                            0
                              ? `How long to wait before the next step. Saved as ${parseDurationToSeconds(
                                  selectedNodeData.duration
                                ).toLocaleString()} seconds.`
                              : "How long to wait before the next step - e.g. 30 minutes, 2 days, 1 week."}
                          </p>
                        </div>
                      )}

                      {selectedIsBranch && (
                        <div className="space-y-4 rounded-[20px] border border-border bg-card p-4">
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                              Branch logic
                            </div>
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                              Rules run top to bottom. The first match routes to
                              its target node; if none match, the else branch is
                              used.
                            </p>
                          </div>

                          {branchRules.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-[11px] text-muted-foreground">
                              No rules yet. Add one to route matching profiles.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {branchRules.map((rule, index) => {
                                const needsValue =
                                  !BRANCH_VALUELESS_OPERATORS.has(
                                    rule.operator
                                  );
                                return (
                                  <div
                                    key={rule.id}
                                    className="space-y-2 rounded-xl border border-border bg-background p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                        If #{index + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeBranchRule(rule.id)
                                        }
                                        aria-label="Remove rule"
                                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                      >
                                        <TrashIcon
                                          aria-hidden="true"
                                          className="h-3.5 w-3.5"
                                        />
                                      </button>
                                    </div>
                                    <input
                                      className={PROPERTY_INPUT_CLASS}
                                      placeholder="Field (e.g. tier, balance)"
                                      value={rule.field}
                                      onChange={(e) =>
                                        updateBranchRule(rule.id, {
                                          field: e.target.value,
                                        })
                                      }
                                    />
                                    <div
                                      className={
                                        needsValue
                                          ? "grid grid-cols-2 gap-2"
                                          : undefined
                                      }
                                    >
                                      <PropertySelect
                                        placeholder="Operator"
                                        value={rule.operator}
                                        options={BRANCH_OPERATORS}
                                        onChange={(next) =>
                                          updateBranchRule(rule.id, {
                                            operator: next,
                                          })
                                        }
                                      />
                                      {needsValue ? (
                                        <input
                                          className={PROPERTY_INPUT_CLASS}
                                          placeholder="Value"
                                          value={rule.value}
                                          onChange={(e) =>
                                            updateBranchRule(rule.id, {
                                              value: e.target.value,
                                            })
                                          }
                                        />
                                      ) : null}
                                    </div>
                                    <div className="space-y-1">
                                      <label className={PROPERTY_LABEL_CLASS}>
                                        Route to
                                      </label>
                                      <PropertySelect
                                        placeholder={
                                          branchTargetOptions.length > 0
                                            ? "Select node"
                                            : "Add more nodes first"
                                        }
                                        value={rule.target}
                                        options={branchTargetOptions}
                                        onChange={(next) =>
                                          updateBranchRule(rule.id, {
                                            target: next,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={addBranchRule}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                          >
                            + Add rule
                          </button>

                          <div className="space-y-1 border-t border-border pt-3">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Else → default branch
                            </label>
                            <PropertySelect
                              placeholder={
                                branchTargetOptions.length > 0
                                  ? "Select fallback node"
                                  : "Add more nodes first"
                              }
                              value={branchDefaultTarget}
                              options={branchTargetOptions}
                              onChange={(next) =>
                                updateSelectedNodeData({ defaultTarget: next })
                              }
                            />
                            <p className={PROPERTY_HINT_CLASS}>
                              Where profiles go when no rule matches.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* The schema-driven CONFIGURATION section is the low-level
                          field dump (event source, standard, topic0, filters…).
                          Hidden for on-chain triggers (covered by the simplified
                          token+event+chain panel above) AND for action nodes,
                          which now have their own dedicated panels. It stays only
                          for off-chain triggers (segment/form), where it is still
                          the only place their config (segmentId, formId, …) is
                          edited - remove it there only once those get a real
                          panel. */}
                      {/* A/B split variants — a friendly editor instead of the raw
                          JSON the schema would render. Weights are relative. */}
                      {selectedNodeSchemaType === "split"
                        ? (() => {
                            const variants = Array.isArray(
                              selectedNodeData.variants
                            )
                              ? (selectedNodeData.variants as unknown[]).map(
                                  (v) => {
                                    const r = isJsonObject(v) ? v : {};
                                    return {
                                      label: String(r.label ?? ""),
                                      weight: Number(r.weight) || 0,
                                    };
                                  }
                                )
                              : [];
                            const write = (
                              next: { label: string; weight: number }[]
                            ) => updateSelectedNodeData({ variants: next });
                            const total =
                              variants.reduce((s, v) => s + v.weight, 0) || 0;
                            return (
                              <div className="space-y-3 rounded-[20px] border border-border bg-card p-4">
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                                  Variants
                                </div>
                                {variants.map((v, i) => (
                                  <div
                                    // Variants have no stable id and the inputs
                                    // are fully controlled (value from state), so
                                    // an index key is safe here - there is no
                                    // per-row local state to mismatch on edit.
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={i}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      className={PROPERTY_INPUT_CLASS}
                                      placeholder="Label (e.g. A, holdout)"
                                      value={v.label}
                                      onChange={(e) => {
                                        const n = [...variants];
                                        n[i] = { ...v, label: e.target.value };
                                        write(n);
                                      }}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      className={`${PROPERTY_INPUT_CLASS} w-20 text-center`}
                                      value={v.weight}
                                      onChange={(e) => {
                                        const n = [...variants];
                                        n[i] = {
                                          ...v,
                                          weight: Math.max(
                                            0,
                                            Number(e.target.value) || 0
                                          ),
                                        };
                                        write(n);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      aria-label={`Remove variant ${v.label || i + 1}`}
                                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                      onClick={() =>
                                        write(
                                          variants.filter((_, j) => j !== i)
                                        )
                                      }
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="w-full rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                  onClick={() =>
                                    write([
                                      ...variants,
                                      { label: "", weight: 50 },
                                    ])
                                  }
                                >
                                  + Add variant
                                </button>
                                <p className={PROPERTY_HINT_CLASS}>
                                  Weights are relative
                                  {total > 0 ? ` (total ${total})` : ""}. Label
                                  a variant{" "}
                                  <span className="mono">holdout</span> and
                                  leave its branch empty for a control group.
                                  Assignment is deterministic per contact.
                                </p>
                              </div>
                            );
                          })()
                        : null}

                      {!selectedTriggerIsOnchain &&
                      !selectedIsDefiHealthTrigger &&
                      selectedNodeSchemaType !== "split" &&
                      !selectedHasDedicatedPanel &&
                      (selectedNodeSchemaQuery.isFetching ||
                        selectedNodeSchemaFields.length > 0 ||
                        selectedNodeSchemaQuery.error instanceof Error) ? (
                        <div className="space-y-4 rounded-[20px] border border-border bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                              Trigger setup
                            </div>
                            {selectedNodeSchemaQuery.isFetching ? (
                              <ArrowPathIcon
                                aria-hidden="true"
                                className="h-4 w-4 animate-spin text-sky-300"
                              />
                            ) : null}
                          </div>

                          {selectedNodeSchemaQuery.error instanceof Error ? (
                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                              Failed to load backend schema:{" "}
                              {selectedNodeSchemaQuery.error.message}
                            </div>
                          ) : null}

                          {(() => {
                            const renderSchemaField = (
                              field: BuilderSchemaField
                            ) => {
                              const rawValue = selectedNodeData[field.key];
                              const jsonDraftKey = `${selectedNode ?? "node"}:${field.key}`;

                              if (
                                field.options.length > 0 ||
                                field.type === "select" ||
                                field.type === "enum"
                              ) {
                                return (
                                  <div key={field.key} className="space-y-2">
                                    <label className={PROPERTY_LABEL_CLASS}>
                                      {field.label}
                                      {field.required ? " *" : ""}
                                    </label>
                                    <PropertySelect
                                      placeholder={
                                        field.placeholder ??
                                        `Select ${field.label}`
                                      }
                                      value={pickText(rawValue)}
                                      options={field.options.map((option) => ({
                                        value: option.value,
                                        label: option.label,
                                      }))}
                                      onChange={(next) =>
                                        updateSchemaFieldValue(field, next)
                                      }
                                    />
                                    {field.description ? (
                                      <p className={PROPERTY_HINT_CLASS}>
                                        {field.description}
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              }

                              if (
                                field.type === "boolean" ||
                                field.type === "toggle"
                              ) {
                                return (
                                  <label
                                    key={field.key}
                                    className="flex items-start gap-3 rounded-2xl border border-border bg-background px-3 py-3"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-border bg-background text-primary"
                                      checked={asBoolean(rawValue)}
                                      onChange={(e) =>
                                        updateSchemaFieldValue(
                                          field,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span className="space-y-1">
                                      <span className="block text-sm font-medium text-foreground">
                                        {field.label}
                                      </span>
                                      {field.description ? (
                                        <span className="block text-[11px] leading-5 text-muted-foreground">
                                          {field.description}
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                );
                              }

                              if (
                                field.type === "object" ||
                                field.type === "array" ||
                                field.type === "json"
                              ) {
                                const jsonValue =
                                  jsonFieldDrafts[jsonDraftKey] ??
                                  (rawValue === undefined
                                    ? ""
                                    : JSON.stringify(rawValue, null, 2));
                                const isJsonInvalid =
                                  jsonValue.trim().length > 0 &&
                                  (() => {
                                    try {
                                      JSON.parse(jsonValue);
                                      return false;
                                    } catch {
                                      return true;
                                    }
                                  })();

                                return (
                                  <div key={field.key} className="space-y-2">
                                    <label className={PROPERTY_LABEL_CLASS}>
                                      {field.label}
                                      {field.required ? " *" : ""}
                                    </label>
                                    <textarea
                                      rows={5}
                                      className={PROPERTY_INPUT_CLASS}
                                      placeholder={
                                        field.placeholder ??
                                        `Enter valid JSON for ${field.label}`
                                      }
                                      value={jsonValue}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setJsonFieldDrafts((prev) => ({
                                          ...prev,
                                          [jsonDraftKey]: nextValue,
                                        }));
                                        if (nextValue.trim().length === 0) {
                                          updateSchemaFieldValue(
                                            field,
                                            field.type === "array" ? [] : {}
                                          );
                                          return;
                                        }
                                        try {
                                          updateSchemaFieldValue(
                                            field,
                                            JSON.parse(nextValue)
                                          );
                                        } catch {
                                          // Keep draft local until the JSON becomes valid.
                                        }
                                      }}
                                    />
                                    {field.description ? (
                                      <p className={PROPERTY_HINT_CLASS}>
                                        {field.description}
                                      </p>
                                    ) : null}
                                    {isJsonInvalid ? (
                                      <p className="text-[11px] text-amber-300">
                                        Enter valid JSON to apply this field.
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              }

                              const inputType =
                                field.type === "number" ||
                                field.type === "integer"
                                  ? "number"
                                  : field.type === "date"
                                    ? "date"
                                    : "text";
                              const isTextarea =
                                field.type === "textarea" ||
                                field.type === "multiline" ||
                                field.type === "long_text";

                              return (
                                <div key={field.key} className="space-y-2">
                                  <label className={PROPERTY_LABEL_CLASS}>
                                    {field.label}
                                    {field.required ? " *" : ""}
                                  </label>
                                  {isTextarea ? (
                                    <AutoGrowTextarea
                                      className={PROPERTY_INPUT_CLASS}
                                      placeholder={field.placeholder}
                                      value={String(rawValue ?? "")}
                                      onChange={(e) =>
                                        updateSchemaFieldValue(
                                          field,
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    <input
                                      type={inputType}
                                      className={PROPERTY_INPUT_CLASS}
                                      placeholder={field.placeholder}
                                      value={
                                        rawValue === undefined ||
                                        rawValue === null
                                          ? ""
                                          : String(rawValue)
                                      }
                                      onChange={(e) =>
                                        updateSchemaFieldValue(
                                          field,
                                          inputType === "number"
                                            ? e.target.value === ""
                                              ? ""
                                              : Number(e.target.value)
                                            : e.target.value
                                        )
                                      }
                                    />
                                  )}
                                  {field.description ? (
                                    <p className={PROPERTY_HINT_CLASS}>
                                      {field.description}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            };
                            return (
                              <>
                                {schemaEssentialFields.map(renderSchemaField)}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}

                      {/* Node performance */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Node performance
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              selectedNodeStatsView.hasData
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {selectedNodeStatsView.hasData
                              ? "Live"
                              : "No data yet"}
                          </span>
                        </div>

                        {selectedNodeStatsView.hasData ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              {
                                key: "conv",
                                icon: CheckCircleIcon,
                                tone: "text-sky-500 dark:text-sky-300",
                                label: "Conversions",
                                value:
                                  selectedNodeStatsView.conversions.toLocaleString(),
                              },
                              {
                                key: "active",
                                icon: UserGroupIcon,
                                tone: "text-sky-500 dark:text-sky-300",
                                label: "Active users",
                                value:
                                  selectedNodeStatsView.active.toLocaleString(),
                              },
                              {
                                key: "click",
                                icon: ViewfinderCircleIcon,
                                tone: "text-violet-500 dark:text-violet-300",
                                label: "Click rate",
                                value: `${selectedNodeStatsView.clickRate}%`,
                              },
                              {
                                key: "rev",
                                icon: CurrencyDollarIcon,
                                tone: "text-emerald-500 dark:text-emerald-300",
                                label: "Revenue",
                                value: `$${selectedNodeStatsView.revenue.toLocaleString()}`,
                              },
                            ].map((stat) => (
                              <div
                                key={stat.key}
                                className="rounded-xl border border-border bg-card p-3"
                              >
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <stat.icon
                                    aria-hidden="true"
                                    className={`h-3.5 w-3.5 ${stat.tone}`}
                                  />
                                  {stat.label}
                                </div>
                                <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                                  {stat.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3.5 py-4 text-[11px] leading-5 text-muted-foreground">
                            No data yet - see the full breakdown in the{" "}
                            <span className="font-medium text-foreground">
                              Stats
                            </span>{" "}
                            tab once published.
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 border-t border-border pt-6">
                        <button
                          type="button"
                          onClick={() => setSelectedNode(null)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <CheckCircleIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNodes((nds) =>
                              nds.filter((n) => n.id !== selectedNode)
                            );
                            setEdges((eds) =>
                              eds.filter(
                                (edge) =>
                                  edge.source !== selectedNode &&
                                  edge.target !== selectedNode
                              )
                            );
                            setSelectedNode(null);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15"
                        >
                          <TrashIcon aria-hidden="true" className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
            {!selectedNode ? (
              <>
                {/* Desktop: static right column (hidden below md). */}
                <FlowSettingsPanel
                  value={flowSettings}
                  onChange={setFlowSettings}
                  triggerEventType={triggerEventType}
                />
                {/* Mobile: a trigger on the canvas that opens Flow settings as a
                    bottom sheet, since the static column is hidden on phones. */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="absolute top-4 right-4 z-10 flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground md:hidden"
                    >
                      <Cog6ToothIcon aria-hidden="true" className="h-4 w-4" />
                      Flow settings
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="max-h-[85vh] overflow-y-auto"
                  >
                    <SheetHeader>
                      <SheetTitle>Flow settings</SheetTitle>
                    </SheetHeader>
                    <FlowSettingsPanel
                      value={flowSettings}
                      onChange={setFlowSettings}
                      triggerEventType={triggerEventType}
                      className="w-full px-4 pb-6"
                    />
                  </SheetContent>
                </Sheet>
              </>
            ) : null}
          </>
        ) : (
          /* Stats Tab Content */
          <div className="scrollbar-sleek flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
            <div className="mx-auto max-w-[1600px] space-y-6">
              {/* Overview Cards - reference layout: label over a big number,
                  no icon badge or delta chip. */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {[
                  {
                    label: "Entries · 30d",
                    value: statsEntries.toLocaleString(),
                  },
                  {
                    label: "Completed",
                    value: `${statsCompletionRate}%`,
                  },
                  {
                    label: "Conversion rate",
                    value: `${statsConvRate}%`,
                  },
                  {
                    label: "On-chain conversions",
                    value: statsConversions.toLocaleString(),
                  },
                  {
                    label: "Last triggered",
                    value: automationData.lastTriggered
                      ? formatRelativeTime(automationData.lastTriggered)
                      : "-",
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    variants={{
                      initial: { opacity: 0, y: 20 },
                      animate: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.4, ease: "easeOut" },
                      },
                    }}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Performance over time</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-[3px] bg-primary"
                        />
                        Completed the flow
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-[3px] bg-primary/25"
                        />
                        Entered
                      </span>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colCompleted"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--primary)"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colEntered"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.12}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--primary)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          {/*
                            Recharts' default tooltip is a white box with a
                            light-grey label — unreadable in dark mode, where
                            the date all but disappeared. Every other element
                            in this chart already draws from theme tokens;
                            this was the one left on library defaults, so it
                            was the one that did not follow the theme.
                          */}
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: "0.5rem",
                              color: "var(--popover-foreground)",
                            }}
                            labelStyle={{ color: "var(--foreground)" }}
                            itemStyle={{ color: "var(--popover-foreground)" }}
                            cursor={{ stroke: "var(--border)" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="entries"
                            name="Entered"
                            stroke="var(--primary)"
                            strokeOpacity={0.35}
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colEntered)"
                          />
                          <Area
                            type="monotone"
                            dataKey="conversions"
                            name="Completed the flow"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colCompleted)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            No performance data yet
                          </div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            Entries and revenue trends appear here once the
                            automation starts processing users.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-semibold">Recent entries</h3>
                  {recentRows.length > 0 ? (
                    <div className="space-y-3">
                      {recentRows.slice(0, 6).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {entry.wallet}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {entry.path}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                entry.outcome === "converted" ||
                                entry.outcome === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : entry.outcome === "exited"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary/10 text-primary"
                              }`}
                            >
                              {entry.outcome}
                            </span>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatRelativeTime(entry.timestamp) || "-"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          No entries yet
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Wallets appear here as they enter the flow.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages in this flow */}
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h3 className="font-semibold">Messages in this flow</h3>
                  <span className="text-xs text-muted-foreground">
                    In the order they send
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="px-6 py-3">Message</th>
                        <th className="px-6 py-3 text-right">Sent</th>
                        <th className="px-6 py-3 text-right">
                          Opened / Viewed
                        </th>
                        <th className="px-6 py-3 text-right">Clicked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messageRows.length > 0 ? (
                        messageRows.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {m.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {m.channel}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                              -
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                              -
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                              -
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-16 text-center text-sm text-muted-foreground"
                          >
                            Add a Send Email or Send In-App step to see it here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border/50 px-6 py-3 text-xs leading-relaxed text-muted-foreground">
                  Each message is measured against the wallets that reached it.
                  Per-message delivery counts populate once the backend exposes
                  them.
                </div>
              </div>
              {isStatsLoading &&
              chartData.length === 0 &&
              pathRows.length === 0 &&
              recentRows.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
                  Loading automation stats...
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function CreateAutomation() {
  return (
    <ReactFlowProvider>
      <CreateAutomationContent />
    </ReactFlowProvider>
  );
}
