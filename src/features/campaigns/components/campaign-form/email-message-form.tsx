"use client";
import {
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";

import type { CampaignFormData } from "../../validations";
import { SubjectLineInput } from "./subject-line-input";

export interface EmailMessageFormProps {
  form: UseFormReturn<CampaignFormData>;
  verifiedSenderIdentities: Array<{
    id: string;
    email: string;
    name: string;
    isDefault: boolean;
  }>;
  senderIdentitiesLoading: boolean;
}

export function EmailMessageForm({
  form,
  verifiedSenderIdentities,
  senderIdentitiesLoading,
}: EmailMessageFormProps) {
  const useReplyTo = form.watch("useReplyTo");
  const selectedSenderEmail = form.watch("senderEmail");

  const trimmedSenderEmail = (selectedSenderEmail ?? "").trim().toLowerCase();
  const matchesVerifiedSender = verifiedSenderIdentities.some(
    (identity) => identity.email.toLowerCase() === trimmedSenderEmail
  );
  const fallbackSender =
    verifiedSenderIdentities.find((identity) => identity.isDefault) ??
    verifiedSenderIdentities[0];

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-3 pb-5 border-b border-border">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <EnvelopeIcon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-lg font-semibold leading-tight text-foreground">
            Email message
          </h3>
          <p className="text-xs text-muted-foreground">
            Sender, subject, and preview details
          </p>
        </div>
      </div>

      <FormField
        control={form.control}
        name="emailSubject"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium flex items-center gap-1">
              Subject line
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <SubjectLineInput value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="previewText"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Preview text</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="h-10 rounded-xl border-border bg-background transition-all duration-300"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="senderName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium flex items-center gap-1">
              Sender name
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                className="h-10 rounded-xl border-border bg-background transition-all duration-300"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!senderIdentitiesLoading && verifiedSenderIdentities.length === 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <ExclamationTriangleIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
            <p className="font-medium">
              No verified sender identity — this campaign will send from the
              platform address (DoNotReply@…azurecomm.net).
            </p>
            <p className="mt-1">
              Verify your domain and add a sender address in{" "}
              <Link
                href="/settings?tab=account"
                className="font-medium underline underline-offset-2"
              >
                Settings → Account
              </Link>{" "}
              so emails send from your own domain.
            </p>
          </div>
        </div>
      ) : null}

      <FormField
        control={form.control}
        name="senderEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium flex items-center gap-1">
              Sender email
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="email"
                placeholder="support@company.com"
                className="h-10 rounded-xl border-border bg-background transition-all duration-300"
              />
            </FormControl>
            {trimmedSenderEmail.length > 0 &&
            verifiedSenderIdentities.length > 0 &&
            !matchesVerifiedSender ? (
              <FormDescription className="text-amber-600 dark:text-amber-400">
                This address isn&apos;t a verified sender identity, so the email
                will be sent from{" "}
                {fallbackSender
                  ? `${fallbackSender.email} instead`
                  : "the organization's verified sender instead"}
                . Pick a verified sender below to use it directly.
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      {verifiedSenderIdentities.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Verified sender suggestions
          </div>
          <div className="flex flex-wrap gap-2">
            {verifiedSenderIdentities.map((identity) => (
              <Button
                key={identity.id}
                type="button"
                variant={
                  selectedSenderEmail === identity.email ? "default" : "outline"
                }
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  form.setValue("senderEmail", identity.email, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  const currentSenderName = (
                    form.getValues("senderName") ?? ""
                  ).trim();
                  if (currentSenderName.length === 0) {
                    form.setValue("senderName", identity.name, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }
                }}
              >
                {identity.email}
                {identity.isDefault ? " (Default)" : ""}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <FormField
          control={form.control}
          name="useReplyTo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="rounded data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </FormControl>
              <FormLabel className="text-sm font-medium cursor-pointer">
                Use as reply-to
              </FormLabel>
            </FormItem>
          )}
        />

        {!useReplyTo && (
          <FormField
            control={form.control}
            name="replyToEmail"
            render={({ field }) => (
              <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  Reply-to email address
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="reply@example.com"
                    className="h-10 rounded-xl border-border bg-background transition-all duration-300"
                  />
                </FormControl>
                <FormDescription>
                  Replies to this email will be sent to this address instead of
                  the sender email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
