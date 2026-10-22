import { cn } from "@/lib/utils";

import {
  type LifecycleStage,
  stageMeta,
  type StageTone,
} from "../utils/lifecycle";

/**
 * Lifecycle stage pill (v2.7 audience migration, step 2). The single most
 * scannable thing about a contact row: a toned label from the derived stage.
 * Tones use subtle tints so a table of them reads at a glance without shouting.
 */

const TONE_CLASS: Record<StageTone, string> = {
  new: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export function StageBadge({
  stage,
  className,
}: {
  stage: LifecycleStage;
  className?: string;
}) {
  const meta = stageMeta(stage);
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[meta.tone],
        className
      )}
    >
      {meta.label}
    </span>
  );
}
