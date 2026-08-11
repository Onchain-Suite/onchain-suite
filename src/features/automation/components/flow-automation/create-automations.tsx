"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
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

import { formatDateTime, formatRelativeTime } from "@/lib/date";
import { isJsonObject } from "@/lib/utils";

import "reactflow/dist/style.css";
import {
  automationService,
  type OnchainCatalogDefinition,
} from "../../automation.service";
import { Confetti } from "../confetti";
import {
  AddableEdge,
  EdgeInsertContext,
  type EdgeInsertTarget,
} from "./addable-edge";
import { AutoGrowTextarea } from "./auto-grow-textarea";
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
import { PropertySelect, type PropertySelectOption } from "./property-select";
import {
  actionNodes,
  emailTemplates as fallbackEmailTemplates,
  eventTypes,
  mockContracts,
  triggerNodes,
} from "@/features/automation/data";
import {
  autoLayoutNodes,
  getAutomationData,
  getInitialEdges,
  getInitialNodes,
  isValidConnection,
} from "@/features/automation/utils";
import {
  buildTriggerContractPatch,
  resolveContractCatalog,
} from "@/features/automation/utils/contracts";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";

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

const nodeTypes = {
  // Renderer keys used by the drag-and-drop builder.
  trigger: TriggerNode,
  wait: WaitNode,
  branch: BranchNode,
  email: EmailNode,
  inapp: InappNode,
  tag: TagNode,
  list: AddToListNode,
  webhook: WebhookNode,
  dispatch: DispatchCampaignNode,
  placeholder: PlaceholderNode,
  // Canonical backend types - so a graph saved/applied with these (e.g. built-in
  // templates use `node.type: "send_inapp"`, "holder_acquired", …) still renders
  // the correct styled node when loaded onto the canvas.
  send_email: EmailNode,
  send_inapp: InappNode,
  add_tag: TagNode,
  add_to_list: AddToListNode,
  dispatch_campaign: DispatchCampaignNode,
  onchain_event: TriggerNode,
  holder_acquired: TriggerNode,
  governance_activity: TriggerNode,
  swap_completed: TriggerNode,
  liquidity_added: TriggerNode,
  borrow_opened: TriggerNode,
  exchange_outflow: TriggerNode,
  capital_withdrawn: TriggerNode,
  liquidation_detected: TriggerNode,
  approval_intent: TriggerNode,
  segment_entered: TriggerNode,
  segment_exited: TriggerNode,
  list_joined: TriggerNode,
  form_submitted: TriggerNode,
  email_opened: TriggerNode,
  email_clicked: TriggerNode,
  tag_added: TriggerNode,
  campaign_completed: TriggerNode,
  health_threshold: TriggerNode,
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
 * True when a node still needs configuration - mirrors the per-node orange
 * "Needs setup" dot logic so the header badge can count unconfigured steps
 * locally, before (or without) the backend validation pass.
 */
function nodeNeedsSetup(type: string | undefined, rawData: unknown): boolean {
  const t = type ?? "";
  const data = isJsonObject(rawData) ? rawData : {};
  const str = (k: string): string =>
    typeof data[k] === "string" ? (data[k] as string) : "";
  if (TRIGGER_NODE_TYPES.has(t) || TRIGGER_NODE_TYPES.has(str("triggerType"))) {
    return !str("contract") && !str("contractAddress") && !str("event");
  }
  const renderer = ACTION_NODE_RENDERER[t] ?? t;
  switch (renderer) {
    case "email":
      return !str("templateId") && !str("templateName") && !str("template");
    case "inapp":
      return !str("title") && !str("body");
    case "tag":
      return !(Array.isArray(data.tags) && data.tags.length > 0) && !str("tag");
    case "list":
      return !str("listName") && !str("listId");
    case "webhook":
      return !str("url");
    case "dispatch":
      return !str("campaignId");
    default:
      return false;
  }
}

/**
 * Trigger types that are NOT on-chain (so they don't get a contract/event
 * placeholder). Everything else in the trigger catalog - `onchain_event` and the
 * business presets like `holder_acquired` - is treated as on-chain.
 */
const NON_ONCHAIN_TRIGGER_TYPES = new Set([
  "segment_entered",
  "segment_exited",
  "list_joined",
  "form_submitted",
  "email_opened",
  "email_clicked",
  "tag_added",
  "campaign_completed",
  "health_threshold",
]);

/**
 * Trigger `type`s that fire from on-chain activity - used to split the left
 * palette into "On-chain triggers" vs "Off-chain triggers" (everything else in
 * the trigger catalog, e.g. form_submitted / joined_list / segment_entered).
 */
const ON_CHAIN_TRIGGER_TYPES = new Set([
  "onchain",
  "trigger",
  "onchain_event",
  "holder_acquired",
  "governance_activity",
  "swap_completed",
  "liquidity_added",
  "borrow_opened",
  "exchange_outflow",
  "capital_withdrawn",
  "liquidation_detected",
  "approval_intent",
]);

/**
 * All canonical trigger `type`s (used to recognize a trigger node whether it was
 * created via drag - renderer key "trigger" - or loaded from a template, where
 * `node.type` is the canonical type like "holder_acquired").
 */
const TRIGGER_NODE_TYPES = new Set([
  "trigger",
  "onchain_event",
  "holder_acquired",
  "governance_activity",
  "swap_completed",
  "liquidity_added",
  "borrow_opened",
  "exchange_outflow",
  "capital_withdrawn",
  "liquidation_detected",
  "approval_intent",
  "segment_entered",
  "segment_exited",
  "list_joined",
  "form_submitted",
  "email_opened",
  "email_clicked",
  "tag_added",
  "campaign_completed",
  "health_threshold",
]);

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

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const asNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const pickArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isJsonObject(payload) && Array.isArray(payload.items))
    return payload.items;
  if (isJsonObject(payload) && Array.isArray(payload.data)) return payload.data;
  return [];
};

const pickText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const asBoolean = (value: unknown): boolean => value === true;

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

const EDGE_COLORS = {
  default: "rgba(120,130,160,0.5)",
  success: "#22c55e",
  danger: "#f97316",
} as const;

type BuilderSchemaFieldOption = {
  label: string;
  value: string;
};

type BuilderSchemaField = {
  key: string;
  label: string;
  description?: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options: BuilderSchemaFieldOption[];
};

const PROPERTY_LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

const PROPERTY_INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30";

const PROPERTY_HINT_CLASS = "text-[11px] leading-5 text-muted-foreground";

/** A single branch condition row: `field <operator> value → target node`. */
type BranchRule = {
  id: string;
  field: string;
  operator: string;
  value: string;
  target: string;
};

const BRANCH_OPERATORS: { value: string; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gte", label: "greater or equal" },
  { value: "lte", label: "less or equal" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "exists" },
];

/** Operators that don't need a comparison value. */
const BRANCH_VALUELESS_OPERATORS = new Set(["exists"]);

/** Normalize a persisted branch rule (tolerant of backend/legacy key names). */
const normalizeBranchRule = (raw: unknown, index: number): BranchRule => {
  const obj = isJsonObject(raw) ? raw : {};
  return {
    id:
      asString(obj.id) ||
      asString(obj.ruleId) ||
      `rule-${index}-${Math.random().toString(36).slice(2, 8)}`,
    field: asString(obj.field ?? obj.key ?? obj.attribute),
    operator: asString(obj.operator ?? obj.op ?? obj.comparator) || "eq",
    value:
      obj.value === undefined || obj.value === null ? "" : String(obj.value),
    target: asString(obj.target ?? obj.targetNodeId ?? obj.to ?? obj.node),
  };
};

const INTERNAL_SCHEMA_KEYS = new Set([
  "label",
  "schema",
  "stats",
  "nodeType",
  "triggerType",
  "actionType",
  "template",
  "templateId",
  "templateName",
  "contract",
  "contractAddress",
  "event",
]);

const normalizeSchemaFieldOptions = (
  value: unknown
): BuilderSchemaFieldOption[] =>
  pickArray(value)
    .map((option) => {
      if (typeof option === "string" || typeof option === "number") {
        return {
          label: String(option),
          value: String(option),
        };
      }
      if (!isJsonObject(option)) return null;
      const record = option as Record<string, unknown>;
      const resolvedValue = pickText(
        record.value,
        record.id,
        record.key,
        record.name
      );
      if (resolvedValue.length === 0) return null;
      return {
        value: resolvedValue,
        label:
          pickText(record.label, record.name, record.title, resolvedValue) ||
          resolvedValue,
      };
    })
    .filter((option): option is BuilderSchemaFieldOption => Boolean(option));

const normalizeSchemaFields = (schema: unknown): BuilderSchemaField[] => {
  if (!isJsonObject(schema)) return [];
  const record = schema as Record<string, unknown>;
  return pickArray(record.fields)
    .map<BuilderSchemaField | null>((field) => {
      if (!isJsonObject(field)) return null;
      const entry = field as Record<string, unknown>;
      const key = pickText(entry.key, entry.name, entry.id);
      if (key.length === 0 || INTERNAL_SCHEMA_KEYS.has(key)) return null;
      const rawType = pickText(
        entry.type,
        entry.inputType,
        entry.component,
        entry.kind,
        "text"
      ).toLowerCase();
      const description = pickText(
        entry.description,
        entry.helpText,
        entry.helperText
      );
      const placeholder = pickText(entry.placeholder);
      return {
        key,
        label: pickText(entry.label, entry.title, key) || key,
        description: description || undefined,
        type: rawType,
        required: asBoolean(entry.required),
        placeholder: placeholder || undefined,
        options: normalizeSchemaFieldOptions(entry.options ?? entry.enum),
      };
    })
    .filter((field): field is BuilderSchemaField => Boolean(field));
};

type NodeLibraryItem = {
  type: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
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
            draggable
            tabIndex={0}
            role="button"
            aria-label={`Drag ${node.label} onto the canvas`}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", node.type);
              e.dataTransfer.setData("application/label", node.label);
            }}
            className={`group flex cursor-grab items-center gap-3 rounded-xl border border-border/60 bg-background p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/30 ${a.hover}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${a.tile}`}
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

/** A labeled on/off switch used in the flow-settings panel. */
function FlowToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Right-panel flow-level settings, shown when no node is selected. Re-entry +
 * the three guardrails are org-wide sending caps; local state until the builder
 * settings contract lands.
 */
function FlowSettingsPanel() {
  const [reentry, setReentry] = useState("never");
  const [exitOnGoal, setExitOnGoal] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [frequencyCap, setFrequencyCap] = useState(true);
  return (
    <div className="hidden w-[344px] shrink-0 overflow-y-auto border-l border-border bg-card/60 p-6 md:block">
      <h3 className="font-semibold tracking-tight text-foreground">
        Flow settings
      </h3>
      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="flow-reentry" className="text-sm text-foreground">
            Re-entry
          </label>
          <select
            id="flow-reentry"
            value={reentry}
            onChange={(e) => setReentry(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="never">Never</option>
            <option value="daily">Once per day</option>
            <option value="weekly">Once per week</option>
            <option value="always">Always</option>
          </select>
        </div>
        <FlowToggle
          label="Exit on goal"
          checked={exitOnGoal}
          onChange={setExitOnGoal}
        />
        <FlowToggle
          label="Respect quiet hours"
          checked={quietHours}
          onChange={setQuietHours}
        />
        <FlowToggle
          label="Max 1 message / 10h"
          checked={frequencyCap}
          onChange={setFrequencyCap}
        />
      </div>
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        These caps apply across all automations, so a wallet in three flows
        still hears from you at most once per window. Select a node to configure
        it.
      </p>
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
  const [insertMenu, setInsertMenu] = useState<EdgeInsertTarget | null>(null);
  const [jsonFieldDrafts, setJsonFieldDrafts] = useState<
    Record<string, string>
  >({});
  const [nodeSearch, setNodeSearch] = useState("");
  const [showTriggerPicker, setShowTriggerPicker] = useState(false);

  // On phones the node library renders as an overlay covering the canvas, so
  // start it closed there (post-mount to stay SSR/hydration safe). Desktop
  // keeps the docked, open-by-default sidebar.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const { project } = useReactFlow();

  const hydrateBuilderState = useCallback(
    (payload: unknown) => {
      const record = isJsonObject(payload)
        ? (payload as Record<string, unknown>)
        : null;
      const nextNodes = pickArray(record?.nodes) as Node[];
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
      }
      setSelectedNode(null);
      setShowNodeSelector({ show: false, x: 0, y: 0 });
    },
    [setEdges, setNodes]
  );

  const resolvedTriggerNodes = useMemo(() => {
    return triggerNodes;
  }, []);

  const resolvedActionNodes = useMemo(() => {
    return actionNodes;
  }, []);

  const triggersQuery = useQuery({
    queryKey: ["automations", "builder", "triggers"],
    queryFn: async () => {
      try {
        const primary = await automationService.listTriggerTypes();
        const primaryItems = pickArray(primary);
        if (primaryItems.length > 0) return primaryItems;
        const alias = await automationService.listAvailableTriggers();
        return pickArray(alias);
      } catch {
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const actionsQuery = useQuery({
    queryKey: ["automations", "builder", "actions"],
    queryFn: async () => {
      try {
        const res = await automationService.listActionTypes();
        return pickArray(res);
      } catch {
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

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

  const triggerCatalog = useMemo(() => {
    const fetched = triggersQuery.data ?? [];
    if (fetched.length === 0) return resolvedTriggerNodes;
    const normalized = fetched
      .map((t) => {
        if (!isJsonObject(t)) return null;
        const rec = t as Record<string, unknown>;
        const type = asString(rec.type) || asString(rec.id);
        if (type.length === 0) return null;
        const label = asString(rec.label) || asString(rec.name) || type;
        const description = asString(rec.description);
        return {
          type,
          label,
          description,
          icon: <ViewfinderCircleIcon aria-hidden="true" className="h-4 w-4" />,
        };
      })
      .filter((x): x is (typeof triggerNodes)[number] => !!x);
    return normalized.length > 0 ? normalized : resolvedTriggerNodes;
  }, [resolvedTriggerNodes, triggersQuery.data]);

  const actionCatalog = useMemo(() => {
    const fetched = actionsQuery.data ?? [];
    if (fetched.length === 0) return resolvedActionNodes;
    const normalized = fetched
      .map((a) => {
        if (!isJsonObject(a)) return null;
        const rec = a as Record<string, unknown>;
        const type = asString(rec.type) || asString(rec.id);
        if (type.length === 0) return null;
        const label = asString(rec.label) || asString(rec.name) || type;
        const description = asString(rec.description);
        return {
          type,
          label,
          description,
          icon: <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />,
        };
      })
      .filter((x): x is (typeof actionNodes)[number] => !!x);
    return normalized.length > 0 ? normalized : resolvedActionNodes;
  }, [actionsQuery.data, resolvedActionNodes]);

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
  const filteredOnchainTriggers = useMemo(
    () =>
      filteredTriggerCatalog.filter((t) => ON_CHAIN_TRIGGER_TYPES.has(t.type)),
    [filteredTriggerCatalog]
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

  // Builder-scoped contract list from the backend (GoldRush-supported project
  // contracts); project settings then the static list are fallbacks only.
  const builderContractsQuery = useQuery({
    queryKey: ["automations", "builder", "project-contracts"],
    queryFn: () => automationService.getBuilderProjectContracts(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // GoldRush event catalog - backend-recommended source of truth for the
  // event picker (normalized EVM + Solana definitions).
  const onchainCatalogQuery = useQuery({
    queryKey: ["automations", "builder", "onchain-catalog"],
    queryFn: () => automationService.getOnchainCatalog(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  });

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

  // Selecting a catalog event persists its GoldRush identifiers on the node,
  // per the backend recommendation (goldrushEventId, eventStandard, topic0,
  // programId, instructionName drive efficient runtime matching).
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

  const lastEditedQuery = useQuery({
    queryKey: ["automations", automationId, "last-edited"],
    queryFn: () => automationService.getLastEdited(automationId),
    enabled:
      !isNew && typeof automationId === "string" && automationId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const publishMutation = useMutation({
    mutationFn: async () => automationService.publishAutomation(automationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      await automationDetailQuery.refetch();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to publish";
      toast.error(message);
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
      return automationService.validateBuilder(automationId, {
        nodes,
        edges,
      });
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

    if (nodeType.includes("segment") || label.includes("segment")) {
      return "segment_entered" as const;
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
      const parts = [
        matched > 0 ? `${matched.toLocaleString()} matching automations` : null,
        entries > 0 ? `${entries.toLocaleString()} entries queued` : null,
      ].filter((part): part is string => Boolean(part));
      toast.success(
        parts.length > 0
          ? `Test trigger sent: ${parts.join(" · ")}`
          : "Test trigger sent"
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
          builder: { nodes, edges },
        });
        const createdId = created.automationId;
        if (createdId) {
          await automationService.saveBuilder(createdId, { nodes, edges });
        }
        return { createdId };
      }

      await automationService.updateAutomation(automationId, {
        name,
        description: automationData.description ?? "",
      });
      const builder = await automationService.saveBuilder(automationId, {
        nodes,
        edges,
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
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    },
  });

  const draftSaveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return;
      await automationService.saveBuilderDraft(automationId, { nodes, edges });
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validation = await validateMutation.mutateAsync();
      const errors = pickArray(
        isJsonObject(validation) ? validation.errors : undefined
      );
      if (errors.length > 0) {
        setIsSaving(false);
        toast.error("Builder has validation errors");
        return;
      }
      saveMutation.mutate();
    } catch (err) {
      setIsSaving(false);
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    }
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
      const isOnchainTrigger =
        category === "trigger" && !NON_ONCHAIN_TRIGGER_TYPES.has(type);
      const data: Record<string, unknown> = {
        label,
        nodeType: type,
        ...(category === "trigger"
          ? { triggerType: type }
          : { actionType: type }),
        ...(isOnchainTrigger
          ? { contract: "Select Contract", event: "Select Event" }
          : {}),
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

      const { rendererType, data } = resolveNodeShape(type, label);
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: rendererType,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes, resolveNodeShape]
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
  };

  const addNode = (type: string, label: string) => {
    const { rendererType, data } = resolveNodeShape(type, label);
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
    setInsertMenu(null);
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
    onSuccess: (_res, nextStatus) => {
      setAutomationData((prev) => ({ ...prev, status: nextStatus }));
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const builderNodeCount = nodes.length;
  const builderErrorCount = pickArray(
    isJsonObject(validateMutation.data)
      ? validateMutation.data.errors
      : undefined
  ).length;
  // Count unconfigured steps locally (mirrors the orange node dots) so the
  // header badge is meaningful before the backend validation pass runs.
  const needsSetupCount = useMemo(
    () => nodes.filter((n) => nodeNeedsSetup(n.type, n.data)).length,
    [nodes]
  );
  const stepsNeedingSetup = Math.max(builderErrorCount, needsSetupCount);

  return (
    <motion.div
      variants={{
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
      }}
      initial="initial"
      animate="animate"
      className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]"
    >
      <Confetti show={!showConfetti} />

      {/* Header */}
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-gradient-to-b from-primary/5 to-transparent px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/automations"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={automationData.name}
                onChange={(e) =>
                  setAutomationData({ ...automationData, name: e.target.value })
                }
                className="min-w-0 max-w-[60vw] rounded-md bg-transparent px-1 text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none sm:max-w-none"
              />
              {draftSaveMutation.isPending ? (
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Autosaving
                </span>
              ) : stepsNeedingSetup > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                  {stepsNeedingSetup}{" "}
                  {stepsNeedingSetup === 1 ? "step needs" : "steps need"} setup
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon aria-hidden="true" className="h-3 w-3" />
                  Ready
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {(() => {
                const raw =
                  typeof (
                    lastEditedQuery.data as { lastEditedAt?: unknown } | null
                  )?.lastEditedAt === "string"
                    ? (lastEditedQuery.data as { lastEditedAt: string })
                        .lastEditedAt
                    : automationData.createdAt;
                const relative = formatRelativeTime(raw);
                return (
                  <span title={formatDateTime(raw)}>
                    Last edited {relative || "-"}
                  </span>
                );
              })()}
              <span className="text-border">·</span>
              <span>{builderNodeCount} nodes</span>
              <span className="text-border">·</span>
              <span>
                {builderErrorCount}{" "}
                {builderErrorCount === 1 ? "issue" : "issues"}
              </span>
            </div>
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
                if (automationData.status === "active") {
                  statusToggleMutation.mutate("paused");
                } else if (automationData.status === "draft") {
                  publishMutation.mutate(undefined, {
                    onSuccess: () => statusToggleMutation.mutate("active"),
                  });
                } else {
                  statusToggleMutation.mutate("active");
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

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {activeTab === "builder" ? (
          <>
            {/* Sidebar */}
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 304, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="absolute inset-y-0 left-0 z-20 flex max-w-full flex-col border-r border-border bg-gradient-to-b from-card to-card md:static md:z-auto md:bg-gradient-to-b md:from-card md:to-card/60"
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
            <div className="relative flex-1 overflow-hidden bg-background">
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

              <EdgeInsertContext.Provider value={setInsertMenu}>
                <ReactFlow
                  nodes={nodes}
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
                  fitView
                  fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
                  minZoom={0.4}
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
                </ReactFlow>
              </EdgeInsertContext.Provider>

              {!isNew && builderQuery.isLoading ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 px-6 backdrop-blur-[2px]">
                  <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-xl">
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <ArrowPathIcon
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin text-primary"
                      />
                      Loading automation builder...
                    </div>
                  </div>
                </div>
              ) : null}

              {nodes.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                  <div className="pointer-events-auto w-full max-w-lg rounded-[28px] border border-border bg-card p-7 text-center shadow-[0_32px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
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
                  </div>
                </div>
              ) : null}

              {/* "Add trigger" grid - choose the automation's entry trigger. */}
              {showTriggerPicker ? (
                <>
                  <div
                    className="absolute inset-0 z-30 bg-background/40 backdrop-blur-[1px]"
                    aria-hidden="true"
                    onClick={() => setShowTriggerPicker(false)}
                  />
                  <div
                    role="dialog"
                    aria-label="Add trigger"
                    className="absolute left-1/2 top-1/2 z-40 w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl"
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

              {/* Inline "+" insert palette, opened from an addable edge. */}
              {insertMenu ? (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    aria-hidden="true"
                    onClick={() => setInsertMenu(null)}
                  />
                  <div
                    className="fixed z-40 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl"
                    style={{
                      left: `min(${insertMenu.x}px, calc(100vw - 17rem))`,
                      top: `min(${insertMenu.y}px, calc(100vh - 20rem))`,
                    }}
                  >
                    <p className="mb-2 px-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Add step
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {actionCatalog.map((node) => (
                        <button
                          key={node.type}
                          type="button"
                          onClick={() =>
                            insertNodeOnEdge(insertMenu, node.type, node.label)
                          }
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
                </>
              ) : null}
            </div>

            {/* Properties Panel */}
            <AnimatePresence>
              {selectedNode &&
                !selectedNodeDetails?.type?.includes("placeholder") && (
                  <motion.div
                    initial={{ x: 320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 320, opacity: 0 }}
                    className="scrollbar-sleek absolute inset-y-0 right-0 z-30 w-[min(344px,100%)] overflow-y-auto border-l border-border bg-gradient-to-b from-card to-card p-6 shadow-2xl md:static md:z-auto md:w-[344px] md:bg-gradient-to-b md:from-card md:to-card/60 md:shadow-none"
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
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Contract
                            </label>
                            <PropertySelect
                              placeholder="Select contract"
                              value={
                                asString(selectedNodeData.contractAddress) ||
                                asString(selectedNodeData.contract)
                              }
                              options={contractCatalog.map((c) => ({
                                value: c.address,
                                label: c.name,
                                hint: `(${c.chain})`,
                              }))}
                              onChange={(next) => {
                                updateSelectedNodeData(
                                  buildTriggerContractPatch(
                                    next,
                                    contractCatalog
                                  )
                                );
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Event
                            </label>
                            <PropertySelect
                              placeholder="Select event"
                              value={asString(selectedNodeData.event)}
                              options={eventOptions}
                              onChange={(next) => {
                                const def = eventDefinitionByValue.get(next);
                                updateSelectedNodeData({
                                  event: next,
                                  ...(def
                                    ? {
                                        goldrushEventId: def.id,
                                        eventStandard: def.standard,
                                        chainFamily: def.chainFamily,
                                        topic0: def.topic0,
                                        programId: def.programIds?.[0],
                                        instructionName:
                                          def.instructionNames?.[0],
                                      }
                                    : {}),
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={PROPERTY_LABEL_CLASS}>
                              Chain
                            </label>
                            <PropertySelect
                              placeholder="All chains"
                              value={asString(selectedNodeData.chain)}
                              options={CHAIN_OPTIONS}
                              onChange={(next) =>
                                updateSelectedNodeData({ chain: next })
                              }
                            />
                            <p className={PROPERTY_HINT_CLASS}>
                              Restrict this trigger to one network, or leave on
                              all chains.
                            </p>
                          </div>
                          {!isNew ? (
                            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-medium text-foreground">
                                    Test runtime trigger
                                  </div>
                                  <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                    Sends a preview event through the backend
                                    runtime ingestion endpoint for this trigger
                                    type.
                                  </div>
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
                          {selectedTemplate?.category ||
                          selectedTemplate?.source ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedTemplate?.category ? (
                                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                  {selectedTemplate.category}
                                </span>
                              ) : null}
                              {"source" in (selectedTemplate ?? {}) &&
                              typeof selectedTemplate?.source === "string" &&
                              selectedTemplate.source.length > 0 ? (
                                <span className="rounded-full border border-sky-500/20 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                                  {selectedTemplate.source}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
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
                            Campaign ID
                          </label>
                          <input
                            type="text"
                            className={PROPERTY_INPUT_CLASS}
                            value={asString(selectedNodeData.campaignId)}
                            onChange={(e) =>
                              updateSelectedNodeData({
                                campaignId: e.target.value,
                              })
                            }
                            placeholder="cmp_…"
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            The campaign to dispatch when this step runs.
                          </p>
                        </div>
                      )}

                      {selectedIsTag && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>Tags</label>
                          <input
                            type="text"
                            className={PROPERTY_INPUT_CLASS}
                            value={
                              Array.isArray(selectedNodeData.tags)
                                ? (selectedNodeData.tags as string[]).join(", ")
                                : asString(selectedNodeData.tag)
                            }
                            onChange={(e) => {
                              const tags = e.target.value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean);
                              updateSelectedNodeData({
                                tags,
                                tag: tags[0] ?? "",
                              });
                            }}
                            placeholder="vip, whale"
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            Comma-separated tags to apply to the contact.
                          </p>
                        </div>
                      )}

                      {selectedIsList && (
                        <div className="space-y-2">
                          <label className={PROPERTY_LABEL_CLASS}>
                            List name
                          </label>
                          <input
                            type="text"
                            className={PROPERTY_INPUT_CLASS}
                            value={asString(selectedNodeData.listName)}
                            onChange={(e) =>
                              updateSelectedNodeData({
                                listName: e.target.value,
                              })
                            }
                            placeholder="Newsletter"
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
                            onChange={(e) =>
                              updateSelectedNodeData({
                                duration: e.target.value,
                              })
                            }
                            placeholder="e.g. 2 days"
                          />
                          <p className={PROPERTY_HINT_CLASS}>
                            How long to wait before the next step.
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

                      {selectedNodeSchemaQuery.isFetching ||
                      selectedNodeSchemaFields.length > 0 ||
                      selectedNodeSchemaQuery.error instanceof Error ? (
                        <div className="space-y-4 rounded-[20px] border border-border bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                              Configuration
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

                          {selectedNodeSchemaFields.map((field) => {
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
                          })}
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
                            Conversions, active users, click rate, and revenue
                            for this step populate automatically once the
                            automation is published and starts processing
                            entries. Draft nodes show no data. See the full
                            breakdown any time in the{" "}
                            <span className="font-medium text-foreground">
                              Stats
                            </span>{" "}
                            tab.
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
            {!selectedNode ? <FlowSettingsPanel /> : null}
          </>
        ) : (
          /* Stats Tab Content */
          <div className="scrollbar-sleek flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Overview Cards - reference layout: label over a big number,
                  no icon badge or delta chip. */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  {
                    label: "Entries · 30d",
                    value: statsEntries.toLocaleString(),
                  },
                  {
                    label: "Completed",
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
                  <h3 className="mb-6 font-semibold">Performance Over Time</h3>
                  <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colorRevenue"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.1}
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
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
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
                  <h3 className="mb-6 font-semibold">Path Performance</h3>
                  {pathRows.length > 0 ? (
                    <div className="space-y-6">
                      {pathRows.map((path) => (
                        <div key={path.path} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-muted-foreground">
                              {path.path}
                            </span>
                            <span className="font-bold text-primary">
                              {path.rate}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${path.rate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{path.entries} entries</span>
                            <span>
                              ${(path.revenue / 1000).toFixed(1)}k rev
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          No path data yet
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Branch outcomes and conversion paths appear here after
                          the automation runs.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-6 py-4">
                  <h3 className="font-semibold">Recent Entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Path</th>
                        <th className="px-6 py-3 text-right">Revenue</th>
                        <th className="px-6 py-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.length > 0 ? (
                        recentRows.map((entry) => (
                          <tr
                            key={entry.id}
                            className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                            onClick={() => {
                              if (isNew) return;
                              automationService
                                .getStatsEntryDetails(automationId, entry.id)
                                .then((data) => {
                                  const text = JSON.stringify(data, null, 2);
                                  navigator.clipboard
                                    .writeText(text)
                                    .then(() => toast.success("Copied details"))
                                    .catch(() => toast.error("Failed to copy"));
                                })
                                .catch((_e) => String(_e));
                            }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                  <UserGroupIcon
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">{entry.wallet}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  entry.outcome === "converted"
                                    ? "bg-primary/10 text-primary"
                                    : entry.outcome === "exited"
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {entry.outcome}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {entry.path}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-primary">
                              {entry.revenue > 0 ? `$${entry.revenue}` : "-"}
                            </td>
                            <td
                              className="px-6 py-4 text-right text-muted-foreground"
                              title={formatDateTime(entry.timestamp)}
                            >
                              {formatDateTime(entry.timestamp) ||
                                entry.timestamp}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-16 text-center text-sm text-muted-foreground"
                          >
                            No entries yet. This table will populate after the
                            automation begins processing users.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
