"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Textarea } from "@/ui/textarea";

import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { buildEmailPayload, emailService } from "@/shared/emails/email.service";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recipients that have a real email channel. */
  recipients: EmailRecipient[];
  /** Selected profiles skipped because they have no email channel. */
  skippedCount?: number;
  /** Fired after at least one email was queued successfully. */
  onSent?: () => void;
}

const PLATFORM_SENDER = "__platform__";

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recipients,
  skippedCount = 0,
  onSent,
}: ComposeEmailDialogProps): React.ReactElement {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fromEmail, setFromEmail] = useState<string>(PLATFORM_SENDER);
  const [isSending, setIsSending] = useState(false);

  // Only fetch verified From-addresses while the dialog is open.
  const sendersQuery = useQuery({
    queryKey: ["sender-identities", "verified"],
    queryFn: () => senderIdentitiesService.listSenderIdentities(),
    enabled: open,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const verifiedSenders = useMemo(
    () => (sendersQuery.data ?? []).filter((s) => s.status === "verified"),
    [sendersQuery.data]
  );

  const recipientCount = recipients.length;
  const canSend =
    recipientCount > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !isSending;

  const resetAndClose = () => {
    setSubject("");
    setMessage("");
    onOpenChange(false);
  };

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    const { html, text } = buildEmailPayload(message);
    const from =
      fromEmail !== PLATFORM_SENDER && fromEmail.length > 0
        ? fromEmail
        : undefined;

    const results = await Promise.allSettled(
      recipients.map((r) =>
        emailService.send({
          to: r.email,
          subject: subject.trim(),
          html,
          text,
          ...(from ? { from } : {}),
        })
      )
    );
    setIsSending(false);

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    if (sent > 0) {
      toast.success(
        `Sent to ${sent} recipient${sent === 1 ? "" : "s"}${
          failed > 0 ? ` · ${failed} failed` : ""
        }`
      );
      onSent?.();
      resetAndClose();
    } else {
      const firstError = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      const reason =
        firstError && firstError.reason instanceof Error
          ? firstError.reason.message
          : "Please try again.";
      toast.error(`Failed to send email. ${reason}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>
            {recipientCount > 0
              ? `A direct email to ${recipientCount} recipient${
                  recipientCount === 1 ? "" : "s"
                }.`
              : "None of the selected profiles have an email channel."}
            {skippedCount > 0 && recipientCount > 0
              ? ` ${skippedCount} without email will be skipped.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {verifiedSenders.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="compose-from">From</Label>
              <Select value={fromEmail} onValueChange={setFromEmail}>
                <SelectTrigger id="compose-from">
                  <SelectValue placeholder="Default sender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PLATFORM_SENDER}>
                    Default sender
                  </SelectItem>
                  {verifiedSenders.map((s) => (
                    <SelectItem key={s.id} value={s.email}>
                      {s.name ? `${s.name} · ${s.email}` : s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compose-message">Message</Label>
            <Textarea
              id="compose-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Sent as-is to every recipient - merge tags are not resolved here.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={resetAndClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} disabled={!canSend}>
            <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
            {isSending
              ? "Sending…"
              : `Send${recipientCount > 0 ? ` to ${recipientCount}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
