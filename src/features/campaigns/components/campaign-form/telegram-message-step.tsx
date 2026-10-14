"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CampaignFormData } from "../../validations";

/**
 * Telegram content step. A Telegram message is a single plain-text body sent
 * through the org's own bot to every audience wallet that has a verified
 * Telegram chat id - no subject, sender identity, or layout. Persisted to
 * `channelsContent.telegram.text`.
 */
export function TelegramMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("telegramText") ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
        />
        <div className="text-sm text-muted-foreground">
          Sent through your connected Telegram bot to every audience wallet that
          has opted in. Connect a bot in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telegram-text">Message</Label>
        <Textarea
          id="telegram-text"
          rows={6}
          placeholder="Write your Telegram message…"
          value={text}
          onChange={(e) =>
            form.setValue("telegramText", e.target.value, {
              shouldDirty: true,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          {text.trim().length === 0
            ? "Plain text. Links are sent as-is."
            : `${text.length} character${text.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}
