"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  MAX_SCHEDULE_AHEAD_MS,
  toLocalInputValue,
  validateReschedule,
} from "../../utils/email-log";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/** The current send time if it can still be picked, else an hour from now. */
function initialValue(scheduledAt: string | null, now: Date): string {
  const at = scheduledAt ? new Date(scheduledAt) : null;
  if (
    at &&
    !Number.isNaN(at.getTime()) &&
    at.getTime() > now.getTime() &&
    at.getTime() - now.getTime() <= MAX_SCHEDULE_AHEAD_MS
  ) {
    return toLocalInputValue(at);
  }
  return toLocalInputValue(new Date(now.getTime() + 60 * 60 * 1000));
}

/**
 * Pick a new send time, in the viewer's own timezone, from now to 72 hours
 * ahead. Checked here first; the backend checks again against its clock.
 */
export function RescheduleEmailDialog({
  open,
  scheduledAt,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  scheduledAt: string | null;
  pending: boolean;
  /** Called with the new time as an ISO instant. */
  onConfirm: (iso: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {/* Remounts on each open, so the field starts from the current time. */}
        {open ? (
          <RescheduleForm
            scheduledAt={scheduledAt}
            pending={pending}
            onConfirm={onConfirm}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleForm({
  scheduledAt,
  pending,
  onConfirm,
  onClose,
}: {
  scheduledAt: string | null;
  pending: boolean;
  onConfirm: (iso: string) => void;
  onClose: () => void;
}) {
  const [now] = useState(() => new Date());
  const [value, setValue] = useState(() => initialValue(scheduledAt, now));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateReschedule(value, new Date());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onConfirm(result.iso);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Reschedule email</DialogTitle>
        <DialogDescription>
          Pick a new send time, up to 72 hours from now. Times are in your
          timezone. To send it now instead, cancel it and send it again.
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-(--text-secondary)">
          Send at
        </span>
        <Input
          type="datetime-local"
          aria-label="Send at"
          value={value}
          min={toLocalInputValue(now)}
          max={toLocalInputValue(
            new Date(now.getTime() + MAX_SCHEDULE_AHEAD_MS)
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "reschedule-error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
        {error ? (
          <span
            id="reschedule-error"
            role="alert"
            className="text-[12px] text-(--status-error-text)"
          >
            {error}
          </span>
        ) : null}
      </label>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
        >
          Keep current time
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Reschedule"}
        </Button>
      </DialogFooter>
    </form>
  );
}
