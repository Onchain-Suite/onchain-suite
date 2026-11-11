import { SourceCodeIcon } from "@hugeicons/core-free-icons";

import { ApiKeysPanel } from "./api-keys-panel";
import { ApiReference } from "./api-reference";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * The API tab (2.7): keys on the left, the reference beside them. The two are
 * read together, you pick a key and then make a call with it, and side by
 * side the tab fits the window: each column scrolls on its own. Narrower than
 * lg they stack and the tab scrolls as one.
 */
export function ApiTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[18px] md:overflow-y-auto lg:grid lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible">
      <div className="flex min-h-0 shrink-0 flex-col gap-5 lg:shrink lg:overflow-y-auto lg:pr-1">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon icon={SourceCodeIcon} className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-[-0.2px] text-(--text-primary)">
              API
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-(--text-tertiary)">
              Identify wallets, send events, read contacts and send messages
              from your own server. Included on every plan.
            </p>
          </div>
        </div>
        <ApiKeysPanel />
      </div>
      <ApiReference />
    </div>
  );
}
