"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Toggle } from "./step-panel/panel-ui";
import { automationSunsetService } from "@/features/automation/automation-sunset.service";
import {
  UNENGAGED_EXPLANATION,
  UnengagedConfirmDialog,
} from "@/shared/components/common/unengaged-contacts";

/**
 * "Include unengaged contacts" for an automation's email steps.
 *
 * Saved straight away through `PUT /automations/:id/settings/sunset` and
 * mirrored into the builder's `settings.sunset`, because the builder saves
 * the whole settings object: without the mirror, the next graph save would
 * write the settings it loaded and undo the switch. A new (unsaved)
 * automation has no id yet, so it only writes `settings.sunset` and the first
 * save carries it.
 */
export function UnengagedSetting({
  automationId,
  settings,
  onSettingsChange,
}: {
  /** Undefined until the automation exists on the server. */
  automationId?: string;
  settings: Record<string, unknown>;
  onSettingsChange: (next: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const key = ["automations", automationId, "settings", "sunset"];

  const query = useQuery({
    queryKey: key,
    queryFn: () => automationSunsetService.get(automationId ?? ""),
    enabled: Boolean(automationId),
    retry: false,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (sunset: boolean) =>
      automationSunsetService.set(automationId ?? "", sunset),
    onSuccess: (res) => {
      qc.setQueryData(key, res);
      onSettingsChange({ ...settings, sunset: res.sunset });
    },
    onError: () => {
      toast.error("Couldn't save that setting. Try again.");
    },
  });

  // Server value first, then what the graph says, then the default (skip them).
  const sunset =
    query.data?.sunset ??
    (typeof settings.sunset === "boolean" ? settings.sunset : true);
  const include = !sunset;

  const apply = (nextInclude: boolean) => {
    const nextSunset = !nextInclude;
    if (automationId) mutation.mutate(nextSunset);
    else onSettingsChange({ ...settings, sunset: nextSunset });
  };

  return (
    <div>
      <Toggle
        label="Include unengaged contacts"
        checked={include}
        onChange={(v) => {
          if (mutation.isPending) return;
          if (v) setConfirmOpen(true);
          else apply(false);
        }}
      />
      <p className="abp-hint">{UNENGAGED_EXPLANATION}</p>
      {include ? (
        <p className="abp-warn">
          On: this automation emails unengaged contacts too.
        </p>
      ) : null}
      <UnengagedConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          apply(true);
        }}
      />
    </div>
  );
}
