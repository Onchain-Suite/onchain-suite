"use client";

import {
  MegaphoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/date";
import { isJsonObject } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";

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

const FIELDS: { value: string; label: string }[] = [
  { value: "wallet_balance", label: "Wallet balance" },
  { value: "last_active", label: "Last active" },
  { value: "transaction_count", label: "Transaction count" },
  { value: "email_opened", label: "Email opened" },
  { value: "token_held", label: "Token held" },
  { value: "gas_spent", label: "Gas spent" },
];

const OPERATORS: { value: string; label: string }[] = [
  { value: "gt", label: "is greater than" },
  { value: "lt", label: "is less than" },
  { value: "eq", label: "equals" },
  { value: "within", label: "is within" },
];

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
    newRule("email_opened", "within", "7 days"),
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
      return intelligenceService.createSegment({
        name: trimmed,
        rules: {
          operator: match,
          conditions: rules.map((r) => ({
            field: r.field,
            operator: r.operator,
            value: r.value,
          })),
        },
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
              onClick={() =>
                toast.info(
                  "Natural-language segment generation is coming soon — build with rules below for now."
                )
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <SparklesIcon aria-hidden="true" className="h-4 w-4" />
              Generate
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            The prompt becomes editable rules below — tweak anything by hand.
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
              <select
                value={rule.field}
                onChange={(e) => updateRule(rule.id, "field", e.target.value)}
                className="min-w-36 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={rule.operator}
                onChange={(e) =>
                  updateRule(rule.id, "operator", e.target.value)
                }
                className="w-36 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={rule.value}
                onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                placeholder="Value"
                className="min-w-24 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground outline-none"
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
            — wallets qualify without their exact values ever being exposed.
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
            {savedSegments.length > 0 ? "—" : "—"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Matching wallets are computed when you save. Refine your rules
            {rules.length > 0
              ? ` (${rules.length} rule${rules.length === 1 ? "" : "s"}, match ${match === "AND" ? "all" : "any"})`
              : ""}
            , then save to resolve the exact set.
          </p>
          <button
            type="button"
            onClick={() =>
              toast.info("Save the segment, then create a campaign from it.")
            }
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <MegaphoneIcon aria-hidden="true" className="h-4 w-4" />
            Create campaign from segment
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
                      {segment.description ??
                        (segment.updatedAt
                          ? `synced ${formatRelativeTime(segment.updatedAt) ?? "recently"}`
                          : "rule segment")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                      {segment.size === null || segment.size === undefined
                        ? "—"
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
