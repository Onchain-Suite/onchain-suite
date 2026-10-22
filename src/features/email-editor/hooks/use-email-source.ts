"use client";

import { useQuery } from "@tanstack/react-query";

import { extractEmailContent } from "@/lib/utils";

import { loadDesign, type LoadedDesign } from "../utils/load-design";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { templatesService } from "@/features/templates/templates.service";

export interface EmailSource {
  design: LoadedDesign;
  /** The campaign's preview text, shown as the preheader in Preview. */
  preheader: string;
}

const hasContent = (c: { html?: string; json?: unknown }) =>
  !!c.html?.trim() || (c.json !== null && c.json !== undefined);

/**
 * What the editor opens with. Editing a template opens that template's
 * design; otherwise the campaign's own. Either way, if the first source is
 * empty the other is tried, and the preview text loads alongside.
 */
export function useEmailSource({
  campaignId,
  templateId,
  orgId,
}: {
  campaignId: string;
  templateId?: string;
  orgId?: string;
}) {
  return useQuery<EmailSource>({
    queryKey: [
      "email-editor",
      "source",
      campaignId,
      templateId ?? "",
      orgId ?? "",
    ],
    enabled: campaignId.length > 0,
    // Opened once per visit: a refetch would replace what is being edited.
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const campaign = () =>
        campaignsService
          .getEditorContent(campaignId, orgId)
          .then(extractEmailContent);
      const template = () =>
        templateId
          ? templatesService.get(templateId, orgId).then(extractEmailContent)
          : Promise.resolve({});
      const [first, meta] = await Promise.all([
        templateId ? template() : campaign(),
        campaignsService.getContent(campaignId, orgId).catch(() => null),
      ]);
      const content = hasContent(first)
        ? first
        : await (templateId ? campaign() : template()).catch(() => ({}));
      return {
        design: loadDesign(content),
        preheader:
          typeof meta?.previewText === "string" ? meta.previewText : "",
      };
    },
  });
}
