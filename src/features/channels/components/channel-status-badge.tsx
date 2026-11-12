import type { ChannelReadinessStatus } from "../types/channel";
import { Badge } from "@/shared/components/ui/badge";

const STATUS: Record<ChannelReadinessStatus, { label: string; cls: string }> = {
  connected: {
    label: "Connected",
    cls: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    label: "Waiting",
    cls: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  none: { label: "Not set up", cls: "text-muted-foreground" },
};

/** Whether a channel can send right now, as one word. */
export function ChannelStatusBadge({
  status,
}: {
  status: ChannelReadinessStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS[status].cls}>
      {STATUS[status].label}
    </Badge>
  );
}
