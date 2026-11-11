"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import type { WebhookEndpoint } from "../../contracts/developer";
import { DeveloperApiError } from "../../developer.service";
import { useWebhookActions, useWebhooks } from "../../hooks/use-webhooks";
import { webhookHealth, webhookSummary } from "../../utils/developer";
import { EndpointDialog } from "./endpoint-dialog";
import { RemoveEndpointDialog } from "./remove-endpoint-dialog";
import { ToneBadge } from "./tone-badge";
import { WebhookDetail } from "./webhook-detail";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";

const EMPTY = "text-[13px] leading-relaxed text-(--text-tertiary)";

/**
 * Outbound webhooks (2.7): endpoints down the left, the selected endpoint
 * beside them. Each side scrolls on its own, so the tab fits the window;
 * narrower than lg they stack and the tab scrolls as one.
 */
export function WebhooksPanel() {
  const query = useWebhooks();
  const { test, setStatus, remove } = useWebhookActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookEndpoint | "new" | null>(null);
  const [removing, setRemoving] = useState<WebhookEndpoint | null>(null);

  const hooks = query.data ?? [];
  // The first endpoint is open until another is picked, and again if the
  // picked one is removed.
  const current = hooks.find((w) => w.id === selectedId) ?? hooks[0] ?? null;
  const forbidden =
    query.error instanceof DeveloperApiError && query.error.status === 403;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[18px] md:overflow-y-auto lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible">
      <aside className="flex min-h-0 shrink-0 flex-col gap-2 lg:shrink lg:overflow-y-auto lg:pr-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-(--text-primary)">
            Endpoints
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={forbidden}
            onClick={() => setForm("new")}
          >
            <Icon icon={PlusSignIcon} className="mr-1 size-4" />
            Add endpoint
          </Button>
        </div>

        {query.isPending ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <Skeleton className="h-[78px] rounded-lg" />
            <Skeleton className="h-[78px] rounded-lg" />
          </div>
        ) : query.isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-(--border-subtle) bg-card px-3 py-2.5 text-[13px] text-(--text-secondary)">
            {forbidden ? (
              "Only workspace owners and admins can manage webhooks."
            ) : (
              <>
                Couldn&apos;t load endpoints.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => query.refetch()}
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        ) : hooks.length === 0 ? (
          <p className={EMPTY}>
            No endpoints yet. Add one to hear about deliveries, new contacts and
            unsubscribes as they happen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hooks.map((w) => {
              const health = webhookHealth(w);
              const on = current?.id === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => setSelectedId(w.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                      on
                        ? "border-primary"
                        : "border-(--border-subtle) hover:border-(--border-default)"
                    )}
                  >
                    <b className="max-w-full truncate font-mono text-[12.5px] font-medium text-(--text-primary)">
                      {w.url}
                    </b>
                    <span className="text-[11.5px] text-(--text-tertiary)">
                      {webhookSummary(w)}
                    </span>
                    <ToneBadge tone={health.tone} dot>
                      {health.text}
                    </ToneBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className={cn(EMPTY, "mt-1 text-xs")}>
          Each delivery is signed and carries a delivery id. A failed one is
          retried with growing gaps for about a day, then the endpoint is marked
          failing and deliveries stop until you resume it.
        </p>
      </aside>

      {current ? (
        <WebhookDetail
          hook={current}
          busy={test.isPending || remove.isPending}
          onToggle={(active) =>
            setStatus.mutate({
              id: current.id,
              status: active ? "active" : "paused",
            })
          }
          onResume={() =>
            setStatus.mutate({ id: current.id, status: "active" })
          }
          onTest={() => test.mutate(current.id)}
          onEdit={() => setForm(current)}
          onRemove={() => setRemoving(current)}
        />
      ) : (
        <section
          aria-label="Endpoint"
          className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-(--border-default) p-6"
        >
          <p className={EMPTY}>
            {query.isPending
              ? "Loading endpoints…"
              : "Add an endpoint to see its deliveries and how to verify them."}
          </p>
        </section>
      )}

      <EndpointDialog
        target={form}
        onClose={() => setForm(null)}
        onCreated={setSelectedId}
      />
      <RemoveEndpointDialog
        webhook={removing}
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={(w) =>
          remove.mutate(w.id, {
            onSuccess: () => {
              setRemoving(null);
              setSelectedId(null);
            },
          })
        }
      />
    </div>
  );
}
