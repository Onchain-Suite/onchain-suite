"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { getSelectedOrganizationId } from "@/lib/utils";

import { useEmailAutosave } from "../hooks/use-email-autosave";
import { useEmailSource } from "../hooks/use-email-source";
import type { DocNode } from "../types/email-doc";
import { buildEmailPayload } from "../utils/email-payload";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { templatesService } from "@/features/templates/templates.service";
import { Button } from "@/shared/components/ui/button";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

const Spinner = () => (
  <Centered>
    <ArrowPathIcon
      className="h-5 w-5 animate-spin text-muted-foreground"
      aria-hidden="true"
    />
  </Centered>
);

/* Tiptap and ProseMirror are heavy and only this route needs them. */
const EmailEditor = dynamic(
  () => import("./editor/email-editor").then((m) => m.EmailEditor),
  {
    ssr: false,
    loading: Spinner,
  }
);

interface CampaignEmailEditorProps {
  campaignId: string;
  /** When editing a saved template: it opens, and Done updates it in place. */
  templateId?: string;
  title?: string;
  onBack: () => void;
}

/**
 * The email editor for one campaign: loads its design, autosaves every edit
 * onto the campaign, and on Done also keeps it as a reusable template (the
 * one being edited, or a new one) linked to the campaign, so the wizard shows
 * it selected and sendable.
 */
export function CampaignEmailEditor({
  campaignId,
  templateId,
  title,
  onBack,
}: CampaignEmailEditorProps) {
  const queryClient = useQueryClient();
  const orgId = getSelectedOrganizationId() ?? undefined;
  const source = useEmailSource({ campaignId, templateId, orgId });
  const autosave = useEmailAutosave(campaignId, orgId);
  const latest = useRef<{ doc: DocNode; footer: string } | null>(null);
  const templateRef = useRef((templateId ?? "").trim());
  const [finishing, setFinishing] = useState(false);
  const name = (title ?? "").trim() || "Untitled email";

  const { schedule, flush } = autosave;
  const onChange = useCallback(
    (doc: DocNode, footer: string) => {
      latest.current = { doc, footer };
      schedule(doc, footer);
    },
    [schedule]
  );

  const refreshCampaign = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["campaigns", "editor-content", campaignId],
    });
    queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
  }, [queryClient, campaignId]);

  const back = useCallback(async () => {
    if (!(await flush())) {
      toast.error(
        "Your last changes didn't save. Try again, or copy the HTML before leaving."
      );
      return;
    }
    refreshCampaign();
    onBack();
  }, [flush, refreshCampaign, onBack]);

  const done = useCallback(async () => {
    setFinishing(true);
    try {
      if (!(await flush())) {
        toast.error("Your last changes didn't save. Try again in a moment.");
        return;
      }
      if (latest.current) {
        const payload = buildEmailPayload(
          latest.current.doc,
          latest.current.footer
        );
        const content = { ...payload, source: "email-editor" };
        let id = templateRef.current;
        if (id) {
          await templatesService.update(id, { name, content }, orgId);
        } else {
          const created = (await templatesService.create(
            { name, content },
            orgId
          )) as { id?: unknown } | null;
          id = typeof created?.id === "string" ? created.id.trim() : "";
          templateRef.current = id;
        }
        if (id)
          await campaignsService
            .setTemplate(campaignId, { templateId: id }, orgId)
            .catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: ["templates"] });
        toast.success("Saved to Email Saved. You can select it and send.");
      }
      refreshCampaign();
      onBack();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? `Saved to the campaign, but not as a template. ${e.message}`
          : "Couldn't save the template"
      );
    } finally {
      setFinishing(false);
    }
  }, [flush, name, orgId, campaignId, queryClient, refreshCampaign, onBack]);

  if (source.isError) {
    return (
      <Centered>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t open this email.{" "}
          {source.error instanceof Error ? source.error.message : ""}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            Back to campaign
          </Button>
          <Button onClick={() => source.refetch()}>Try again</Button>
        </div>
      </Centered>
    );
  }
  if (!source.data) return <Spinner />;

  const { design, preheader } = source.data;
  return (
    <EmailEditor
      name={name}
      initialBody={design.kind === "html" ? { html: design.html } : design.doc}
      initialFooter={design.footer}
      preheader={preheader}
      orgId={orgId}
      saveLabel={
        autosave.label ||
        (design.kind === "legacy" ? "Converted from the old editor" : "")
      }
      saveFailed={autosave.status === "error"}
      doneLabel={finishing ? "Saving…" : "Done"}
      doneBusy={finishing}
      onChange={onChange}
      onBack={back}
      onDone={done}
    />
  );
}
