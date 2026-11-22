"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { getSelectedOrganizationId } from "@/lib/utils";

import type {
  SendingApproval,
  SendingProjectType,
} from "../../contracts/sending-approval";
import { sendingApprovalKey } from "../../hooks/use-sending-approval";
import { sendingApprovalService } from "../../sending-approval.service";
import {
  draftFromApproval,
  profileDraftErrors,
  profileDraftToBody,
  PROJECT_TYPE_OPTIONS,
  type SendingProfileDraft,
} from "../../utils/sending-approval";

function FieldError({ text }: { text?: string }) {
  return text ? <p className="text-xs text-destructive">{text}</p> : null;
}

/**
 * The sending profile we review before lifting the daily limit. Saving
 * submits it: a rejected workspace goes back to pending review. Only owners
 * and admins can save (the backend enforces it; `canEdit` hides the button).
 */
export function SendingProfileForm({
  approval,
  canEdit,
}: {
  approval: SendingApproval;
  canEdit: boolean;
}) {
  const id = useId();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SendingProfileDraft>(() =>
    draftFromApproval(approval)
  );
  const errors = profileDraftErrors(draft);
  const body = profileDraftToBody(draft);
  const canSave =
    canEdit && Object.keys(errors).length === 0 && Object.keys(body).length > 0;

  const set = <K extends keyof SendingProfileDraft>(
    k: K,
    v: SendingProfileDraft[K]
  ) => setDraft((d) => ({ ...d, [k]: v }));

  const save = useMutation({
    mutationFn: () => sendingApprovalService.update(body),
    onSuccess: (next) => {
      qc.setQueryData(sendingApprovalKey(getSelectedOrganizationId()), next);
      toast.success(
        next.missing.length > 0
          ? "Saved. A few details are still missing."
          : "Sending profile submitted for review."
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-site`}>Website</Label>
          <Input
            id={`${id}-site`}
            type="url"
            placeholder="https://example.xyz"
            value={draft.website}
            disabled={!canEdit}
            onChange={(e) => set("website", e.target.value)}
          />
          <FieldError text={errors.website} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-type`}>Project type</Label>
          <Select
            value={draft.projectType || undefined}
            disabled={!canEdit}
            onValueChange={(v) => set("projectType", v as SendingProjectType)}
          >
            <SelectTrigger id={`${id}-type`} className="w-full">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-optin`}>
          How do people opt in to your emails?
        </Label>
        <Textarea
          id={`${id}-optin`}
          rows={3}
          maxLength={2000}
          placeholder="e.g. A signup form on our site with a confirmation email"
          value={draft.optInSource}
          disabled={!canEdit}
          onChange={(e) => set("optInSource", e.target.value)}
        />
        <FieldError text={errors.optInSource} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          A sample email
        </legend>
        <div className="flex gap-4 text-sm">
          {(["design", "html"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-sample`}
                checked={draft.sampleMode === mode}
                disabled={!canEdit}
                onChange={() => set("sampleMode", mode)}
              />
              {mode === "design" ? "A saved design" : "Paste HTML"}
            </label>
          ))}
        </div>
        {draft.sampleMode === "design" ? (
          <Input
            aria-label="Design ID"
            placeholder="The ID of a campaign or template design"
            value={draft.sampleDesignId}
            disabled={!canEdit}
            onChange={(e) => set("sampleDesignId", e.target.value)}
          />
        ) : (
          <Textarea
            aria-label="Sample email HTML"
            rows={4}
            placeholder="<html>…</html>"
            value={draft.sampleHtml}
            disabled={!canEdit}
            onChange={(e) => set("sampleHtml", e.target.value)}
          />
        )}
        {approval.profile.hasSampleHtml && draft.sampleMode === "html" ? (
          <p className="text-xs text-muted-foreground">
            We have a sample already. Paste new HTML only to replace it.
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor={`${id}-vol`}>Emails you expect to send a month</Label>
        <Input
          id={`${id}-vol`}
          inputMode="numeric"
          placeholder="20000"
          value={draft.expectedMonthlyVolume}
          disabled={!canEdit}
          onChange={(e) => set("expectedMonthlyVolume", e.target.value)}
        />
        <FieldError text={errors.expectedMonthlyVolume} />
      </div>

      {canEdit ? (
        <Button type="submit" disabled={!canSave || save.isPending}>
          {save.isPending
            ? "Saving…"
            : approval.status === "rejected"
              ? "Submit again"
              : "Save and submit"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only an owner or admin can change the sending profile.
        </p>
      )}
    </form>
  );
}
