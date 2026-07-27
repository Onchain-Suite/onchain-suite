"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import {
  SMART_SENDING_MAX_HOURS,
  SMART_SENDING_MIN_HOURS,
  smartSendingService,
} from "@/features/settings/smart-sending.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const hoursLabel = (hours: number) => `${hours}h`;

/**
 * Org-wide Smart Sending settings — the "account settings" destination the
 * campaign builder's Smart Sending copy points at.
 *
 * The window set here applies to every campaign that doesn't override it, at
 * send time and in the recipient estimate alike.
 */
export function SmartSendingCard() {
  const queryClient = useQueryClient();
  const { role } = useMyOrgRole();
  // Writes are OWNER/ADMIN only (the backend enforces it); everyone can read.
  const canEdit = role === "OWNER" || role === "ADMIN";

  const settingsQuery = useQuery({
    queryKey: ["organization", "settings", "smart-sending"],
    queryFn: () => smartSendingService.getSettings(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const settings = settingsQuery.data;
  const [windowDraft, setWindowDraft] = useState("");
  const [enabledByDefault, setEnabledByDefault] = useState(false);

  // Seed the form once the saved settings land.
  useEffect(() => {
    if (!settings) return;
    setWindowDraft(String(settings.windowHours));
    setEnabledByDefault(settings.enabledByDefault);
  }, [settings]);

  const parsedWindow = Number(windowDraft);
  const windowIsValid =
    Number.isInteger(parsedWindow) &&
    parsedWindow >= SMART_SENDING_MIN_HOURS &&
    parsedWindow <= SMART_SENDING_MAX_HOURS;

  const isDirty =
    settings !== undefined &&
    (parsedWindow !== settings.windowHours ||
      enabledByDefault !== settings.enabledByDefault);

  const saveMutation = useMutation({
    mutationFn: () =>
      smartSendingService.updateSettings({
        windowHours: parsedWindow,
        enabledByDefault,
      }),
    onSuccess: async (next) => {
      queryClient.setQueryData(
        ["organization", "settings", "smart-sending"],
        next
      );
      // The recipient estimate resolves the same window, so refresh it.
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(
        `Smart Sending window set to ${hoursLabel(next.windowHours)}.`
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save Smart Sending."
      );
    },
  });

  const resetToDefault = () => {
    if (!settings) return;
    setWindowDraft(String(settings.defaultWindowHours));
  };

  return (
    <SettingsSectionCard
      title="Smart Sending"
      description="Skip contacts who were messaged recently, so the same people aren't over-contacted."
      icon={<ClockIcon aria-hidden="true" className="h-5 w-5" />}
      badge={
        settings
          ? `${hoursLabel(settings.windowHours)}${
              settings.isCustomWindow ? "" : " (default)"
            }`
          : undefined
      }
    >
      {settingsQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
          <Skeleton className="h-6 w-64 rounded-lg" />
        </div>
      ) : settingsQuery.isError ? (
        <p className="text-sm text-amber-500">
          Couldn&apos;t load Smart Sending settings.{" "}
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
          <section className="space-y-2">
            <Label htmlFor="smart-sending-window">Suppression window</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="smart-sending-window"
                type="number"
                inputMode="numeric"
                min={SMART_SENDING_MIN_HOURS}
                max={SMART_SENDING_MAX_HOURS}
                step={1}
                value={windowDraft}
                disabled={!canEdit || saveMutation.isPending}
                onChange={(e) => setWindowDraft(e.target.value)}
                className="h-10 w-28 rounded-lg"
                aria-describedby="smart-sending-window-help"
              />
              <span className="text-sm text-muted-foreground">hours</span>
              {settings?.isCustomWindow && canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  disabled={saveMutation.isPending}
                  onClick={resetToDefault}
                >
                  Reset to {hoursLabel(settings.defaultWindowHours)} default
                </Button>
              ) : null}
            </div>
            <p
              id="smart-sending-window-help"
              className="text-xs text-muted-foreground"
            >
              A campaign won&apos;t send to anyone who received a message from
              you within this window. Between {SMART_SENDING_MIN_HOURS} and{" "}
              {SMART_SENDING_MAX_HOURS} hours. A campaign can override this for
              itself.
            </p>
            {!windowIsValid && windowDraft.trim().length > 0 ? (
              <p className="text-xs text-destructive">
                Enter a whole number between {SMART_SENDING_MIN_HOURS} and{" "}
                {SMART_SENDING_MAX_HOURS}.
              </p>
            ) : null}
          </section>

          <section className="flex items-start justify-between gap-4 border-t border-border/50 pt-5">
            <div className="space-y-1">
              <Label
                htmlFor="smart-sending-default"
                className="cursor-pointer text-sm font-medium"
              >
                On by default for new campaigns
              </Label>
              <p className="text-xs text-muted-foreground">
                Applies to campaigns that never saved a tracking config. A
                campaign&apos;s own Smart Sending toggle always wins.
              </p>
            </div>
            <Switch
              id="smart-sending-default"
              checked={enabledByDefault}
              disabled={!canEdit || saveMutation.isPending}
              onCheckedChange={setEnabledByDefault}
              className="data-[state=checked]:bg-primary"
            />
          </section>

          {canEdit ? (
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-xl"
                disabled={!isDirty || !windowIsValid || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only owners and admins can change Smart Sending.
            </p>
          )}
        </div>
      )}
    </SettingsSectionCard>
  );
}

export default SmartSendingCard;
