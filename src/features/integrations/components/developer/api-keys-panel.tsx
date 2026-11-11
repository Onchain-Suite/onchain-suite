"use client";

import { PlusSignIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CopyButton } from "@/components/common/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

import { formatRelativeTime } from "@/lib/date";

import type { DeveloperKey, KeyStatus } from "../../contracts/developer";
import { API_BASE_URL, AUTH_HEADER } from "../../data/api-reference";
import { DeveloperApiError, developerService } from "../../developer.service";
import { developerKeys } from "../../utils/developer";
import { CreateKeyDialog } from "./create-key-dialog";
import { RevokeKeyDialog } from "./revoke-key-dialog";
import { RollKeyDialog } from "./roll-key-dialog";
import { ToneBadge } from "./tone-badge";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";

const ROW =
  "rounded-lg border border-(--border-subtle) bg-card px-3 py-2.5 text-sm";

/** A value someone copies into their server config, shown whole. */
function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${ROW} flex items-center gap-3`}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11.5px] text-(--text-tertiary)">{label}</span>
        <code className="font-mono text-[12.5px] break-all text-(--text-primary)">
          {value}
        </code>
      </span>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
    </div>
  );
}

/**
 * Row state follows `status`, never `revokedAt` being set: a rolled key has a
 * future `revokedAt` and still serves traffic while it is "expiring".
 */
const STATUS: Record<
  Exclude<KeyStatus, "revoked">,
  { tone: "success" | "warning"; label: string }
> = {
  active: { tone: "success", label: "Active" },
  expiring: { tone: "warning", label: "Expiring" },
};

function KeyRow({
  keyRow,
  onRoll,
  onRevoke,
}: {
  keyRow: DeveloperKey & { status: Exclude<KeyStatus, "revoked"> };
  onRoll: (key: DeveloperKey) => void;
  onRevoke: (key: DeveloperKey) => void;
}) {
  const status = STATUS[keyRow.status];
  return (
    <li className={`${ROW} flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <b className="min-w-0 truncate font-medium text-(--text-primary)">
          {keyRow.name || "Unnamed key"}
        </b>
        <ToneBadge tone={keyRow.environment === "live" ? "info" : "neutral"}>
          {keyRow.environment === "live" ? "Live" : "Test"}
        </ToneBadge>
        <span className="ml-auto">
          <ToneBadge tone={status.tone} dot>
            {status.label}
          </ToneBadge>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--text-tertiary)">
        <code className="font-mono">{keyRow.prefix || "sk_••••"}</code>
        <span>
          {keyRow.scope === "read_only" ? "Read only" : "Read and write"}
        </span>
        <span>
          {keyRow.lastUsedAt
            ? `Used ${formatRelativeTime(keyRow.lastUsedAt)}`
            : "Never used"}
        </span>
        {keyRow.status === "expiring" && keyRow.revokedAt ? (
          <span className="text-(--status-warning-text)">
            Stops working {formatRelativeTime(keyRow.revokedAt)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => onRoll(keyRow)}
        >
          <Icon icon={RefreshIcon} className="size-3.5" />
          Roll
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => onRevoke(keyRow)}
          className="text-destructive hover:text-destructive"
        >
          Revoke
        </Button>
      </div>
    </li>
  );
}

/** The base URL, the auth header, and the workspace's secret keys. */
export function ApiKeysPanel() {
  const { organizationId } = useAccountOrg();
  const [creating, setCreating] = useState(false);
  const [rolling, setRolling] = useState<DeveloperKey | null>(null);
  const [revoking, setRevoking] = useState<DeveloperKey | null>(null);

  const keysQuery = useQuery({
    queryKey: developerKeys.keys(organizationId),
    enabled: Boolean(organizationId),
    queryFn: () => developerService.listKeys(organizationId ?? undefined),
  });

  const forbidden =
    keysQuery.error instanceof DeveloperApiError &&
    keysQuery.error.status === 403;

  // A revoked key is dead: it leaves the list instead of sitting there struck
  // through.
  const keys = (keysQuery.data ?? []).filter(
    (k): k is DeveloperKey & { status: Exclude<KeyStatus, "revoked"> } =>
      k.status !== "revoked"
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <ConfigRow label="Base URL" value={API_BASE_URL} />
        <ConfigRow label="Auth header" value={AUTH_HEADER} />
      </div>

      <section aria-labelledby="api-keys-heading">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3
            id="api-keys-heading"
            className="text-sm font-semibold text-(--text-primary)"
          >
            Secret keys
          </h3>
          <Button
            variant="outline"
            size="sm"
            disabled={forbidden}
            onClick={() => setCreating(true)}
          >
            <Icon icon={PlusSignIcon} className="mr-1 size-4" />
            Create key
          </Button>
        </div>

        {keysQuery.isPending ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-[92px] rounded-lg" />
          </div>
        ) : keysQuery.isError ? (
          <div className={`${ROW} flex flex-wrap items-center gap-3`}>
            {forbidden ? (
              <span className="text-(--text-secondary)">
                Only workspace owners and admins can manage API keys.
              </span>
            ) : (
              <>
                <span className="text-(--text-secondary)">
                  Couldn&apos;t load keys.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => keysQuery.refetch()}
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        ) : keys.length === 0 ? (
          <p className="text-[13px] text-(--text-tertiary)">
            No keys. Create one to call the API from your server.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {keys.map((key) => (
              <KeyRow
                key={key.id}
                keyRow={key}
                onRoll={setRolling}
                onRevoke={setRevoking}
              />
            ))}
          </ul>
        )}
      </section>

      <CreateKeyDialog open={creating} onOpenChange={setCreating} />
      <RollKeyDialog
        keyRow={rolling}
        onOpenChange={(open) => {
          if (!open) setRolling(null);
        }}
      />
      <RevokeKeyDialog
        keyRow={revoking}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
      />
    </div>
  );
}
