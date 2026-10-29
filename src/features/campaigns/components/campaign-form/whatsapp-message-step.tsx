"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CampaignFormData } from "../../validations";

// Common WhatsApp template languages; the template itself is created + approved
// in the WhatsApp Business account, so this is just which localisation to send.
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "es", label: "Spanish" },
  { code: "pt_BR", label: "Portuguese (BR)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
];

/**
 * WhatsApp content step. WhatsApp requires a PRE-APPROVED message template (not
 * free text), sent per-contact to wallets with a bound WhatsApp number. This
 * collects the approved template name + the language to send. Persisted to
 * `channelsContent.whatsapp.{templateName,languageCode}`.
 */
export function WhatsAppMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const templateName = form.watch("whatsappTemplateName") ?? "";
  const languageCode = form.watch("whatsappLanguageCode") ?? "en_US";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <ChatBubbleLeftRightIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
        />
        <div className="text-sm text-muted-foreground">
          WhatsApp only sends pre-approved message templates. Create and approve
          the template in your WhatsApp Business account, then reference it by
          name here. Sent to every audience wallet with a linked WhatsApp
          number. Connect WhatsApp in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first.
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="whatsapp-template">Template name</Label>
        <Input
          id="whatsapp-template"
          placeholder="e.g. season_2_launch"
          value={templateName}
          onChange={(e) =>
            form.setValue("whatsappTemplateName", e.target.value, {
              shouldDirty: true,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          The exact name of an approved template in your WhatsApp Business
          account.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="whatsapp-language">Language</Label>
        <Select
          value={languageCode}
          onValueChange={(v) =>
            form.setValue("whatsappLanguageCode", v, { shouldDirty: true })
          }
        >
          <SelectTrigger id="whatsapp-language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Must match a language the template was approved in.
        </p>
      </div>
    </div>
  );
}
