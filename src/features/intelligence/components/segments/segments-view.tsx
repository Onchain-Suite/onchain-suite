"use client";

import {
  CheckIcon,
  ClipboardDocumentIcon,
  MegaphoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/date";
import { isJsonObject } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SavedSegment {
  id: string;
  name: string;
  size: number | null;
  updatedAt?: string;
  description?: string;
}

const truncateMiddle = (text: string, head = 6, tail = 4): string =>
  text.length <= head + tail + 1
    ? text
    : `${text.slice(0, head)}…${text.slice(-tail)}`;

const FIELDS: { value: string; label: string }[] = [
  { value: "wallet_balance", label: "Wallet balance" },
  { value: "last_active", label: "Last active" },
  { value: "transaction_count", label: "Transaction count" },
  { value: "email_opened", label: "Email opened" },
  { value: "token_held", label: "Token held" },
];

// The backend only accepts numeric operators on count/amount fields and the
// recency operator on `last_active`; any other combo 400s. Offer operators
// per field so the builder can only produce valid rules.
const NUMERIC_OPERATORS: { value: string; label: string }[] = [
  { value: "gt", label: "is greater than" },
  { value: "lt", label: "is less than" },
  { value: "eq", label: "equals" },
];
const RECENCY_OPERATORS: { value: string; label: string }[] = [
  { value: "within", label: "is within" },
];
const FIELD_KIND: Record<string, "numeric" | "recency"> = {
  wallet_balance: "numeric",
  transaction_count: "numeric",
  token_held: "numeric",
  email_opened: "numeric",
  last_active: "recency",
};
const operatorsForField = (field: string) =>
  FIELD_KIND[field] === "recency" ? RECENCY_OPERATORS : NUMERIC_OPERATORS;

// Rule values are free text ("10", "7 days") but the API needs numbers, so pull
// the leading number out. Returns null for empty/non-numeric input.
const toNumericValue = (raw: string): number | null => {
  const found = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!found) return null;
  const n = Number(found[0]);
  return Number.isFinite(n) ? n : null;
};

const buildConditions = (
  rs: Rule[]
): { field: string; operator: string; value: number }[] =>
  rs
    .map((r) => {
      const value = toNumericValue(r.value);
      return value === null
        ? null
        : { field: r.field, operator: r.operator, value };
    })
    .filter(
      (c): c is { field: string; operator: string; value: number } => c !== null
    );

const newRule = (
  field = "wallet_balance",
  operator = "gt",
  value = ""
): Rule => ({
  id: crypto.randomUUID(),
  field,
  operator,
  value,
});

// Themed dropdown built on the Radix Select primitive so the menu matches the
// app's dark surfaces (a native <select> renders the OS menu, which looks
// out of place). Keyboard + a11y come from Radix.
function RuleSelect({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-9 w-full rounded-lg border-border bg-background"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const extractSegments = (res: unknown): SavedSegment[] => {
  const root: unknown = Array.isArray(res)
    ? res
    : isJsonObject(res)
      ? (res.items ?? res.segments ?? res.data ?? [])
      : [];
  const list = Array.isArray(root) ? root : [];
  return list
    .map((raw): SavedSegment | null => {
      if (!isJsonObject(raw)) return null;
      const id =
        (typeof raw.id === "string" && raw.id) ||
        (typeof raw.segmentId === "string" && raw.segmentId) ||
        "";
      if (!id) return null;
      const size =
        raw.size === null
          ? null
          : typeof raw.size === "number"
            ? raw.size
            : typeof raw.matchCount === "number"
              ? raw.matchCount
              : null;
      return {
        id,
        name: (typeof raw.name === "string" && raw.name) || "Untitled segment",
        size,
        updatedAt:
          (typeof raw.updatedAt === "string" && raw.updatedAt) ||
          (typeof raw.lastUsedAt === "string" && raw.lastUsedAt) ||
          undefined,
        description:
          typeof raw.description === "string" ? raw.description : undefined,
      };
    })
    .filter((s): s is SavedSegment => s !== null);
};

export function SegmentsView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [describe, setDescribe] = useState("");
  const [match, setMatch] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<Rule[]>([
    newRule("wallet_balance", "gt", "10"),
    newRule("last_active", "within", "7 days"),
  ]);

  const segmentsQuery = useQuery({
    queryKey: ["intelligence", "segments", "list"],
    queryFn: async () => {
      const res = await intelligenceService.listSegments({
        page: 1,
        limit: 100,
      });
      return extractSegments(res);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const savedSegments = useMemo(
    () => segmentsQuery.data ?? [],
    [segmentsQuery.data]
  );

  const updateRule = (id: string, key: keyof Rule, value: string) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  // Changing the field can invalidate the current operator (e.g. switching a
  // numeric field to `last_active`), so snap to a valid operator for the field.
  const changeField = (id: string, field: string) =>
    setRules((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const ops = operatorsForField(field);
        const operator = ops.some((o) => o.value === r.operator)
          ? r.operator
          : ops[0].value;
        return { ...r, field, operator };
      })
    );
  const removeRule = (id: string) =>
    setRules((rs) => rs.filter((r) => r.id !== id));

  const resetBuilder = () => {
    setName("");
    setDescribe("");
    setMatch("AND");
    setRules([newRule()]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Segment name is required");
      const conditions = buildConditions(rules);
      if (conditions.length === 0)
        throw new Error("Add at least one complete rule first");
      return intelligenceService.createSegment({
        name: trimmed,
        rules: { match, conditions },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments"],
      });
      toast.success("Segment saved");
      resetBuilder();
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to save segment"
      ),
  });

  // Natural language -> structured rules. The backend fails soft to an empty
  // rule set, so treat that as "couldn't parse" rather than an error.
  const generateMutation = useMutation({
    mutationFn: (prompt: string) =>
      intelligenceService.generateSegmentRules(prompt),
    onSuccess: ({ match: nextMatch, conditions }) => {
      if (conditions.length === 0) {
        toast.info(
          "Couldn't turn that into rules - try rephrasing, or build below by hand."
        );
        return;
      }
      setMatch(nextMatch);
      setRules(conditions.map((c) => newRule(c.field, c.operator, c.value)));
      toast.success(
        `Generated ${conditions.length} rule${conditions.length === 1 ? "" : "s"} - edit anything below.`
      );
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't generate rules"
      ),
  });

  const handleGenerate = () => {
    const prompt = describe.trim();
    if (!prompt) {
      toast.info("Describe your audience first.");
      return;
    }
    generateMutation.mutate(prompt);
  };

  // "Create campaign from segment": save the segment, then open the campaign
  // builder with it pre-selected as the audience (form.tsx reads ?segment=).
  const campaignFromSegmentMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name your segment first");
      const conditions = buildConditions(rules);
      if (conditions.length === 0)
        throw new Error("Add at least one complete rule first");
      return intelligenceService.createSegment({
        name: trimmed,
        rules: { match, conditions },
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments"],
      });
      router.push(
        `/campaigns/new?segment=${encodeURIComponent(res.segmentId)}`
      );
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't start the campaign"
      ),
  });

  // Live preview: debounce the draft rules and ask the backend how many wallets
  // match. Guarded - if the preview endpoint isn't available the query rejects
  // and we fall back to the honest "computed on save" copy (no fabricated data).
  const [previewPayload, setPreviewPayload] = useState<{
    match: "AND" | "OR";
    conditions: { field: string; operator: string; value: number }[];
  } | null>(null);

  useEffect(() => {
    const conditions = buildConditions(rules);
    if (conditions.length === 0) {
      setPreviewPayload(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setPreviewPayload({ match, conditions });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [rules, match]);

  const previewQuery = useQuery({
    queryKey: ["intelligence", "segments", "preview", previewPayload],
    queryFn: ({ signal }) => {
      // `enabled` guarantees a payload, but narrow explicitly for the type.
      if (!previewPayload) throw new Error("No preview payload");
      return intelligenceService.previewSegment(previewPayload, undefined, {
        signal,
      });
    },
    enabled: previewPayload !== null,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const previewCount = previewQuery.data?.matchCount ?? null;
  const sampleWallets = previewQuery.data?.sampleWallets ?? [];
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const copyWallet = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedWallet(address);
      window.setTimeout(() => setCopiedWallet(null), 1500);
    } catch {
      /* clipboard unavailable - no-op */
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Builder */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">New segment</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Draft
          </span>
        </div>

        <div className="mt-6 space-y-2">
          <label
            htmlFor="segment-name"
            className="text-sm font-medium text-foreground"
          >
            Segment name
          </label>
          <input
            id="segment-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Base whales"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Describe your audience
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
            <SparklesIcon
              aria-hidden="true"
              className="ml-1 h-4 w-4 text-primary"
            />
            <input
              value={describe}
              onChange={(e) => setDescribe(e.target.value)}
              placeholder="e.g. Base wallets over 10 ETH who opened our last email but didn't buy"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                generateMutation.isPending || describe.trim().length === 0
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <SparklesIcon aria-hidden="true" className="h-4 w-4" />
              {generateMutation.isPending ? "Generating…" : "Generate"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            The prompt becomes editable rules below - tweak anything by hand.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Match</span>
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(["AND", "OR"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMatch(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  match === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "AND" ? "All (AND)" : "Any (OR)"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2"
            >
              <span className="w-10 shrink-0 pl-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {index === 0 ? "Where" : match}
              </span>
              <RuleSelect
                ariaLabel="Rule field"
                value={rule.field}
                onChange={(v) => changeField(rule.id, v)}
                options={FIELDS}
                className="min-w-36 flex-1"
              />
              <RuleSelect
                ariaLabel="Rule operator"
                value={rule.operator}
                onChange={(v) => updateRule(rule.id, "operator", v)}
                options={operatorsForField(rule.field)}
                className="w-40"
              />
              <input
                value={rule.value}
                onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                placeholder="Value"
                className="h-9 min-w-24 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                aria-label="Remove rule"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XMarkIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRules((rs) => [...rs, newRule()])}
            className="inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            <PlusIcon aria-hidden="true" className="h-4 w-4" />
            Add rule
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheckIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          />
          <p>
            Balance, token and gas rules are matched with zero-knowledge proofs
            - wallets qualify without their exact values ever being exposed.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border/50 pt-5">
          <button
            type="button"
            onClick={resetBuilder}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || name.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserGroupIcon aria-hidden="true" className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save segment"}
          </button>
        </div>
      </div>

      {/* Right column: live preview + saved segments */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="text-base font-semibold text-foreground">
            Live preview
          </h3>
          <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {previewCount !== null
              ? previewCount.toLocaleString()
              : previewQuery.isFetching
                ? "…"
                : "-"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {previewCount !== null ? (
              "matching wallets · updates as you edit"
            ) : (
              <>
                Matching wallets are computed when you save. Refine your rules
                {rules.length > 0
                  ? ` (${rules.length} rule${rules.length === 1 ? "" : "s"}, match ${match === "AND" ? "all" : "any"})`
                  : ""}
                , then save to resolve the exact set.
              </>
            )}
          </p>

          {previewCount !== null && sampleWallets.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {sampleWallets.map((w) => (
                <li key={w.address} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold uppercase text-primary">
                    {(w.ens ?? w.address).slice(0, 2)}
                  </span>
                  {w.ens ? (
                    <span className="shrink-0 truncate font-medium text-foreground">
                      {w.ens}
                    </span>
                  ) : null}
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {truncateMiddle(w.address)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyWallet(w.address)}
                    aria-label="Copy wallet address"
                    className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copiedWallet === w.address ? (
                      <CheckIcon
                        className="h-3.5 w-3.5 text-emerald-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <ClipboardDocumentIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => campaignFromSegmentMutation.mutate()}
            disabled={campaignFromSegmentMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
          >
            <MegaphoneIcon aria-hidden="true" className="h-4 w-4" />
            {campaignFromSegmentMutation.isPending
              ? "Creating…"
              : "Create campaign from segment"}
          </button>
        </div>

        <div>
          <div className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Saved segments
          </div>
          <div className="mt-3 space-y-2">
            {segmentsQuery.isLoading ? (
              <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : savedSegments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No saved segments yet.
              </div>
            ) : (
              savedSegments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() =>
                    router.push(`/intelligence/segments/detail/${segment.id}`)
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserGroupIcon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {segment.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {segment.description ?? "Rule-based segment"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                      {segment.size === null || segment.size === undefined
                        ? "-"
                        : segment.size.toLocaleString()}
                    </span>
                    {segment.updatedAt ? (
                      <span className="block text-[11px] text-muted-foreground">
                        synced{" "}
                        {formatRelativeTime(segment.updatedAt) ?? "recently"}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SegmentsView;
