"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DeliveryChoice } from "../../dm-send/delivery-choice";
import type { CampaignFormData } from "../../validations";

const TITLE_MAX = 32;
const BODY_MAX = 128;

/**
 * Farcaster content step. Either one public cast through the org's connected
 * account (`channelsContent.farcaster.text`), or a Mini App notification to the
 * people who added the client's Mini App and turned notifications on
 * (`farcaster.notification`). Notifications are the bulk path: one send reaches
 * all of them. Their link must be on the Mini App's own domain.
 */
export function FarcasterMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const delivery = form.watch("farcasterDelivery") ?? "cast";
  const text = form.watch("farcasterText") ?? "";
  const title = form.watch("farcasterNotificationTitle") ?? "";
  const body = form.watch("farcasterNotificationBody") ?? "";
  const url = form.watch("farcasterNotificationUrl") ?? "";
  const audience = form.watch("farcasterNotificationAudience") ?? "all";
  // One setter for the step's string and choice fields (RHF's path types are
  // too deep to infer through a generic key here).
  const set = (key: keyof CampaignFormData, value: string) =>
    form.setValue(key, value as never, { shouldDirty: true });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400"
        />
        <div className="text-sm text-muted-foreground">
          Sent through your connected Farcaster account. Connect it in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first. Notifications also need your Mini App domain there.
        </div>
      </div>

      <DeliveryChoice
        id="farcaster-delivery"
        value={delivery}
        onChange={(v) => set("farcasterDelivery", v)}
        options={[
          { value: "cast", label: "Cast", hint: "One public cast." },
          {
            value: "notification",
            label: "Mini App notification",
            hint: "A notification to everyone who turned them on for your Mini App.",
          },
        ]}
      />

      {delivery === "cast" ? (
        <div className="space-y-1.5">
          <Label htmlFor="farcaster-text">Cast</Label>
          <Textarea
            id="farcaster-text"
            rows={6}
            placeholder="Write your cast…"
            value={text}
            onChange={(e) => set("farcasterText", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {text.trim().length === 0
              ? "Plain text. Links and mentions are sent as-is."
              : `${text.length} character${text.length === 1 ? "" : "s"}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            id="farcaster-title"
            label="Title"
            value={title}
            max={TITLE_MAX}
            onChange={(v) => set("farcasterNotificationTitle", v)}
            placeholder="Season 2 is live"
          />
          <Field
            id="farcaster-body"
            label="Message"
            value={body}
            max={BODY_MAX}
            onChange={(v) => set("farcasterNotificationBody", v)}
            placeholder="Claim your badge before Friday."
            multiline
          />
          <div className="space-y-1.5">
            <Label htmlFor="farcaster-url">Opens</Label>
            <Input
              id="farcaster-url"
              inputMode="url"
              placeholder="https://app.example.xyz/claim"
              value={url}
              onChange={(e) => set("farcasterNotificationUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must be on your Mini App&apos;s domain exactly, not a www. or
              other variant. Farcaster turns notifications off for people when
              it doesn&apos;t match.
            </p>
          </div>
          <DeliveryChoice
            id="farcaster-audience"
            value={audience}
            onChange={(v) => set("farcasterNotificationAudience", v)}
            options={[
              {
                value: "all",
                label: "Everyone with notifications on",
                hint: "All of them in one send, however many.",
              },
              {
                value: "campaign",
                label: "This campaign's audience",
                hint: "Only audience members with notifications on. Up to 10,000.",
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  max,
  onChange,
  placeholder,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const over = value.length > max;
  const change = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(e.target.value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={change}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={change}
        />
      )}
      <p
        className={
          over
            ? "text-xs text-red-600 dark:text-red-400"
            : "text-xs text-muted-foreground"
        }
      >
        {value.length} / {max} characters{over ? " - over the limit" : ""}
      </p>
    </div>
  );
}
