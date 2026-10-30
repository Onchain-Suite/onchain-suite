"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CampaignFormData } from "../../validations";

const X_LIMIT = 280;

/**
 * X content step. An X campaign is a single broadcast post published ONCE to
 * the org's connected X account - not a per-contact send - so it asks only for
 * the post text. Persisted to `channelsContent.x.text`.
 */
export function XMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("xText") ?? "";
  const over = text.length > X_LIMIT;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-foreground"
        />
        <div className="text-sm text-muted-foreground">
          Published once to your connected X account. Connect an account in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="x-text">Post</Label>
        <Textarea
          id="x-text"
          rows={5}
          placeholder="What's happening?"
          value={text}
          onChange={(e) =>
            form.setValue("xText", e.target.value, { shouldDirty: true })
          }
        />
        <p
          className={
            over
              ? "text-xs text-red-600 dark:text-red-400"
              : "text-xs text-muted-foreground"
          }
        >
          {text.length} / {X_LIMIT} characters
          {over ? " - over the limit" : ""}
        </p>
      </div>
    </div>
  );
}
