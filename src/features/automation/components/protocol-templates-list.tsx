"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
  type ProtocolTemplate,
  protocolTemplateFamilies,
  type ProtocolTemplateFamily,
  protocolTemplates,
} from "@/features/automation/data/protocol-templates";

interface ProtocolTemplatesListProps {
  onApply: (template: ProtocolTemplate) => void;
  applyingId?: string | null;
}

// Per-family accent - thin accents only (dot, active chip), never a fill
// behind icons. Literal classes keep Tailwind's purge happy.
const ACCENT: Record<
  ProtocolTemplateFamily,
  { dot: string; chip: string; ring: string }
> = {
  "whale-ltv": {
    dot: "bg-sky-500",
    chip: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    ring: "hover:border-sky-500/50",
  },
  "nft-airdrop": {
    dot: "bg-violet-500",
    chip: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    ring: "hover:border-violet-500/50",
  },
  "churn-winback": {
    dot: "bg-amber-500",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "hover:border-amber-500/50",
  },
  "bridge-onboarding": {
    dot: "bg-emerald-500",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    ring: "hover:border-emerald-500/50",
  },
};

/**
 * What the recipe cannot decide for you.
 *
 * A recipe is a head start, not a finished automation: it cannot know which
 * contract you watch or which segment you built. Saying so on the CARD means
 * the user learns it before clicking, rather than meeting an empty required
 * field in the builder and wondering whether the template failed.
 */
const NEEDS_LABEL: Record<string, string> = {
  contract: "contract",
  chain: "chain",
  segment: "segment",
  amount: "amount",
};

const templateNeeds = (template: ProtocolTemplate): string[] => {
  const trigger = template.steps.find((s) => s.kind === "trigger");
  if (trigger?.kind !== "trigger") return [];
  return (trigger.requires ?? []).map((r) => NEEDS_LABEL[r] ?? r);
};

const stepSummary = (template: ProtocolTemplate) => {
  const counts = { email: 0, wait: 0, branch: 0 };
  const walk = (steps: ProtocolTemplate["steps"]) => {
    for (const s of steps) {
      if (s.kind === "email") counts.email += 1;
      else if (s.kind === "wait") counts.wait += 1;
      else if (s.kind === "branch") {
        counts.branch += 1;
        walk(s.yes);
        walk(s.no);
      }
    }
  };
  walk(template.steps);
  const parts: string[] = [];
  if (counts.email)
    parts.push(`${counts.email} email${counts.email > 1 ? "s" : ""}`);
  if (counts.wait)
    parts.push(`${counts.wait} wait${counts.wait > 1 ? "s" : ""}`);
  if (counts.branch) parts.push(`${counts.branch} branch`);
  return parts.join(" · ");
};

function TemplateCard({
  template,
  isApplying,
  onApply,
}: {
  template: ProtocolTemplate;
  isApplying: boolean;
  onApply: (template: ProtocolTemplate) => void;
}) {
  const accent = ACCENT[template.family];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent.ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xl leading-none" aria-hidden="true">
          {template.icon}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          ~{template.estimatedReach.toLocaleString()}
        </span>
      </div>
      <h4 className="mt-2.5 text-sm font-semibold leading-snug text-foreground">
        {template.name}
      </h4>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {template.description}
      </p>
      {templateNeeds(template).length ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
          You&apos;ll pick the {templateNeeds(template).join(" and ")} after
          applying.
        </p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
          {stepSummary(template)}
        </span>
        <button
          type="button"
          disabled={isApplying}
          onClick={() => onApply(template)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {isApplying ? (
            <>
              <ArrowPathIcon
                className="h-3 w-3 animate-spin"
                aria-hidden="true"
              />
              …
            </>
          ) : (
            <>
              Use
              <ArrowRightIcon
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export const ProtocolTemplatesList = ({
  onApply,
  applyingId,
}: ProtocolTemplatesListProps) => {
  const [active, setActive] = useState<ProtocolTemplateFamily | "all">("all");

  const families = useMemo(
    () =>
      protocolTemplateFamilies
        .map((f) => ({
          ...f,
          count: protocolTemplates.filter((t) => t.family === f.id).length,
        }))
        .filter((f) => f.count > 0),
    []
  );

  const visible = useMemo(
    () =>
      active === "all"
        ? protocolTemplates
        : protocolTemplates.filter((t) => t.family === active),
    [active]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Protocol playbooks
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Onchain-native automations that work out of the box. Filter by goal,
          then pick one to build a ready-to-run flow.
        </p>
      </div>

      {/* filter / tag bar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive("all")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            active === "all"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <Squares2X2Icon className="h-3.5 w-3.5" aria-hidden="true" />
          All
          <span className="opacity-70">{protocolTemplates.length}</span>
        </button>
        {families.map((f) => {
          const accent = ACCENT[f.id];
          const isActive = active === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(f.id)}
              title={f.description}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? accent.chip
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
              {f.label}
              <span className="opacity-70">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* compact card grid */}
      <motion.div
        layout
        className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]"
      >
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isApplying={applyingId === template.id}
            onApply={onApply}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default ProtocolTemplatesList;
