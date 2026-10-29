"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CampaignFormData } from "../../validations";

/**
 * Farcaster content step. A Farcaster campaign is a single public cast published
 * ONCE through the org's connected account - not a per-contact send - so it asks
 * only for the cast text. Persisted to `channelsContent.farcaster.text`.
 */
export function FarcasterMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("farcasterText") ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400"
        />
        <div className="text-sm text-muted-foreground">
          Published once as a public cast through your connected Farcaster
          account. Connect it in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="farcaster-text">Cast</Label>
        <Textarea
          id="farcaster-text"
          rows={6}
          placeholder="Write your cast…"
          value={text}
          onChange={(e) =>
            form.setValue("farcasterText", e.target.value, {
              shouldDirty: true,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          {text.trim().length === 0
            ? "Plain text. Links and mentions are sent as-is."
            : `${text.length} character${text.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}
