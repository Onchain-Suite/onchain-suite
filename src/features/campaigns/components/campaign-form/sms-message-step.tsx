"use client";

import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { smsLinks, withTrackedLinks } from "../../sms/sms-content";
import { countSmsSegments } from "../../utils/sms-segments";
import type { CampaignFormData } from "../../validations";

/**
 * SMS content step. An SMS is a single plain-text body sent through the org's
 * own connected SMS account to every audience wallet with an opted-in number -
 * no subject, sender identity, or layout. Persisted to `channelsContent.sms.body`,
 * with `trackLinks` when the sender turns on click tracking.
 */
export function SmsMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("smsBody") ?? "";
  // Billed per segment; the encoding the text forces decides segment size.
  const { encoding, segments } = countSmsSegments(text);
  const trackLinks = form.watch("smsTrackLinks") === true;
  const links = smsLinks(text);
  // Tracked links are longer, so a text can cost more segments once tracked.
  const tracked = countSmsSegments(withTrackedLinks(text)).segments;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <ChatBubbleLeftEllipsisIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
        />
        <div className="text-sm text-muted-foreground">
          Sent through your connected SMS account to every audience wallet with
          an opted-in number. Connect a sender in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations → Channels
          </span>{" "}
          first. Recipients who reply STOP are unsubscribed automatically.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sms-body">Message</Label>
        <Textarea
          id="sms-body"
          rows={5}
          placeholder="Write your SMS…"
          value={text}
          onChange={(e) =>
            form.setValue("smsBody", e.target.value, { shouldDirty: true })
          }
        />
        <p className="text-xs text-muted-foreground">
          {text.trim().length === 0
            ? "Plain text."
            : `${text.length} character${text.length === 1 ? "" : "s"} · ${segments} segment${segments === 1 ? "" : "s"}${encoding === "UCS-2" ? " · Unicode: 70 per segment, 67 when split" : ""}`}
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor="sms-track-links">Track link clicks</Label>
          <p className="text-xs text-muted-foreground">
            {trackLinks && links.length > 0 && tracked > segments
              ? `Tracked links are longer: this text goes from ${segments} to about ${tracked} segments per recipient, billed per segment.`
              : "Each link becomes a short redirect that counts who clicked. Tracked links are about 80 characters, which can add a segment per recipient."}
          </p>
        </div>
        <Switch
          id="sms-track-links"
          checked={trackLinks}
          onCheckedChange={(v) =>
            form.setValue("smsTrackLinks", v === true, { shouldDirty: true })
          }
        />
      </div>
    </div>
  );
}
