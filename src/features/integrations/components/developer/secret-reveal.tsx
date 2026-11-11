import { SecurityCheckIcon } from "@hugeicons/core-free-icons";

import { CopyButton } from "@/components/common/copy-button";

import { Icon } from "@/shared/components/common/hugeicon";

/** One-time reveal-and-copy panel for a `token` / `whsec_…` secret. */
export function SecretReveal({
  value,
  helper,
}: {
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Icon
          icon={SecurityCheckIcon}
          className="size-4 shrink-0 text-primary"
        />
        Copy this now - you will not see it again.
      </p>
      {/* Wrap the full secret (break-all) rather than truncating it, so the
          whole one-time value is visible on any width. Copy stays pinned to
          the top-right as the code grows to multiple lines. */}
      <div className="mt-2 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md bg-background px-2 py-1.5 font-mono text-xs leading-5 text-foreground ring-1 ring-border">
          {value}
        </code>
        <CopyButton value={value} label="Copy secret" />
      </div>
      {helper ? (
        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
