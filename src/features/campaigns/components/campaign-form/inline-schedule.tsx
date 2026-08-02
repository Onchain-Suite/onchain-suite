"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Calendar } from "@/ui/calendar";
import { Input } from "@/ui/input";

import {
  getZonedDateTimeParts,
  parseTimeOfDay,
  zonedWallTimeToUtcDate,
} from "@/lib/timezone";

import type { CampaignFormData } from "../../validations";

/**
 * Inline date/time picker for the "Schedule" delivery option — a calendar +
 * time field that reveal in place on the review step, so scheduling never
 * pops a modal. The org timezone (from settings) is fixed and shown as context.
 */
export function InlineSchedule({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const scheduleDate = form.watch("scheduleDate");
  const scheduleTime = form.watch("scheduleTime");
  const timezone = form.watch("timezone") ?? "UTC";

  const minSelectableDate = useMemo(() => {
    const today = getZonedDateTimeParts(new Date(), timezone);
    return new Date(today.year, today.month - 1, today.day);
  }, [timezone]);

  const summary = useMemo(() => {
    if (!scheduleDate || !scheduleTime) return null;
    const { hour, minute } = parseTimeOfDay(scheduleTime);
    const utc = zonedWallTimeToUtcDate(
      {
        year: scheduleDate.getFullYear(),
        month: scheduleDate.getMonth() + 1,
        day: scheduleDate.getDate(),
        hour,
        minute,
      },
      timezone
    );
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(utc);
  }, [scheduleDate, scheduleTime, timezone]);

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3">
      <Calendar
        mode="single"
        selected={scheduleDate}
        onSelect={(date) =>
          form.setValue("scheduleDate", date ?? undefined, {
            shouldDirty: true,
          })
        }
        disabled={(date) => date < minSelectableDate}
        captionLayout="dropdown"
        className="rounded-xl"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">At</span>
        <Input
          type="time"
          value={scheduleTime ?? ""}
          onChange={(e) =>
            form.setValue("scheduleTime", e.target.value, {
              shouldDirty: true,
            })
          }
          className="h-9 w-32 rounded-lg"
        />
        <span className="text-xs text-muted-foreground">
          {summary ? `Sends ${summary} · your timezone` : "Pick a date & time"}
        </span>
      </div>
    </div>
  );
}
