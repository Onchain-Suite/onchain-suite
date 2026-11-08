"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DeliveryChoice } from "../../dm-send/delivery-choice";
import type { CampaignFormData } from "../../validations";

const X_LIMIT = 280;
const X_DM_LIMIT = 10_000;

/**
 * X content step. Either one post published to the org's connected X account
 * (`channelsContent.x.text`), or a DM to each person in the audience with a
 * linked X account (`x.dmText`). X only allows automated DMs to people who DMed
 * the account first, so a DM send goes through the consent dialog.
 */
export function XMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const delivery = form.watch("xDelivery") ?? "post";
  const isDm = delivery === "dm";
  const field = isDm ? "xDmText" : "xText";
  const limit = isDm ? X_DM_LIMIT : X_LIMIT;
  const text = form.watch(field) ?? "";
  const over = text.length > limit;

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

      <DeliveryChoice
        id="x-delivery"
        value={delivery}
        onChange={(v) => form.setValue("xDelivery", v, { shouldDirty: true })}
        options={[
          {
            value: "post",
            label: "Post",
            hint: "One public post on your timeline.",
          },
          {
            value: "dm",
            label: "DM",
            hint: "A DM to each person, only if they DMed your account first. Up to 1,400 a day.",
          },
        ]}
      />

      <div className="space-y-1.5">
        <Label htmlFor="x-text">{isDm ? "Direct message" : "Post"}</Label>
        <Textarea
          id="x-text"
          rows={5}
          placeholder={isDm ? "Write the DM…" : "What's happening?"}
          value={text}
          onChange={(e) =>
            form.setValue(field, e.target.value, { shouldDirty: true })
          }
        />
        <p
          className={
            over
              ? "text-xs text-red-600 dark:text-red-400"
              : "text-xs text-muted-foreground"
          }
        >
          {text.length.toLocaleString()} / {limit.toLocaleString()} characters
          {over ? " - over the limit" : ""}
        </p>
      </div>
    </div>
  );
}
