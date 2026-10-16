"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CampaignFormData } from "../../validations";

/**
 * Discord content step. A Discord broadcast is a single plain-text message
 * posted ONCE to a server channel through the org's own bot - not a per-contact
 * send - so it asks for the message plus the target channel id. Persisted to
 * `channelsContent.discord.{text,channelId}`.
 */
export function DiscordMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("discordText") ?? "";
  const channelId = form.watch("discordChannelId") ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400"
        />
        <div className="text-sm text-muted-foreground">
          Posted once to a Discord channel through your connected bot. Connect a
          bot in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first, and invite it to your server.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="discord-channel">Channel ID</Label>
        <Input
          id="discord-channel"
          inputMode="numeric"
          placeholder="e.g. 112233445566778899"
          value={channelId}
          onChange={(e) =>
            form.setValue("discordChannelId", e.target.value, {
              shouldDirty: true,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Enable Developer Mode in Discord, then right-click the channel → Copy
          Channel ID. The bot must be a member of that server.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="discord-text">Message</Label>
        <Textarea
          id="discord-text"
          rows={6}
          placeholder="Write your Discord message…"
          value={text}
          onChange={(e) =>
            form.setValue("discordText", e.target.value, {
              shouldDirty: true,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          {text.trim().length === 0
            ? "Plain text. Discord markdown is supported."
            : `${text.length} character${text.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}
