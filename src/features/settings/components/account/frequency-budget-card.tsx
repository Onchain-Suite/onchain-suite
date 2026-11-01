"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "@/features/settings/components/settings-card";
import { messagingSettingsService } from "@/features/settings/messaging-settings.service";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const FREQUENCY_QUERY_KEY = ["organization", "settings", "frequency"];

const PER_WEEK = [1, 2, 3, 4, 5, 7, 10];
const GAP_HOURS = [2, 6, 10, 24, 48];

/**
 * The org-wide messaging frequency budget: a cap on how often one contact is
 * messaged, so campaigns and Loops together cannot over-send. Transactional
 * messages can be exempted. Owner/admin only to change.
 */
export function FrequencyBudgetCard() {
  const queryClient = useQueryClient();
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";

  const settingsQuery = useQuery({
    queryKey: FREQUENCY_QUERY_KEY,
    queryFn: () => messagingSettingsService.getFrequency(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const settings = settingsQuery.data;
  const [enabled, setEnabled] = useState(false);
  const [maxPerWeek, setMaxPerWeek] = useState(3);
  const [minHoursBetween, setMinHoursBetween] = useState(24);
  const [exemptTransactional, setExemptTransactional] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setMaxPerWeek(settings.maxPerWeek);
    setMinHoursBetween(settings.minHoursBetween);
    setExemptTransactional(settings.exemptTransactional);
  }, [settings]);

  const isDirty =
    settings !== undefined &&
    (enabled !== settings.enabled ||
      maxPerWeek !== settings.maxPerWeek ||
      minHoursBetween !== settings.minHoursBetween ||
      exemptTransactional !== settings.exemptTransactional);

  const saveMutation = useMutation({
    mutationFn: () =>
      messagingSettingsService.updateFrequency({
        enabled,
        maxPerWeek,
        minHoursBetween,
        exemptTransactional,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(FREQUENCY_QUERY_KEY, next);
      toast.success("Frequency budget saved.");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't save the frequency budget."
      ),
  });

  const selectCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60";

  return (
    <SettingsCard
      title="Frequency budget"
      description="Cap how often one contact is messaged, so campaigns and Loops together never over-send."
      action={
        settings ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {settings.enabled ? `${settings.maxPerWeek} / 7 days` : "Off"}
          </span>
        ) : undefined
      }
    >
      {settingsQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
      ) : settingsQuery.isError || !settings ? (
        <p className="text-sm text-amber-500">
          Couldn&apos;t load the frequency budget.{" "}
          <button
            type="button"
            onClick={() => settingsQuery.refetch()}
            className="font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="freq-enabled"
                className="cursor-pointer text-sm font-medium"
              >
                Enforce a frequency budget
              </Label>
              <p className="text-xs text-muted-foreground">
                When a send would push a contact over the budget, it is held
                back for them.
              </p>
            </div>
            <Switch
              id="freq-enabled"
              checked={enabled}
              disabled={!canEdit || saveMutation.isPending}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {enabled ? (
            <div className="space-y-4 border-t border-border/50 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="freq-max">
                    Messages per contact · 7 days
                  </Label>
                  <select
                    id="freq-max"
                    value={maxPerWeek}
                    disabled={!canEdit || saveMutation.isPending}
                    onChange={(e) => setMaxPerWeek(Number(e.target.value))}
                    className={selectCls}
                  >
                    {PER_WEEK.map((n) => (
                      <option key={n} value={n}>
                        {n} message{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freq-gap">Minimum gap between messages</Label>
                  <select
                    id="freq-gap"
                    value={minHoursBetween}
                    disabled={!canEdit || saveMutation.isPending}
                    onChange={(e) => setMinHoursBetween(Number(e.target.value))}
                    className={selectCls}
                  >
                    {GAP_HOURS.map((n) => (
                      <option key={n} value={n}>
                        {n} hours
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <Label
                  htmlFor="freq-exempt"
                  className="cursor-pointer text-sm font-medium"
                >
                  Exempt transactional messages
                </Label>
                <Switch
                  id="freq-exempt"
                  checked={exemptTransactional}
                  disabled={!canEdit || saveMutation.isPending}
                  onCheckedChange={setExemptTransactional}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-xl"
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only owners and admins can change the frequency budget.
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

export default FrequencyBudgetCard;
