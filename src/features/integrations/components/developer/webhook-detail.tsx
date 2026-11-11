"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";

import { CopyButton } from "@/components/common/copy-button";
import { Switch } from "@/components/ui/switch";

import { formatDate, formatRelativeTime } from "@/lib/date";

import type { WebhookEndpoint } from "../../contracts/developer";
import { SIGNATURE_HEADER } from "../../data/api-reference";
import { TOPIC_DESCRIPTIONS } from "../../data/webhook-topics";
import { ToneBadge } from "./tone-badge";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";

const LABEL =
  "text-[11.5px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase";

/** What one delivery looks like on the wire, for whoever writes the receiver. */
const DELIVERY_EXAMPLE = `POST <your endpoint>
Content-Type: application/json
X-OnChain-Event: contact.created
X-OnChain-Delivery: <delivery id>
X-OnChain-Signature: t=<unix>,v1=<signature>

{ "id": "<delivery id>", "type": "contact.created", "createdAt": "<ISO time>", "data": { … } }`;

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={LABEL}>{label}</dt>
      <dd className="min-w-0 text-[13px] text-(--text-primary)">{children}</dd>
    </div>
  );
}

function lastDelivery(hook: WebhookEndpoint): React.ReactNode {
  if (!hook.lastDeliveryAt) return "Nothing delivered yet";
  const when = formatRelativeTime(hook.lastDeliveryAt);
  // No status with a delivery time means the endpoint never answered.
  if (hook.lastDeliveryStatus === null) return `No answer, ${when}`;
  return (
    <span className="inline-flex items-center gap-2">
      <ToneBadge tone={hook.lastDeliveryStatus < 400 ? "success" : "error"}>
        {hook.lastDeliveryStatus}
      </ToneBadge>
      {when}
    </span>
  );
}

/**
 * One endpoint: its switch and actions on top, then what we know about its
 * deliveries, what it is subscribed to, and how to verify what arrives.
 */
export function WebhookDetail({
  hook,
  busy,
  onToggle,
  onResume,
  onTest,
  onEdit,
  onRemove,
}: {
  hook: WebhookEndpoint;
  /** A test or a removal is in flight for this endpoint. */
  busy: boolean;
  onToggle: (active: boolean) => void;
  onResume: () => void;
  onTest: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const failing = hook.status === "failing";
  return (
    <section
      aria-label="Endpoint"
      className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-(--border-default) bg-card lg:shrink"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-(--border-subtle) px-3.5 py-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <b className="font-mono text-[13px] font-semibold break-all text-(--text-primary)">
            {hook.url}
          </b>
          <small className="text-[11.5px] text-(--text-tertiary)">
            {hook.events.length > 0 ? hook.events.join(" · ") : "No topics"}
          </small>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <label className="mr-1 inline-flex items-center gap-2 text-[13px] text-(--text-secondary)">
            <Switch
              checked={hook.status !== "paused"}
              onCheckedChange={onToggle}
              aria-label="Active"
            />
            Active
          </label>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={busy || hook.status === "paused"}
            title={
              hook.status === "paused"
                ? "Turn the endpoint on to send it a test"
                : undefined
            }
            onClick={onTest}
          >
            <Icon icon={SentIcon} className="size-3.5" />
            Send test
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={onEdit}>
            <Icon icon={PencilEdit02Icon} className="size-3.5" />
            Edit
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            disabled={busy}
            aria-label="Remove endpoint"
            onClick={onRemove}
            className="text-(--text-tertiary) hover:text-destructive"
          >
            <Icon icon={Delete02Icon} className="size-4" />
          </Button>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 p-3.5 lg:overflow-y-auto">
        {failing ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--status-error-bg) px-3 py-2.5 text-[13px] text-(--status-error-text)"
          >
            <span>
              Deliveries stopped after repeated failures. Fix your endpoint,
              then resume: nothing is sent to it until you do.
            </span>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={onResume}
            >
              Resume deliveries
            </Button>
          </div>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Fact label="Last delivery">{lastDelivery(hook)}</Fact>
          <Fact label="Failed in a row">
            <span className="tabular-nums">{hook.failureCount}</span>
          </Fact>
          <Fact label="Signing secret">
            <code className="font-mono text-[12.5px]">
              {hook.secretHint ?? "whsec_••••"}
            </code>
          </Fact>
          <Fact label="Added">
            {hook.createdAt ? formatDate(hook.createdAt) : "Unknown"}
          </Fact>
        </dl>

        <div>
          <span className={LABEL}>Subscribed to</span>
          {hook.events.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-(--text-tertiary)">
              Nothing. Edit the endpoint to choose its topics.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {hook.events.map((id) => (
                <li
                  key={id}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px]"
                >
                  <code className="font-mono text-xs text-(--text-primary)">
                    {id}
                  </code>
                  {TOPIC_DESCRIPTIONS[id] ? (
                    <span className="text-(--text-tertiary)">
                      {TOPIC_DESCRIPTIONS[id]}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className={LABEL}>Verify every delivery</span>
            <CopyButton
              value={SIGNATURE_HEADER}
              label="Copy signature format"
            />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-(--tint-hover) px-3 py-2.5 font-mono text-xs leading-relaxed text-(--text-primary)">
            {DELIVERY_EXAMPLE}
          </pre>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-[18px] text-[12.5px] leading-relaxed text-(--text-tertiary)">
            <li>
              The signature is the HMAC-SHA256 of{" "}
              <code className="font-mono">{"<t>.<rawBody>"}</code> with the
              signing secret. Sign the raw request body: re-serialising the JSON
              reorders keys and the signature never matches.
            </li>
            <li>Compare signatures with a constant-time equality check.</li>
            <li>
              The delivery id is the same on every retry. Store it and skip any
              you have seen, so a delivery that arrives twice is handled once.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
