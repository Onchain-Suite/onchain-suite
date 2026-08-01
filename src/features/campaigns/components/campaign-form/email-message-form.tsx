"use client";
import {
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";

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
  const hasVerifiedSenders = verifiedSenderIdentities.length > 0;

  const pickSender = (email: string) => {
    const identity = verifiedSenderIdentities.find((i) => i.email === email);
    if (!identity) return;
    form.setValue("senderEmail", identity.email, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("senderName", identity.name, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <EnvelopeIcon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-lg leading-tight font-semibold text-foreground">
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
            <FormLabel className="flex items-center gap-1 text-sm font-medium">
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

      {hasVerifiedSenders ? (
        <FormField
          control={form.control}
          name="senderEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Send as</FormLabel>
              <FormControl>
                <select
                  value={matchesVerifiedSender ? (field.value ?? "") : ""}
                  onChange={(e) => pickSender(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  {!matchesVerifiedSender ? (
                    <option value="" disabled>
                      Select a verified sender
                    </option>
                  ) : null}
                  {verifiedSenderIdentities.map((identity) => (
                    <option key={identity.id} value={identity.email}>
                      {identity.name} · {identity.email}
                      {identity.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Verified senders only — manage them in{" "}
                <Link
                  href="/settings?tab=account"
                  className="text-primary hover:underline"
                >
                  Settings → Sending
                </Link>
                .
              </FormDescription>
            </FormItem>
          )}
        />
      ) : (
        <>
          {!senderIdentitiesLoading ? (
            <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <ExclamationTriangleIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                <p className="font-medium">
                  No verified sending domain. Branded email can&apos;t send
                  until you verify one in{" "}
                  <Link
                    href="/settings?tab=account"
                    className="font-medium underline underline-offset-2"
                  >
                    Settings → Sender verification
                  </Link>
                  . In-app push is unaffected.
                </p>
              </div>
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="senderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Sender name
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-10 rounded-xl border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="senderEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Sender email
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="support@company.com"
                    className="h-10 rounded-xl border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <div className="space-y-3">
        <FormField
          control={form.control}
          name="useReplyTo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={!field.value}
                  onCheckedChange={(value) => field.onChange(!value)}
                  className="rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
              </FormControl>
              <FormLabel className="cursor-pointer text-sm font-medium">
                Send replies to a different address
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
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Reply-to email address
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="reply@example.com"
                    className="h-10 rounded-xl border-border bg-background"
                  />
                </FormControl>
                <FormDescription>
                  Replies to this email go here instead of the sender address.
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
