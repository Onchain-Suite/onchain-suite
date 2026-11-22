import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import type { ApprovalBanner } from "../../utils/sending-approval";
import { Icon } from "@/shared/components/common/hugeicon";

const TONE = {
  pending: {
    icon: Clock01Icon,
    box: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  rejected: {
    icon: Alert02Icon,
    box: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  approved: {
    icon: CheckmarkCircle02Icon,
    box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
} as const;

/** The status line at the top of the sending-approval section. */
export function ApprovalStatusBanner({ banner }: { banner: ApprovalBanner }) {
  const t = TONE[banner.tone];
  return (
    <div
      role={banner.tone === "rejected" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", t.box)}
    >
      <Icon icon={t.icon} className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{banner.title}</p>
        <p className="opacity-90">{banner.body}</p>
      </div>
    </div>
  );
}
