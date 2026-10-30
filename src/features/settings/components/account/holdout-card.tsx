"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "@/features/settings/components/settings-card";
import {
  type HoldoutPolicy,
  holdoutService,
  SUGGESTED_CAMPAIGN_PCT,
  SUGGESTED_GLOBAL_PCT,
} from "@/features/settings/holdout.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const HOLDOUT_QUERY_KEY = ["organization", "settings", "holdout"];

const pctIsValid = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100;
};

const fmtRotated = (iso: string): string | null => {
  const t = Date.parse(iso);
  if (Number.isNaN(t) || t <= 0) return null;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Org-wide holdout policy - the control groups used to measure campaign lift.
 *
 * `campaignPct` withholds a random slice of each campaign to measure that
 * campaign; the global holdout withholds a rotating slice of every send to
 * measure the whole programme. Held contacts are never messaged and never
 * billed. Owner/admin only to change.
 */
export function HoldoutCard() {
  const queryClient = useQueryClient();
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";

  const policyQuery = useQuery({
    queryKey: HOLDOUT_QUERY_KEY,
    queryFn: () => holdoutService.getSettings(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const policy = policyQuery.data;
  const [campaignDraft, setCampaignDraft] = useState("");
  const [globalDraft, setGlobalDraft] = useState("");
  const [globalEnabled, setGlobalEnabled] = useState(false);

  // Seed the form once the saved policy lands.
  useEffect(() => {
    if (!policy) return;
    setCampaignDraft(String(policy.campaignPct));
    setGlobalDraft(String(policy.globalPct));
    setGlobalEnabled(policy.globalEnabled);
  }, [policy]);

  const campaignValid = pctIsValid(campaignDraft);
  const globalValid = pctIsValid(globalDraft);

  const isDirty =
    policy !== undefined &&
    (Number(campaignDraft) !== policy.campaignPct ||
      Number(globalDraft) !== policy.globalPct ||
      globalEnabled !== policy.globalEnabled);

  const onSaved = async (next: HoldoutPolicy, message: string) => {
    queryClient.setQueryData(HOLDOUT_QUERY_KEY, next);
    // The launch estimate subtracts the holdout, so refresh campaign data.
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    toast.success(message);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      holdoutService.updateSettings({
        campaignPct: Number(campaignDraft),
        globalPct: Number(globalDraft),
        globalEnabled,
      }),
    onSuccess: (next) => onSaved(next, "Holdout policy saved."),
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't save the holdout policy."
      ),
  });

  const rotateMutation = useMutation({
    mutationFn: () => holdoutService.updateSettings({ rotateSeed: true }),
    onSuccess: (next) =>
      onSaved(next, "Holdout seed rotated - the global control reshuffles."),
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't rotate the seed."
      ),
  });

  const busy = saveMutation.isPending || rotateMutation.isPending;
  const campaignOff = policy?.campaignPct === 0 && !policy.globalEnabled;

  return (
    <SettingsCard
      title="Holdout & lift"
      description="Hold back a random control group to measure how much each campaign actually lifts conversions. Held contacts are never messaged or billed."
      action={
        policy ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {campaignOff ? "Off" : `${policy.campaignPct}% per campaign`}
          </span>
        ) : undefined
      }
    >
      {policyQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
          <Skeleton className="h-6 w-64 rounded-lg" />
        </div>
      ) : policyQuery.isError || !policy ? (
        <p className="text-sm text-amber-500">
          Couldn&apos;t load the holdout policy.{" "}
          <button
            type="button"
            onClick={() => policyQuery.refetch()}
            className="font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </p>
      ) : (
        <div className="space-y-5">
          <section className="space-y-2">
            <Label htmlFor="holdout-campaign-pct">
              Per-campaign control group
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="holdout-campaign-pct"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={campaignDraft}
                disabled={!canEdit || busy}
                onChange={(e) => setCampaignDraft(e.target.value)}
                className="h-10 w-24 rounded-lg"
                aria-describedby="holdout-campaign-help"
              />
              <span className="text-sm text-muted-foreground">%</span>
              {canEdit && Number(campaignDraft) === 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() =>
                    setCampaignDraft(String(SUGGESTED_CAMPAIGN_PCT))
                  }
                >
                  Use {SUGGESTED_CAMPAIGN_PCT}% suggested
                </Button>
              ) : null}
            </div>
            <p
              id="holdout-campaign-help"
              className="text-xs text-muted-foreground"
            >
              Withheld at random from each campaign to measure its lift. 0 turns
              the holdout off. A campaign needs about{" "}
              {policy.singleCampaignFloor.toLocaleString()} eligible contacts to
              resolve a lift reliably.
            </p>
            {!campaignValid && campaignDraft.trim().length > 0 ? (
              <p className="text-xs text-destructive">
                Enter a number between 0 and 100.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border-t border-border/50 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label
                  htmlFor="holdout-global-enabled"
                  className="cursor-pointer text-sm font-medium"
                >
                  Programme-wide global control
                </Label>
                <p className="text-xs text-muted-foreground">
                  A rotating slice of every send, held back to measure your
                  whole programme over time - on top of each campaign&apos;s own
                  control.
                </p>
              </div>
              <Switch
                id="holdout-global-enabled"
                checked={globalEnabled}
                disabled={!canEdit || busy}
                onCheckedChange={setGlobalEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {globalEnabled ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="holdout-global-pct"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={globalDraft}
                  disabled={!canEdit || busy}
                  onChange={(e) => setGlobalDraft(e.target.value)}
                  className="h-10 w-24 rounded-lg"
                  aria-label="Global control percentage"
                />
                <span className="text-sm text-muted-foreground">%</span>
                {canEdit && Number(globalDraft) === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg"
                    disabled={busy}
                    onClick={() => setGlobalDraft(String(SUGGESTED_GLOBAL_PCT))}
                  >
                    Use {SUGGESTED_GLOBAL_PCT}% suggested
                  </Button>
                ) : null}
              </div>
            ) : null}
            {!globalValid && globalDraft.trim().length > 0 ? (
              <p className="text-xs text-destructive">
                Enter a number between 0 and 100.
              </p>
            ) : null}
            {canEdit ? (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() => rotateMutation.mutate()}
                >
                  {rotateMutation.isPending ? "Rotating…" : "Rotate seed"}
                </Button>
                {fmtRotated(policy.rotatedAt) ? (
                  <span className="text-xs text-muted-foreground">
                    Last rotated {fmtRotated(policy.rotatedAt)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Never rotated
                  </span>
                )}
              </div>
            ) : null}
          </section>

          {canEdit ? (
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-xl"
                disabled={!isDirty || !campaignValid || !globalValid || busy}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only owners and admins can change the holdout policy.
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

export default HoldoutCard;
