"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { extractEmailContent } from "@/lib/utils";

import { campaignsService } from "../../campaigns.service";
import type { CampaignFormData } from "../../validations";
import { EmailMessageForm } from "./email-message-form";
import { TemplateSelector } from "./template-selector";
import {
  extractTemplatePushContent,
  templatesService,
} from "@/features/templates/templates.service";

/**
 * Empty design document for the external email builder. Seeded via
 * INIT_EMAIL_BUILDER when creating a new template so the editor starts blank
 * instead of restoring the campaign's previously saved design.
 */
const BLANK_EDITOR_DOCUMENT = {
  root: {
    type: "EmailLayout",
    data: {
      backdropColor: "#F5F5F5",
      canvasColor: "#FFFFFF",
      textColor: "#262626",
      fontFamily: "MODERN_SANS",
      childrenIds: [],
    },
  },
};

/** URL-safe base64 (matches the editor page's decodeBase64Url). */
function toBase64Url(value: string): string {
  if (typeof window === "undefined") return "";
  try {
    const b64 = window.btoa(unescape(encodeURIComponent(value)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

export interface TemplateStepProps {
  form: UseFormReturn<CampaignFormData>;
  campaignId?: string;
  verifiedSenderIdentities: Array<{
    id: string;
    email: string;
    name: string;
    isDefault: boolean;
  }>;
  senderIdentitiesLoading: boolean;
  canSendEmail: boolean;
}

export function TemplateStep({
  form,
  campaignId,
  verifiedSenderIdentities,
  senderIdentitiesLoading,
}: TemplateStepProps) {
  const router = useRouter();
  // Guards against out-of-order writes when templates are selected in quick
  // succession — only the latest selection is applied to the campaign.
  const applyTemplateSeqRef = useRef(0);

  const normalizedCampaignId = useMemo(
    () => (campaignId && campaignId.trim().length > 0 ? campaignId.trim() : ""),
    [campaignId]
  );

  /**
   * The editor reads `?campaign=` and can render nothing without it — no id
   * means a dead "Missing campaign id." page. Previously the param was set
   * conditionally and we navigated anyway; refuse to leave instead, and say
   * why, so the user isn't dropped somewhere with no way forward.
   */
  const openEditor = useCallback(
    (params: URLSearchParams) => {
      if (!normalizedCampaignId) {
        toast.error(
          "Add a campaign name first — the editor needs a saved campaign to attach the design to."
        );
        return;
      }
      params.set("campaign", normalizedCampaignId);
      router.push(`/campaigns/editor?${params.toString()}`);
    },
    [normalizedCampaignId, router]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-balance">
            Message & Template
          </h2>
          <p className="text-base text-muted-foreground text-pretty">
            Craft your email and pick the template your audience will receive
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1.7fr)]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <EmailMessageForm
            form={form}
            verifiedSenderIdentities={verifiedSenderIdentities}
            senderIdentitiesLoading={senderIdentitiesLoading}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <TemplateSelector
            form={form}
            channel={
              form.watch("channel") === "in-app-push" ? "in-app-push" : "email"
            }
            onUseTemplate={async (templateId, templateName) => {
              const clean = templateId.trim();
              form.setValue("selectedTemplate", clean, { shouldDirty: true });
              let designB64 = "";
              if (normalizedCampaignId && clean) {
                try {
                  // Load the template's content so we can both apply it to the
                  // campaign AND seed the builder's editor content (otherwise the
                  // external editor opens blank).
                  const full = await templatesService.get(clean);
                  const content = extractEmailContent(full);
                  await campaignsService.setTemplate(normalizedCampaignId, {
                    templateId: clean,
                  });
                  await campaignsService
                    .editorSaved(normalizedCampaignId, {
                      html: content.html,
                      json: content.json,
                      textVersion: content.textVersion,
                      assets: content.assets,
                    })
                    .catch(() => undefined);
                  if (content.json && typeof content.json === "object") {
                    const raw = JSON.stringify(content.json);
                    if (raw.length < 190_000) designB64 = toBase64Url(raw);
                  }
                } catch (e: unknown) {
                  const message =
                    e instanceof Error ? e.message : "Failed to apply template";
                  toast.error(message);
                }
              }
              const params = new URLSearchParams();
              params.set(
                "returnTo",
                normalizedCampaignId
                  ? `/campaigns/new?campaign=${encodeURIComponent(normalizedCampaignId)}&step=2`
                  : "/campaigns/new?step=2"
              );
              if (clean) params.set("template", clean);
              if (templateName) params.set("templateName", templateName);
              const subject = form.getValues("emailSubject");
              if (subject) params.set("subject", subject);
              if (designB64) params.set("initialJsonB64", designB64);
              if (form.getValues("channel") === "in-app-push") {
                params.set("channel", "in-app-push");
              }
              openEditor(params);
            }}
            onEditTemplate={(templateId, templateName) => {
              const params = new URLSearchParams();
              const returnTo = normalizedCampaignId
                ? `/campaigns/new?campaign=${encodeURIComponent(normalizedCampaignId)}&step=2`
                : "/campaigns/new?step=2";
              params.set("returnTo", returnTo);
              params.set("template", templateId);
              if (templateName) params.set("templateName", templateName);
              const subject = form.getValues("emailSubject");
              if (subject) params.set("subject", subject);
              if (form.getValues("channel") === "in-app-push") {
                params.set("channel", "in-app-push");
              }
              openEditor(params);
            }}
            onSelectTemplate={async (templateId) => {
              if (!normalizedCampaignId) {
                // Was a silent no-op: the click appeared to do nothing at all.
                toast.error(
                  "Add a campaign name first — the template needs a saved campaign to apply to."
                );
                return;
              }
              const clean = templateId.trim();
              if (!clean) return;
              const seq = ++applyTemplateSeqRef.current;
              try {
                // Selecting a template must also replace the campaign's
                // stored content — setTemplate alone leaves the previously
                // saved design in place, so preview/send would still use the
                // old message.
                const full = await templatesService.get(clean);
                if (applyTemplateSeqRef.current !== seq) return;
                await campaignsService.setTemplate(normalizedCampaignId, {
                  templateId: clean,
                });
                if (applyTemplateSeqRef.current !== seq) return;

                // In-app templates carry { title, body, cta } instead of
                // html — save them as the campaign's push variant
                // (channelsContent.inapp), which send-inapp consumes.
                const push = extractTemplatePushContent(full);
                if (push) {
                  await campaignsService.setPushContent(
                    normalizedCampaignId,
                    push
                  );
                  return;
                }

                const content = extractEmailContent(full);
                await campaignsService.editorSaved(normalizedCampaignId, {
                  html: content.html,
                  json: content.json,
                  textVersion: content.textVersion,
                  assets: content.assets,
                });
              } catch (e: unknown) {
                const message =
                  e instanceof Error ? e.message : "Failed to apply template";
                toast.error(message);
              }
            }}
            onCreateEditor={(opts) => {
              const params = new URLSearchParams();
              const returnTo = normalizedCampaignId
                ? `/campaigns/new?campaign=${encodeURIComponent(normalizedCampaignId)}&step=2`
                : "/campaigns/new?step=2";
              params.set("returnTo", returnTo);

              const subject = form.getValues("emailSubject");
              const senderName = form.getValues("senderName");
              const senderEmail = form.getValues("senderEmail");

              if (subject) params.set("subject", subject);
              if (senderName) params.set("senderName", senderName);
              if (senderEmail) params.set("senderEmail", senderEmail);
              if (opts?.templateName)
                params.set("templateName", opts.templateName);

              const blankB64 = toBase64Url(
                JSON.stringify(BLANK_EDITOR_DOCUMENT)
              );
              if (blankB64) params.set("initialJsonB64", blankB64);

              if (form.getValues("channel") === "in-app-push") {
                params.set("channel", "in-app-push");
              }
              openEditor(params);
            }}
          />
        </div>
      </div>
    </div>
  );
}
