"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DeliveryChoice } from "../../dm-send/delivery-choice";
import { checkTelegramChannel } from "../../telegram/telegram-content";
import type { CampaignFormData } from "../../validations";

/**
 * Telegram content step. One plain-text message, sent either as a DM to each
 * person who started the client's bot (through the consent dialog), or as one
 * post in the client's Telegram channel, which every subscriber sees. Persisted
 * to `channelsContent.telegram.{text, delivery, channel}`.
 */
export function TelegramMessageStep({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const text = form.watch("telegramText") ?? "";
  const delivery = form.watch("telegramDelivery") ?? "dm";
  const channel = form.watch("telegramChannel") ?? "";
  const check = useMutation({
    mutationFn: () => checkTelegramChannel(channel.trim()),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
        <PaperAirplaneIcon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
        />
        <div className="text-sm text-muted-foreground">
          Sent through your connected Telegram bot. Connect a bot in{" "}
          <span className="font-medium text-foreground">
            Settings → Integrations
          </span>{" "}
          first.
        </div>
      </div>

      <DeliveryChoice
        id="telegram-delivery"
        value={delivery}
        onChange={(v) =>
          form.setValue("telegramDelivery", v, { shouldDirty: true })
        }
        options={[
          {
            value: "dm",
            label: "DM people who started your bot",
            hint: "A message to each person who opted in through your bot.",
          },
          {
            value: "channel",
            label: "Post to your channel",
            hint: "One post that every subscriber of your Telegram channel sees.",
          },
        ]}
      />

      {delivery === "channel" ? (
        <div className="space-y-1.5">
          <Label htmlFor="telegram-channel">Channel</Label>
          <div className="flex gap-2">
            <Input
              id="telegram-channel"
              placeholder="@your_channel or t.me/your_channel"
              value={channel}
              onChange={(e) => {
                check.reset();
                form.setValue("telegramChannel", e.target.value, {
                  shouldDirty: true,
                });
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!channel.trim() || check.isPending}
              onClick={() => check.mutate()}
            >
              {check.isPending ? "Checking…" : "Check"}
            </Button>
          </div>
          {check.isSuccess ? (
            <p
              className={
                check.data.canPost
                  ? "text-xs text-muted-foreground"
                  : "text-xs text-red-600 dark:text-red-400"
              }
            >
              {check.data.title ?? check.data.channel}
              {check.data.subscribers !== null
                ? ` · ${check.data.subscribers.toLocaleString()} subscribers`
                : ""}
              {check.data.canPost
                ? " · your bot can post here."
                : " · your bot can't post here. Make it an admin with “Post messages” on."}
            </p>
          ) : check.isError ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {check.error instanceof Error
                ? check.error.message
                : "Couldn't check that channel."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your bot must be an admin of the channel, allowed to post.
            </p>
          )}
        </div>
      ) : null}

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
