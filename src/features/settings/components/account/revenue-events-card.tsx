"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "../settings-card";
import { projectSettingsKey } from "./project-card";
import { useAccountOrg } from "./use-account-org";
import { connectionsService } from "@/features/integrations/connections.service";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import {
  DEFAULT_REVENUE_AMOUNT_FIELD,
  MAX_REVENUE_EVENTS,
  sanitizeRevenueEvents,
  validateRevenueEvents,
} from "@/features/settings/utils/project-value";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface Row {
  id: string;
  eventName: string;
  amountField: string;
}

const CATALOG_LIST_ID = "revenue-event-catalog";

/**
 * Project value: which custom events carry revenue. With the per-contract fee
 * rates on the Contracts card, this is what Estimated LTV measures; with
 * neither, a contact's LTV has no number rather than a made-up one.
 */
export function RevenueEventsCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const nextId = useRef(0);
  // null = showing what is saved; an array = unsaved edits.
  const [draft, setDraft] = useState<Row[] | null>(null);

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });
  // Same key and fetcher as the Integrations events tab, so they share a cache.
  const catalogQuery = useQuery({
    queryKey: ["events", "catalog", organizationId],
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () =>
      connectionsService.eventsCatalog(organizationId ?? undefined),
  });

  const settings = settingsQuery.data;
  const saved = useMemo<Row[]>(
    () =>
      (settings?.revenueEvents ?? []).map((e, i) => ({
        id: `saved-${i}`,
        eventName: e.eventName,
        amountField: e.amountField ?? "",
      })),
    [settings?.revenueEvents]
  );
  const rows = draft ?? saved;
  const issues = useMemo(() => validateRevenueEvents(rows), [rows]);
  const issueFor = (index: number, field: "eventName" | "amountField") =>
    issues.find((i) => i.index === index && i.field === field)?.message;
  const listIssue = issues.find((i) => i.field === "list")?.message;
  const catalogNames = useMemo(
    () => (catalogQuery.data?.events ?? []).map((e) => e.event),
    [catalogQuery.data]
  );

  const edit = (update: (current: Row[]) => Row[]) =>
    setDraft((current) => update(current ?? saved));

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!settings) throw new Error("Project settings not loaded yet");
      if (issues.length > 0) throw new Error("Fix the highlighted rows first");
      return projectSettingsService.saveProjectSettings(
        { ...settings, revenueEvents: sanitizeRevenueEvents(rows) },
        organizationId ?? undefined
      );
    },
    onSuccess: (next) => {
      queryClient.setQueryData(projectSettingsKey(organizationId), next);
      setDraft(null);
      toast.success("Revenue events saved");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to save revenue events"
      ),
  });

  const atLimit = rows.length >= MAX_REVENUE_EVENTS;

  return (
    <SettingsCard
      title="Revenue events"
      description="Custom events whose payload reports revenue in USD"
      action={
        <Button
          size="sm"
          variant="outline"
          disabled={!settings || atLimit}
          onClick={() =>
            edit((current) => [
              ...current,
              { id: `new-${nextId.current++}`, eventName: "", amountField: "" },
            ])
          }
        >
          <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
          Add event
        </Button>
      }
    >
      <div className="mb-4 space-y-1.5 rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
        <p>
          Estimated LTV counts what each contact is worth to your project from
          two sources: fees on transfers to your contracts (set a fee rate on
          the Contracts card) and revenue reported on the events listed here.
        </p>
        <p>
          Until you set at least one of them, contacts show no LTV number. Fee
          rate changes apply at each wallet&apos;s next enrichment; revenue
          events apply immediately.
        </p>
        <p>
          Solana fees cannot be measured from on-chain data, so Solana projects
          should use revenue events. Swaps through an aggregator only count if
          the router contract is listed too.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-6 text-center text-sm text-muted-foreground">
          No revenue events. Add one for each event you send with a USD amount,
          for example <code className="font-mono">trade_settled</code>.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const nameError = issueFor(index, "eventName");
            const fieldError = issueFor(index, "amountField");
            return (
              <li
                key={row.id}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
              >
                <div>
                  <Input
                    aria-label="Event name"
                    list={CATALOG_LIST_ID}
                    value={row.eventName}
                    placeholder="Event name"
                    aria-invalid={nameError ? true : undefined}
                    onChange={(e) =>
                      edit((current) =>
                        current.map((r) =>
                          r.id === row.id
                            ? { ...r, eventName: e.target.value }
                            : r
                        )
                      )
                    }
                  />
                  {nameError ? (
                    <p className="mt-1 text-xs text-destructive">{nameError}</p>
                  ) : null}
                </div>
                <div>
                  <Input
                    aria-label="Amount field"
                    value={row.amountField}
                    placeholder={DEFAULT_REVENUE_AMOUNT_FIELD}
                    aria-invalid={fieldError ? true : undefined}
                    onChange={(e) =>
                      edit((current) =>
                        current.map((r) =>
                          r.id === row.id
                            ? { ...r, amountField: e.target.value }
                            : r
                        )
                      )
                    }
                  />
                  {fieldError ? (
                    <p className="mt-1 text-xs text-destructive">
                      {fieldError}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${row.eventName || "event"}`}
                  onClick={() =>
                    edit((current) => current.filter((r) => r.id !== row.id))
                  }
                >
                  <Icon icon={Delete02Icon} className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <datalist id={CATALOG_LIST_ID}>
        {catalogNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <p className="mt-3 text-xs text-muted-foreground">
        Amount field is a top-level key of the event payload holding the USD
        amount. Empty means <code className="font-mono">revenue_usd</code>. Up
        to {MAX_REVENUE_EVENTS} events.
      </p>
      {listIssue ? (
        <p className="mt-1 text-xs text-destructive">{listIssue}</p>
      ) : null}

      {draft ? (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            disabled={saveMutation.isPending || issues.length > 0}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save revenue events"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Discard changes
          </Button>
        </div>
      ) : null}
    </SettingsCard>
  );
}

export default RevenueEventsCard;
