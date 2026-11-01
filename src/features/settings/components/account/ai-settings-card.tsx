"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "@/features/settings/components/settings-card";
import {
  type AiSettings,
  messagingSettingsService,
} from "@/features/settings/messaging-settings.service";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const AI_QUERY_KEY = ["organization", "settings", "ai"];

/**
 * Intelligence/AI settings. Whether Intelligence answers questions with an AI
 * model, and who may ask. A question becomes a query written by an AI model
 * that sees the question and the names of your tables and lists, never the rows;
 * the query runs inside the workspace and is checked before it runs. Turned off,
 * segments still work by hand. Owner/admin only to change.
 */
export function AiSettingsCard() {
  const queryClient = useQueryClient();
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";

  const settingsQuery = useQuery({
    queryKey: AI_QUERY_KEY,
    queryFn: () => messagingSettingsService.getAi(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const settings = settingsQuery.data;
  const [enabled, setEnabled] = useState(true);
  const [who, setWho] = useState<AiSettings["who"]>("everyone");

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setWho(settings.who);
  }, [settings]);

  const isDirty =
    settings !== undefined &&
    (enabled !== settings.enabled || who !== settings.who);

  const saveMutation = useMutation({
    mutationFn: () => messagingSettingsService.updateAi({ enabled, who }),
    onSuccess: (next) => {
      queryClient.setQueryData(AI_QUERY_KEY, next);
      toast.success("AI settings saved.");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't save the AI settings."
      ),
  });

  return (
    <SettingsCard
      title="Intelligence AI"
      description="Intelligence can turn a question into a query with an AI model. The model sees your question and the names of your tables and lists, never the rows."
      action={
        settings ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {settings.enabled ? "On" : "Off"}
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
          Couldn&apos;t load the AI settings.{" "}
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
                htmlFor="ai-enabled"
                className="cursor-pointer text-sm font-medium"
              >
                Let Intelligence answer questions with AI
              </Label>
              <p className="text-xs text-muted-foreground">
                Turned off, Intelligence still runs segments and saved queries
                by hand, and AI fields stop filling.
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={enabled}
              disabled={!canEdit || saveMutation.isPending}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {enabled ? (
            <div className="space-y-2 border-t border-border/50 pt-5">
              <Label htmlFor="ai-who">Who can ask</Label>
              <select
                id="ai-who"
                value={who}
                disabled={!canEdit || saveMutation.isPending}
                onChange={(e) => setWho(e.target.value as AiSettings["who"])}
                className="h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              >
                <option value="everyone">Everyone in the workspace</option>
                <option value="admins">Admins only</option>
              </select>
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
              Only owners and admins can change the AI settings.
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

export default AiSettingsCard;
