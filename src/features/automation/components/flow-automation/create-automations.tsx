"use client";

import { BoltIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
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

import { formatRelativeTime } from "@/lib/date";
import { cn, isJsonObject } from "@/lib/utils";

import {
  automationService,
  type AutomationWatchTrigger,
  type OnchainCatalogDefinition,
} from "../../automation.service";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";
import { BuilderIssuesPanel } from "./builder-issues-panel";
import { DefiHealthFactorFields } from "./defi-health-factor-fields";
import { BuilderBar } from "./flow-canvas/builder-bar";
import { FlowCanvas } from "./flow-canvas/flow-canvas";
import type { StepMenuGroup } from "./flow-canvas/step-menu";
import { FlowSettingsPanel } from "./flow-settings-panel";
import { LibraryIcon } from "./node-icons";
import { OnchainTriggerFields } from "./onchain-trigger-fields";
import { type PropertySelectOption } from "./property-select";
import {
  ListStepFields,
  TagStepFields,
} from "./step-panel/audience-step-fields";
import { BranchStepFields } from "./step-panel/branch-step-fields";
import {
  type EmailSource,
  EmailStepFields,
} from "./step-panel/email-step-fields";
import {
  PanelFoot,
  PanelHead,
  PanelTodo,
  TextField,
} from "./step-panel/panel-ui";
import { ActionBox, PickField } from "./step-panel/pick-field";
import { SchemaFields } from "./step-panel/schema-fields";
import {
  SplitStepFields,
  type SplitVariant,
} from "./step-panel/split-step-fields";
import { WaitStepFields } from "./step-panel/wait-step-fields";
import { audienceService } from "@/features/audience/audience.service";
import {
  emailTemplates as fallbackEmailTemplates,
  eventTypes,
  mockContracts,
} from "@/features/automation/data";
import {
  getAutomationData,
  getInitialEdges,
  getInitialNodes,
} from "@/features/automation/utils";
import {
  buildCatalog,
  type CatalogEntry,
  CLIENT_TRIGGER_TYPES,
  COSMOS_SOVREN_TRIGGER_TYPES,
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
  parseValidationIssues,
  parseWatchesSkipped,
  parseWatchState,
  summarizeIssues,
} from "@/features/automation/utils/builder-issues";
import {
  type BranchRule,
  type BuilderSchemaField,
  normalizeBranchRule,
  normalizeSchemaFields,
} from "@/features/automation/utils/builder-schema";
import {
  asNumber,
  asString,
  pickArray,
  pickText,
} from "@/features/automation/utils/coerce";
import { resolveContractCatalog } from "@/features/automation/utils/contracts";
import {
  emailNodePatch,
  hasEmailPatch,
} from "@/features/automation/utils/email-node-sync";
import {
  canNudge,
  insertStep,
  moveStep,
  nudgeStep,
  removeStep,
} from "@/features/automation/utils/flow-edit";
import {
  buildFlowTree,
  type Slot,
} from "@/features/automation/utils/flow-tree";
import { canRunLendingHealthFactorNow } from "@/features/automation/utils/run-now";
import { stepKindLabel } from "@/features/automation/utils/step-summary";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { useFormsList } from "@/features/forms/hooks/use-forms";
import { ContractAddressNudge } from "@/features/settings/components/contract-address-nudge";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { SendConfirmDialog } from "@/shared/components/common/send-confirm-dialog";
import { subscribeEmailDesignSaved } from "@/shared/utils/email-design-channel";

// Off-chain triggers whose core config is "which <resource>?" - they get a real
// dropdown of existing lists / tags / campaigns instead of a free-text field.
const OFFCHAIN_LIST_TRIGGER_TYPES = new Set([
  "list_joined",
  "segment_entered",
  "segment_exited",
]);
const OFFCHAIN_TAG_TRIGGER_TYPES = new Set(["tag_added"]);
const OFFCHAIN_CAMPAIGN_TRIGGER_TYPES = new Set([
  "email_opened",
  "email_clicked",
  "campaign_completed",
]);
const OFFCHAIN_FORM_TRIGGER_TYPES = new Set(["form_submitted"]);

const nodePanelLabel = stepKindLabel;

/**
 * Maps an action catalog `type` (from GET /automations/builder/actions) to the
 * ReactFlow node renderer key above. Anything not listed falls through to its
 * own type (e.g. `wait`, `branch`). Triggers never use this - they all render
 * with the `trigger` node.
 */
const ACTION_NODE_RENDERER: Record<string, string> = {
  send_email: "email",
  send_inapp: "inapp",
  send_telegram: "telegram",
  dispatch_campaign: "dispatch",
  add_tag: "tag",
  remove_tag: "tag",
  add_to_list: "list",
  remove_from_list: "list",
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

/** A split step's variants as the panel edits them. */
const splitVariants = (raw: unknown): SplitVariant[] =>
  Array.isArray(raw)
    ? raw.map((v) => {
        const r = isJsonObject(v) ? v : {};
        return { label: String(r.label ?? ""), weight: Number(r.weight) || 0 };
      })
    : [];

/** The steps the "+" menu lists first. */
const COMMON_STEP_TYPES = new Set([
  "send_email",
  "send_inapp",
  "wait",
  "branch",
  "add_tag",
]);

/** An edge as the backend stores it. The canvas draws its own lines. */
const makeEdge = (
  source: string,
  target: string,
  handle: string | null
): Edge => ({
  id: `e-${source}-${target}-${handle ?? "out"}-${Math.random().toString(36).slice(2, 8)}`,
  source,
  target,
  ...(handle ? { sourceHandle: handle } : {}),
});

const CreateAutomationContent = () => {
  const params = useParams();
  const automationId = params?.id as string;
  const isNew = automationId === "new-id";

  const queryClient = useQueryClient();

  const [nodes, setNodes] = useState<Node[]>(() =>
    getInitialNodes(automationId)
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    getInitialEdges(automationId)
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Flow-level guardrail settings (re-entry policy, frequency cap) persisted in
  // the graph's `settings` and read by the runtime. Hydrated from the backend.
  const [flowSettings, setFlowSettings] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [automationData, setAutomationData] = useState(
    getAutomationData(automationId)
  );
  // Guard before an automation goes live and starts enrolling contacts.
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  // The "to finish" list under the bar: opened from the bar, or by a check.
  const [issuesOpen, setIssuesOpen] = useState(false);
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
  const focusNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-node="${CSS.escape(nodeId)}"]`)
        ?.scrollIntoView({
          block: "center",
          inline: "center",
          behavior: "smooth",
        });
    });
  }, []);

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

  /* The "Add a trigger" picker, grouped like the old palette. A preset with no
     verified Solana program is greyed out once the flow is on Solana: adding
     it would look fine and then refuse to bind at publish. */
  const triggerGroups = useMemo<StepMenuGroup[]>(() => {
    const item = (t: (typeof triggerCatalog)[number]) => {
      const verdict = ON_CHAIN_TRIGGER_TYPES.has(t.type)
        ? solanaVerdict(svmByTriggerType.get(t.type), flowChain)
        : null;
      return {
        id: t.type,
        label: t.label,
        hint: t.description,
        icon: t.icon,
        disabledReason:
          verdict && !verdict.supported ? verdict.reason : undefined,
      };
    };
    const onchain = triggerCatalog.filter((t) =>
      ON_CHAIN_TRIGGER_TYPES.has(t.type)
    );
    const sovren = triggerCatalog.filter((t) =>
      COSMOS_SOVREN_TRIGGER_TYPES.has(t.type)
    );
    const offchain = triggerCatalog.filter(
      (t) =>
        !ON_CHAIN_TRIGGER_TYPES.has(t.type) &&
        !COSMOS_SOVREN_TRIGGER_TYPES.has(t.type)
    );
    return [
      { label: "On-chain", items: onchain.map(item) },
      { label: "Off-chain", items: offchain.map(item) },
      { label: "Cosmos / Sovren", items: sovren.map(item) },
    ].filter((g) => g.items.length > 0);
  }, [triggerCatalog, svmByTriggerType, flowChain]);

  /* The "+" picker: the steps people reach for first, then the rest. */
  const stepGroups = useMemo<StepMenuGroup[]>(() => {
    const item = (a: (typeof actionCatalog)[number]) => ({
      id: a.type,
      label: a.label,
      hint: a.description,
      icon: a.icon,
    });
    const common = actionCatalog.filter((a) => COMMON_STEP_TYPES.has(a.type));
    const more = actionCatalog.filter((a) => !COMMON_STEP_TYPES.has(a.type));
    return [
      { label: "Most used", items: common.map(item) },
      { label: "More", items: more.map(item) },
    ].filter((g) => g.items.length > 0);
  }, [actionCatalog]);

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

  // Org capture forms for the "Form submitted" trigger picker. Shares the
  // forms-list cache (FORMS_KEY) with the forms feature.
  const formsQuery = useFormsList();
  const formOptions = useMemo<PropertySelectOption[]>(
    () =>
      (formsQuery.data ?? []).map((f) => ({
        value: f.id,
        label: f.name || f.id,
      })),
    [formsQuery.data]
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

  const statsMessagesQuery = useQuery({
    queryKey: ["automations", automationId, "stats", "messages"],
    queryFn: () => automationService.getMessageStats(automationId),
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

  // "Messages in this flow" is the flow's send steps, each joined to its
  // per-message delivery counts from the backend (keyed by node id). A node with
  // no counts yet carries nulls, which the table renders as "-".
  const messageRows = useMemo(() => {
    const sendTypes = new Set([
      "send_email",
      "email",
      "send_inapp",
      "inapp",
      "dispatch_campaign",
    ]);
    const counts = new Map<
      string,
      { sent: number; delivered: number; opened: number; clicked: number }
    >();
    const raw = (statsMessagesQuery.data as { messages?: unknown } | undefined)
      ?.messages;
    if (Array.isArray(raw)) {
      for (const m of raw) {
        if (!isJsonObject(m)) continue;
        const nodeId = asString((m as Record<string, unknown>).nodeId);
        if (!nodeId) continue;
        counts.set(nodeId, {
          sent: asNumber((m as Record<string, unknown>).sent),
          delivered: asNumber((m as Record<string, unknown>).delivered),
          opened: asNumber((m as Record<string, unknown>).opened),
          clicked: asNumber((m as Record<string, unknown>).clicked),
        });
      }
    }
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
        return { id: n.id, title, channel, counts: counts.get(n.id) ?? null };
      });
  }, [nodes, statsMessagesQuery.data]);

  // In-app read receipts are not wired yet, so only email sends get real
  // delivered/opened/clicked numbers; the note stays while any counts are absent.
  const hasMessageCounts = useMemo(
    () => messageRows.some((row) => row.counts !== null),
    [messageRows]
  );

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
  const selectedIsTelegram = isSelectedRenderer("telegram");
  const selectedIsWebhook = isSelectedRenderer("webhook");
  const selectedIsDispatch = isSelectedRenderer("dispatch");
  const selectedIsTag = isSelectedRenderer("tag");
  const selectedIsList = isSelectedRenderer("list");
  const selectedIsWait = isSelectedRenderer("wait");
  // The Tag/List panels are shared by the add and remove actions (both route to
  // the "tag"/"list" renderer). The canonical actionType is what distinguishes
  // them, so copy that says "add"/"create" is suppressed for the remove case.
  const selectedCanonicalActionType =
    asString(selectedNodeData.actionType) ||
    asString(selectedNodeData.nodeType);
  const selectedIsRemoveTag = selectedCanonicalActionType === "remove_tag";
  const selectedIsRemoveFromList =
    selectedCanonicalActionType === "remove_from_list";
  // Action nodes have their own dedicated config panels above, so the generic
  // schema "Configuration" dump is redundant noise for them - hide it. It stays
  // for off-chain triggers (segment/form) where it is still the only config.
  const selectedHasDedicatedPanel =
    selectedIsEmail ||
    selectedIsInapp ||
    selectedIsTelegram ||
    selectedIsWebhook ||
    selectedIsDispatch ||
    selectedIsTag ||
    selectedIsList ||
    selectedIsWait ||
    selectedIsBranch;
  const selectedTemplate = useMemo(() => {
    const templateId = asString(selectedNodeData.templateId);
    return (
      emailTemplateOptions.find((template) => template.id === templateId) ??
      null
    );
  }, [emailTemplateOptions, selectedNodeData]);
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
  // Off-chain triggers that are really "which <resource>?": we give them a
  // real dropdown (list / tag / campaign) instead of the generic schema's
  // free-text field, and suppress the generic block for them.
  const selectedTriggerResource: "list" | "tag" | "campaign" | "form" | null =
    selectedIsTrigger &&
    !selectedTriggerIsOnchain &&
    !selectedIsDefiHealthTrigger
      ? OFFCHAIN_LIST_TRIGGER_TYPES.has(selectedNodeSchemaType)
        ? "list"
        : OFFCHAIN_TAG_TRIGGER_TYPES.has(selectedNodeSchemaType)
          ? "tag"
          : OFFCHAIN_CAMPAIGN_TRIGGER_TYPES.has(selectedNodeSchemaType)
            ? "campaign"
            : OFFCHAIN_FORM_TRIGGER_TYPES.has(selectedNodeSchemaType)
              ? "form"
              : null
      : null;
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

  // Create-new affordances for the Add tag / Add to list actions, so a user can
  // make a tag/list inline instead of only choosing an existing one. Both reuse
  // the audience create endpoints and refresh the builder's option lists.
  const createTagMutation = useMutation({
    mutationFn: (name: string) => audienceService.createTag({ name }),
    onSuccess: async (created, name) => {
      await queryClient.invalidateQueries({
        queryKey: ["automations", "builder", "tags"],
      });
      const label =
        asString((created as { name?: unknown } | null)?.name) || name;
      const tags = Array.from(new Set([...selectedTags, label]));
      updateSelectedNodeData({ tags, tag: tags[0] ?? "" });
      toast.success(`Created and added "${label}".`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create the tag."),
  });

  const createListMutation = useMutation({
    mutationFn: (name: string) => audienceService.createSegment({ name }),
    onSuccess: async (created, name) => {
      await queryClient.invalidateQueries({
        queryKey: ["automations", "builder", "segments"],
      });
      const id = asString((created as { id?: unknown } | null)?.id);
      const label =
        asString((created as { name?: unknown } | null)?.name) || name;
      if (id) updateSelectedNodeData({ listId: id, listName: label });
      toast.success(`Created list "${label}".`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create the list."),
  });

  const [openingEmailBuilder, setOpeningEmailBuilder] = useState(false);
  // The email node whose editor is open in another tab, so we can pull the saved
  // design's subject / preview / template back onto it when this tab refocuses.
  const emailSyncRef = useRef<{ nodeId: string; campaignId: string } | null>(
    null
  );
  // Prevents focus + visibilitychange (which both fire on a tab return) from
  // running two overlapping polls at once.
  const emailSyncingRef = useRef(false);
  const syncEmailNodeFromEditor = useCallback(async () => {
    const ref = emailSyncRef.current;
    if (!ref || emailSyncingRef.current) return;
    emailSyncingRef.current = true;
    try {
      // The design is saved in the editor tab; when the user switches back that
      // save can still be in flight, so read a few times until it lands instead
      // of once - a single read silently missed a just-built email, which is why
      // the step never got tagged with the subject / preview.
      for (let attempt = 0; attempt < 6; attempt++) {
        let patch: Record<string, unknown> = {};
        try {
          const content = await campaignsService.getEmailContent(
            ref.campaignId
          );
          patch = emailNodePatch(
            {
              subject: content.subject,
              previewText: content.previewText,
              templateId: content.source?.templateId,
            },
            emailTemplateOptions
          );
        } catch {
          // A transient read error should not abandon the sync; keep polling.
        }
        if (hasEmailPatch(patch)) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === ref.nodeId
                ? {
                    ...n,
                    data: {
                      ...(n.data as Record<string, unknown>),
                      ...patch,
                    },
                  }
                : n
            )
          );
          // Surface a freshly-created template in the picker so the next open
          // and the name lookup see it.
          queryClient.invalidateQueries({
            queryKey: ["automations", "builder", "email-templates"],
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    } finally {
      emailSyncingRef.current = false;
    }
  }, [emailTemplateOptions, setNodes, queryClient]);

  // Pull the latest email design back whenever this tab is shown again. The
  // editor opens in another tab, so `visibilitychange` (fires reliably on a
  // tab switch back) is the primary signal; `focus` is kept as a fallback for
  // window-level refocus.
  useEffect(() => {
    const sync = () => {
      syncEmailNodeFromEditor().catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncEmailNodeFromEditor]);

  // Instant path: the editor tab broadcasts the moment it saves, so reflect the
  // design onto the matching Send Email node right away instead of waiting for
  // this tab to regain focus. The focus/visibility poll above stays as the
  // fallback for browsers without BroadcastChannel or a dropped message.
  useEffect(() => {
    return subscribeEmailDesignSaved((message) => {
      // Apply whatever the broadcast carried immediately (keyed by campaign, so
      // the right node updates even if it was not the one that opened the
      // editor), then reconcile from the authoritative email content.
      const patch = emailNodePatch(
        {
          subject: message.subject,
          previewText: message.previewText,
          templateId: message.templateId,
        },
        emailTemplateOptions
      );
      if (hasEmailPatch(patch)) {
        setNodes((nds) =>
          nds.map((n) =>
            isJsonObject(n.data) &&
            asString(n.data.campaignId) === message.campaignId
              ? { ...n, data: { ...n.data, ...patch } }
              : n
          )
        );
      }
      if (emailSyncRef.current?.campaignId === message.campaignId) {
        syncEmailNodeFromEditor().catch(() => undefined);
      }
    });
  }, [emailTemplateOptions, setNodes, syncEmailNodeFromEditor]);

  // Open the visual email editor for the selected email node. The editor needs a
  // real campaign draft to attach the design to, so we mint one the first time
  // (reused on later opens via the node's `campaignId`) instead of passing the
  // automation id - which is not a campaign and returned 404 "Campaign not
  // found". No template is required: the editor opens blank for from-scratch.
  const openEmailBuilder = async () => {
    setOpeningEmailBuilder(true);
    try {
      const nodeId = selectedNode;
      const templateId = asString(selectedNodeData.templateId);
      let campaignId = asString(selectedNodeData.campaignId);
      if (!campaignId) {
        const created = await campaignsService.createCampaign({
          name: asString(selectedNodeData.subject) || "Automation email",
          type: "email",
          status: "draft",
        });
        if (!created?.id) throw new Error("Failed to create an email draft.");
        campaignId = created.id;
        updateSelectedNodeData({ campaignId });
      }
      // Attaching an existing template: seed the campaign with it so the editor
      // opens that design, and pass `template` so saves update it in place.
      if (templateId) {
        await campaignsService
          .setTemplate(campaignId, { templateId })
          .catch(() => undefined);
      }
      // Remember which node this editor belongs to; on return we read the saved
      // subject / preview / template back off the campaign and reflect them here.
      emailSyncRef.current = nodeId ? { nodeId, campaignId } : null;
      const qs = new URLSearchParams({
        campaign: campaignId,
        returnTo: `/automations/${automationId}`,
        ...(templateId ? { template: templateId } : {}),
        templateName: asString(selectedNodeData.templateName),
        subject: asString(selectedNodeData.subject),
      });
      window.open(
        `/campaigns/editor?${qs.toString()}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "We couldn't start the email editor."
      );
    } finally {
      setOpeningEmailBuilder(false);
    }
  };

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
  }, [nodes, selectedNode]);

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
      if (res.createdId) {
        window.location.href = `/automations/${res.createdId}`;
      }
    },
    onError: (err) => {
      setIsSaving(false);
      reportGraphError(err, "Failed to save");
    },
  });

  // "Save draft" persists via the lenient draft endpoint (no publish-level
  // validation), creating the automation first when it is new. A draft is a
  // work in progress: a Send Email step whose design has not been built yet, a
  // step still missing a field. Requiring a valid flow here was a deadlock -
  // the email builder needs a saved automation to attach its design to, but the
  // automation could not be saved until that design existed. Publish still runs
  // the full validation.
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const name =
        (typeof automationData.name === "string"
          ? automationData.name.trim()
          : "") || "Untitled automation";
      const graph = {
        ...toWireGraph({ nodes, edges }),
        settings: flowSettings,
      };
      if (isNew) {
        const created = await automationService.createAutomation({
          name,
          description: automationData.description ?? "",
          builder: toWireGraph({ nodes, edges }),
        });
        const createdId = created.automationId;
        if (!createdId) throw new Error("Could not create the automation.");
        // Create does not seed the draft graph getBuilder reads back, so write
        // it explicitly - this is the lenient store the deadlock needed.
        await automationService.saveBuilderDraft(createdId, graph);
        return { createdId };
      }
      await automationService.updateAutomation(automationId, {
        name,
        description: automationData.description ?? "",
      });
      await automationService.saveBuilderDraft(automationId, graph);
      return { createdId: null as string | null };
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setIsSaving(false);
      if (res.createdId) {
        window.location.href = `/automations/${res.createdId}`;
        return;
      }
      toast.success("Draft saved.");
    },
    onError: (err) => {
      setIsSaving(false);
      reportGraphError(err, "Failed to save draft");
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
      // Include flow-level settings (conversion goal, re-entry, frequency cap).
      // Omitting them let the 1s autosave overwrite draftGraph.settings with {},
      // silently wiping a goal the user had just set — it survived only a full
      // save/publish, so it "saved for some automations" and not others.
      await automationService.saveBuilderDraft(automationId, {
        ...toWireGraph({ nodes, edges }),
        settings: flowSettings,
      });
    },
  });

  useEffect(() => {
    if (isNew) return;
    // flowSettings is a dependency so setting a goal (which changes no node or
    // edge) still triggers the autosave — without it the goal was never saved.
    const t = window.setTimeout(() => {
      draftSaveMutation.mutate();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [automationId, draftSaveMutation, edges, flowSettings, isNew, nodes]);

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

  // Saving a draft never blocks on validation: a draft is allowed to be
  // incomplete, and the backend draft endpoint stores it as-is. Publish (below)
  // is where the flow is validated before it can go live.
  const handleSave = async () => {
    setIsSaving(true);
    saveDraftMutation.mutate();
  };

  // Explicit publish: validate, persist the current draft, then promote it to
  // the live (published) version the runtime actually matches against. Needed
  // because an ACTIVE automation's later draft edits don't go live until it's
  // re-published — flipping the Active toggle doesn't re-publish an already-on
  // flow, which silently leaves the live trigger stale.
  const handlePublish = async () => {
    setIsSaving(true);
    let parsed: BuilderIssue[] = [];
    try {
      parsed = await runValidation();
    } catch (err) {
      if (
        isBuilderInvalidError(err) ||
        parseBuilderErrorIssues(err).length > 0
      ) {
        setIsSaving(false);
        reportGraphError(err, "Failed to publish");
        return;
      }
    }
    const blocking = parsed.filter((issue) => issue.severity === "error");
    if (blocking.length > 0) {
      setIsSaving(false);
      toast.error(`Can't publish yet - ${summarizeIssues(parsed)}`);
      return;
    }
    try {
      // Save the latest canvas first — publish promotes the server's draft.
      await saveMutation.mutateAsync();
      await publishMutation.mutateAsync();
      toast.success("Published — the live automation now runs these changes.");
    } catch (err) {
      reportGraphError(err, "Failed to publish");
    } finally {
      setIsSaving(false);
    }
  };

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

  const displayNodes = useMemo(
    () =>
      showAnalytics
        ? nodes.map((n) => ({
            ...n,
            data: { ...n.data, stats: nodeStatsById.get(n.id) ?? null },
          }))
        : nodes,
    [nodes, showAnalytics, nodeStatsById]
  );

  /* The flow as the canvas draws it, read off the nodes and edges. */
  const flowTree = useMemo(
    () =>
      buildFlowTree(nodes, edges, (n) =>
        nodeIsTrigger(
          n.type,
          isJsonObject(n.data) ? asString(n.data.triggerType) : ""
        )
      ),
    [nodes, edges]
  );

  /** A new step's node, with its backend schema fetched once it exists. */
  const createNode = (type: string): Node => {
    const label =
      [...triggerCatalog, ...actionCatalog].find((c) => c.type === type)
        ?.label ?? stepKindLabel(type);
    const { rendererType, data } = resolveNodeShape(type, label);
    const node: Node = {
      id: `${type}-${Date.now()}`,
      type: rendererType,
      // Kept for the stored graph; the canvas lays steps out itself.
      position: { x: 0, y: nodes.length * 160 },
      data,
    };
    if (!isNew) {
      (rendererType === "trigger"
        ? automationService.getTriggerSchema(type)
        : automationService.getActionSchema(type)
      )
        .then((schema) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: { ...(n.data as Record<string, unknown>), schema },
                  }
                : n
            )
          )
        )
        .catch(() => undefined);
    }
    return node;
  };

  /* "What starts it": every trigger, so the panel can swap one for another. */
  const triggerKindOptions = useMemo(
    () =>
      triggerGroups.flatMap((g) =>
        g.items.map((t) => ({ value: t.id, label: t.label, hint: g.label }))
      ),
    [triggerGroups]
  );

  /** Swaps a trigger for another kind in place, keeping where it leads. */
  const changeTriggerType = (id: string, type: string) => {
    const label =
      triggerCatalog.find((t) => t.type === type)?.label ?? stepKindLabel(type);
    const { rendererType, data } = resolveNodeShape(type, label);
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, type: rendererType, data } : n))
    );
  };

  /** The trigger, wired to whatever the flow already starts with. */
  const addTrigger = (type: string) => {
    if (flowTree.root) {
      toast.error(
        "An automation has one trigger. Remove the current one first."
      );
      return;
    }
    const node = createNode(type);
    // A flow loaded without its trigger keeps its first step: the new trigger
    // leads into the step nothing else leads into.
    const first = flowTree.detached.find(
      (id) => !edges.some((e) => e.target === id)
    );
    setNodes((nds) => nds.concat(node));
    if (first) setEdges((eds) => eds.concat(makeEdge(node.id, first, null)));
    setSelectedNode(node.id);
  };

  const insertAt = (slots: Slot[], type: string) => {
    const node = createNode(type);
    const next = insertStep({ nodes, edges }, node, slots, makeEdge);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNode(node.id);
  };

  const moveTo = (id: string, slots: Slot[]) => {
    const next = moveStep({ nodes, edges }, id, slots, makeEdge);
    setNodes(next.nodes);
    setEdges(next.edges);
  };

  const nudge = (id: string, dir: -1 | 1) => {
    const next = nudgeStep({ nodes, edges }, id, dir, flowTree, makeEdge);
    setNodes(next.nodes);
    setEdges(next.edges);
  };

  /* Removing closes the gap; a branch takes its paths with it. */
  const removeNode = (id: string) => {
    const next = removeStep({ nodes, edges }, id, flowTree);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNode(null);
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

  const canvasNodeMap = useMemo(
    () => new Map(canvasNodes.map((n) => [n.id, n])),
    [canvasNodes]
  );
  const selectedSetupHint = (() => {
    const data = selectedNode ? canvasNodeMap.get(selectedNode)?.data : null;
    return isJsonObject(data) && data.needsSetup === true
      ? asString(data.setupHint)
      : "";
  })();

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
    <div
      className={cn(
        "ab mx-auto w-full max-w-[1600px] px-4 py-3",
        activeTab === "builder" && "ab--build"
      )}
    >
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

      <BuilderBar
        name={automationData.name}
        status={automationData.status}
        isNew={isNew}
        tab={activeTab === "stats" ? "stats" : "builder"}
        todo={errorIssues.length}
        issuesOpen={issuesOpen}
        hasSteps={builderNodeCount > 0}
        saveState={
          draftSaveMutation.isPending
            ? "saving"
            : draftSaveMutation.isError
              ? "error"
              : draftSaveMutation.isSuccess
                ? "saved"
                : "idle"
        }
        checking={validateMutation.isPending}
        saving={isSaving}
        publishing={publishMutation.isPending}
        toggling={statusToggleMutation.isPending || publishMutation.isPending}
        onName={(name) => setAutomationData({ ...automationData, name })}
        onNameCommit={persistName}
        onTab={setActiveTab}
        onToggleIssues={() => setIssuesOpen((v) => !v)}
        onCheck={() => {
          setIssuesOpen(true);
          handleCheckFlow();
        }}
        onSave={handleSave}
        onPublish={handlePublish}
        onPause={() => statusToggleMutation.mutate("paused")}
        onTurnOn={() => setShowActivateConfirm(true)}
      />

      {activeTab === "builder" && hasOnchainTrigger ? (
        <ContractAddressNudge
          context="automation"
          hasContracts={hasSavedContracts}
        />
      ) : null}

      {/* What's wrong and where — the builder's answer to a backend graph
          rejection, which otherwise arrives as one opaque line. */}
      {activeTab === "builder" && issuesOpen && issues.length > 0 ? (
        <BuilderIssuesPanel
          issues={issues}
          labelForNode={labelForNode}
          onFocusNode={focusNode}
          onRecheck={handleCheckFlow}
          checking={validateMutation.isPending}
          stale={serverVerdictStale}
        />
      ) : null}

      {activeTab === "builder" ? (
        <div className="ab-grid">
          <FlowCanvas
            tree={flowTree}
            nodes={canvasNodeMap}
            selected={selectedNode}
            severity={issuesByNodeId}
            stepGroups={stepGroups}
            triggerGroups={triggerGroups}
            showStats={showAnalytics}
            overlay={
              isNew ? undefined : (
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
              )
            }
            onSelect={setSelectedNode}
            onInsert={insertAt}
            onMove={moveTo}
            onAddTrigger={addTrigger}
          />

          {/* The selected step's settings, or the flow's own when nothing is. */}
          <aside
            className="ab-panel scrollbar-sleek"
            aria-label={selectedNode ? "Step settings" : "Flow settings"}
          >
            {selectedNode && selectedNodeDetails ? (
              <div className="abp">
                <PanelHead
                  entry={selectedIsTrigger}
                  icon={
                    <LibraryIcon
                      type={
                        asString(selectedNodeData.actionType) ||
                        asString(selectedNodeData.triggerType) ||
                        asString(selectedNodeData.nodeType) ||
                        (selectedNodeDetails.type ?? "")
                      }
                    />
                  }
                  eyebrow={selectedIsTrigger ? "Trigger" : "Step"}
                  title={nodePanelLabel(
                    selectedIsTrigger
                      ? asString(selectedNodeData.triggerType) ||
                          selectedNodeDetails.type
                      : asString(selectedNodeData.actionType) ||
                          asString(selectedNodeData.nodeType) ||
                          selectedNodeDetails.type
                  )}
                  onClose={() => setSelectedNode(null)}
                />
                {selectedSetupHint ? (
                  <PanelTodo>{selectedSetupHint}</PanelTodo>
                ) : null}

                {selectedIsTrigger && (
                  <PickField
                    label="What starts it"
                    value={
                      asString(selectedNodeData.triggerType) ||
                      asString(selectedNodeData.nodeType)
                    }
                    options={triggerKindOptions}
                    onChange={(type) => changeTriggerType(selectedNode, type)}
                  />
                )}

                {selectedIsTrigger && (
                  <>
                    {/* DeFi Health Factor: pool + threshold + chain. */}
                    {selectedIsDefiHealthTrigger && (
                      <DefiHealthFactorFields
                        nodeData={selectedNodeData}
                        onChange={updateSelectedNodeData}
                        chainOptions={chainOptions}
                      />
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
                    {selectedTriggerResource === "list" && (
                      <PickField
                        label="List"
                        value={
                          asString(selectedNodeData.listId) ||
                          asString(selectedNodeData.segmentId)
                        }
                        options={ensureOption(
                          segmentOptions,
                          asString(selectedNodeData.listId) ||
                            asString(selectedNodeData.segmentId),
                          asString(selectedNodeData.listName) || undefined
                        )}
                        onChange={(next) => {
                          const picked = segmentOptions.find(
                            (o) => o.value === next
                          );
                          updateSelectedNodeData({
                            listId: next,
                            segmentId: next,
                            listName: picked?.label ?? next,
                          });
                        }}
                        placeholder={
                          segmentsQuery.isLoading
                            ? "Loading lists…"
                            : "Choose a list"
                        }
                        hint="Starts when a contact joins this list."
                      />
                    )}
                    {selectedTriggerResource === "tag" && (
                      <PickField
                        label="Tag"
                        value={asString(selectedNodeData.tag)}
                        options={ensureOption(
                          tagOptions,
                          asString(selectedNodeData.tag)
                        )}
                        onChange={(next) =>
                          updateSelectedNodeData({ tag: next })
                        }
                        placeholder={
                          tagsQuery.isLoading ? "Loading tags…" : "Choose a tag"
                        }
                        hint="Starts when this tag is added to a contact."
                      />
                    )}
                    {selectedTriggerResource === "campaign" && (
                      <PickField
                        label="Campaign"
                        value={asString(selectedNodeData.campaignId)}
                        options={ensureOption(
                          campaignOptions,
                          asString(selectedNodeData.campaignId),
                          asString(selectedNodeData.campaignName) || undefined
                        )}
                        onChange={(next) => {
                          const picked = campaignOptions.find(
                            (o) => o.value === next
                          );
                          updateSelectedNodeData({
                            campaignId: next,
                            campaignName: picked?.label ?? next,
                          });
                        }}
                        placeholder={
                          campaignsQuery.isLoading
                            ? "Loading campaigns…"
                            : "Choose a campaign"
                        }
                        hint="Starts on this campaign's email activity."
                      />
                    )}
                    {selectedTriggerResource === "form" && (
                      <PickField
                        label="Form"
                        value={asString(selectedNodeData.formId)}
                        options={ensureOption(
                          formOptions,
                          asString(selectedNodeData.formId),
                          asString(selectedNodeData.formName) || undefined
                        )}
                        onChange={(next) => {
                          const picked = formOptions.find(
                            (o) => o.value === next
                          );
                          updateSelectedNodeData({
                            formId: next,
                            formName: picked?.label ?? next,
                          });
                        }}
                        placeholder={
                          formsQuery.isLoading
                            ? "Loading forms…"
                            : formOptions.length === 0
                              ? "No forms yet"
                              : "Choose a form"
                        }
                        hint="Starts when a contact completes this form."
                      />
                    )}
                  </>
                )}

                {selectedIsEmail && (
                  <EmailStepFields
                    values={{
                      source: (asString(selectedNodeData.emailSource) || "") as
                        EmailSource | "",
                      body: asString(selectedNodeData.body),
                      templateId: asString(selectedNodeData.templateId),
                      templateName:
                        asString(selectedNodeData.templateName) ||
                        (selectedTemplate?.name ?? ""),
                      subject: asString(selectedNodeData.subject),
                      previewText: asString(selectedNodeData.previewText),
                      sender: selectedNodeSenderEmail,
                    }}
                    templateOptions={emailTemplateOptions.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                    senderOptions={senderSelectOptions}
                    sendersLoading={senderIdentitiesQuery.isLoading}
                    noVerifiedSender={verifiedSenderIdentities.length === 0}
                    opening={openingEmailBuilder}
                    onTemplate={(next) => {
                      const template =
                        emailTemplateOptions.find((item) => item.id === next) ??
                        null;
                      updateSelectedNodeData({
                        emailSource: "saved",
                        templateId: next,
                        templateName: template?.name ?? "",
                        // Keep a subject already written; a template fills an empty one.
                        subject:
                          asString(selectedNodeData.subject) ||
                          (template?.subject ?? ""),
                        previewText:
                          asString(selectedNodeData.previewText) ||
                          (template?.previewText ?? ""),
                      });
                    }}
                    onChange={updateSelectedNodeData}
                    onSender={updateSenderEmail}
                    onOpenBuilder={() => {
                      if (isNew) {
                        // The editor attaches its design to a saved draft, so
                        // create one now (lenient - no validation) rather than
                        // dead-ending. The page reloads on the new id; reopen
                        // the builder then.
                        toast.message(
                          "Saving this automation as a draft first, then reopen the email builder."
                        );
                        handleSave();
                        return;
                      }
                      openEmailBuilder().catch(() => undefined);
                    }}
                  />
                )}

                {selectedIsInapp && (
                  <>
                    <TextField
                      label="Title"
                      value={asString(selectedNodeData.title)}
                      onChange={(title) => updateSelectedNodeData({ title })}
                      placeholder="Your rewards are ready"
                    />
                    <TextField
                      label="Message"
                      multiline
                      value={asString(selectedNodeData.body)}
                      onChange={(body) => updateSelectedNodeData({ body })}
                      placeholder="What should the push say?"
                    />
                    <TextField
                      label="Opens"
                      optional
                      value={asString(selectedNodeData.url)}
                      onChange={(url) => updateSelectedNodeData({ url })}
                      placeholder="/app/rewards"
                      hint="Shows the next time they open your app. Tapping it opens this page."
                    />
                  </>
                )}

                {selectedIsTelegram && (
                  <TextField
                    label="Message"
                    multiline
                    value={asString(selectedNodeData.text)}
                    onChange={(text) => updateSelectedNodeData({ text })}
                    placeholder="Your rewards are ready. Claim them in the app."
                    hint="Sent to the contact on Telegram."
                  />
                )}

                {selectedIsWebhook && (
                  <>
                    <TextField
                      label="URL"
                      type="url"
                      value={asString(selectedNodeData.url)}
                      onChange={(url) => updateSelectedNodeData({ url })}
                      placeholder="https://api.your-app.com/hooks/automation"
                    />
                    <PickField
                      label="Method"
                      value={asString(selectedNodeData.method) || "POST"}
                      options={WEBHOOK_METHODS}
                      onChange={(method) => updateSelectedNodeData({ method })}
                      hint="We send the contact and the step as JSON."
                    />
                  </>
                )}

                {selectedIsDispatch && (
                  <PickField
                    label="Campaign"
                    value={asString(selectedNodeData.campaignId)}
                    options={ensureOption(
                      campaignOptions,
                      asString(selectedNodeData.campaignId)
                    )}
                    onChange={(next) => {
                      const picked = campaignOptions.find(
                        (o) => o.value === next
                      );
                      updateSelectedNodeData({
                        campaignId: next,
                        campaignName: picked?.label ?? next,
                      });
                    }}
                    placeholder={
                      campaignsQuery.isLoading
                        ? "Loading campaigns…"
                        : "Choose a campaign"
                    }
                    hint="Sends this campaign to the contact when they reach this step."
                  />
                )}

                {selectedIsTag && (
                  <TagStepFields
                    tags={selectedTags}
                    options={tagOptions}
                    loading={tagsQuery.isLoading}
                    removing={selectedIsRemoveTag}
                    creating={createTagMutation.isPending}
                    onChange={(tags) =>
                      updateSelectedNodeData({ tags, tag: tags[0] ?? "" })
                    }
                    onCreate={(name) => createTagMutation.mutate(name)}
                  />
                )}

                {selectedIsList && (
                  <ListStepFields
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
                    loading={segmentsQuery.isLoading}
                    removing={selectedIsRemoveFromList}
                    creating={createListMutation.isPending}
                    onChange={(next) => {
                      const picked = segmentOptions.find(
                        (o) => o.value === next
                      );
                      updateSelectedNodeData({
                        listId: next,
                        listName: picked?.label ?? next,
                      });
                    }}
                    onCreate={(name) => createListMutation.mutate(name)}
                  />
                )}

                {selectedIsWait && (
                  <WaitStepFields
                    data={selectedNodeData}
                    onChange={updateSelectedNodeData}
                  />
                )}

                {selectedIsBranch && (
                  <BranchStepFields
                    rules={branchRules}
                    targets={branchTargetOptions}
                    fallback={branchDefaultTarget}
                    onAdd={addBranchRule}
                    onUpdate={updateBranchRule}
                    onRemove={removeBranchRule}
                    onFallback={(next) =>
                      updateSelectedNodeData({ defaultTarget: next })
                    }
                  />
                )}

                {selectedNodeSchemaType === "split" && (
                  <SplitStepFields
                    variants={splitVariants(selectedNodeData.variants)}
                    onChange={(variants) =>
                      updateSelectedNodeData({ variants })
                    }
                  />
                )}

                {/* Off-chain triggers with no panel of their own (custom
                    events and the like): the fields the backend's schema
                    lists, as plain fields. */}
                {!selectedTriggerIsOnchain &&
                !selectedIsDefiHealthTrigger &&
                !selectedTriggerResource &&
                selectedNodeSchemaType !== "split" &&
                !selectedHasDedicatedPanel &&
                (selectedNodeSchemaQuery.isFetching ||
                  selectedNodeSchemaFields.length > 0 ||
                  selectedNodeSchemaQuery.error instanceof Error) ? (
                  <SchemaFields
                    key={selectedNode}
                    fields={schemaEssentialFields}
                    values={selectedNodeData}
                    loading={selectedNodeSchemaQuery.isFetching}
                    error={
                      selectedNodeSchemaQuery.error instanceof Error
                        ? selectedNodeSchemaQuery.error.message
                        : null
                    }
                    eventSuggestions={
                      selectedIsTrigger ? (eventsCatalogQuery.data ?? []) : []
                    }
                    onValue={updateSchemaFieldValue}
                  />
                ) : null}

                {/* Run the lending check now instead of waiting for the
                    30-minute schedule. Saved automations only. */}
                {selectedIsTrigger && selectedIsDefiHealthTrigger && !isNew && (
                  <ActionBox
                    title="Run now"
                    body="Check every position immediately, ignoring the 30-minute schedule."
                    actionLabel="Run now"
                    busyLabel="Running…"
                    busy={runHealthFactorMutation.isPending}
                    icon={
                      <BoltIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    }
                    onAction={() => runHealthFactorMutation.mutate()}
                  />
                )}
                {selectedIsTrigger &&
                  !selectedIsDefiHealthTrigger &&
                  !isNew && (
                    <ActionBox
                      title="Try it"
                      body="Send a test event through this trigger to see the automation run. Nothing is sent to real contacts."
                      actionLabel="Send a test event"
                      busyLabel="Sending…"
                      busy={runtimeTriggerMutation.isPending}
                      onAction={() => runtimeTriggerMutation.mutate()}
                    />
                  )}

                <PanelFoot
                  removeLabel={
                    selectedIsTrigger ? "Remove trigger" : "Remove step"
                  }
                  onRemove={() => removeNode(selectedNode)}
                  onMove={
                    selectedIsTrigger
                      ? undefined
                      : (dir) => nudge(selectedNode, dir)
                  }
                  canMoveUp={canNudge(flowTree, selectedNode, -1)}
                  canMoveDown={canNudge(flowTree, selectedNode, 1)}
                />
              </div>
            ) : (
              <FlowSettingsPanel
                value={flowSettings}
                onChange={setFlowSettings}
                triggerEventType={triggerEventType}
              />
            )}
          </aside>
        </div>
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
                      <th className="px-6 py-3 text-right">Opened / Viewed</th>
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
                          <td className="px-6 py-4 text-right tabular-nums text-foreground">
                            {m.counts ? m.counts.sent.toLocaleString() : "-"}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-foreground">
                            {m.counts ? m.counts.opened.toLocaleString() : "-"}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-foreground">
                            {m.counts ? m.counts.clicked.toLocaleString() : "-"}
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
                {hasMessageCounts
                  ? " Opens and clicks are counted once per recipient; in-app read receipts aren't tracked yet."
                  : " Per-message delivery counts appear here once a message has sent."}
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
  );
};

export function CreateAutomation() {
  return <CreateAutomationContent />;
}
