import { Alert02Icon } from "@hugeicons/core-free-icons";

import { SETUP_GUIDES } from "../../data/setup-guides";
import type { ChannelId } from "../../types/channel";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * What to do to turn a channel on, in order, with the thing people get wrong
 * said up front. The same steps are what gets handed to someone else.
 */
export function SetupGuide({ channel }: { channel: ChannelId }) {
  const guide = SETUP_GUIDES[channel];
  return (
    <section
      aria-label="What to do"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">What to do</h3>
        <span className="text-xs text-muted-foreground">
          About {guide.minutes} min
        </span>
      </div>
      <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground marker:text-foreground">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Icon
          icon={Alert02Icon}
          className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
        />
        {guide.gotcha}
      </p>
    </section>
  );
}
