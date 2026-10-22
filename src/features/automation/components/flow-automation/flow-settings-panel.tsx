"use client";

import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

import { isJsonObject } from "@/lib/utils";

import type { PropertySelectOption } from "./property-select";
import { PanelHead, Toggle } from "./step-panel/panel-ui";
import { PickField } from "./step-panel/pick-field";
import {
  reentryConfigToUi,
  reentryUiToConfig,
} from "@/features/automation/utils/reentry";

const REENTRY_OPTIONS: PropertySelectOption[] = [
  { value: "once", label: "No, once only" },
  { value: "daily", label: "Yes, once a day at most" },
  { value: "weekly", label: "Yes, once a week at most" },
  { value: "always", label: "Yes, every time" },
];

/**
 * The events a goal can actually convert on.
 *
 * ONLY THESE FOUR SOURCES CALL THE CONVERSION RECORDER, so a goal set to
 * anything else never fires: silently, with the Stats tab reading 0% forever
 * and nothing to say why. This field used to be free text whose placeholder
 * suggested "purchase, swap_completed": neither exists, so a user following
 * the hint got a goal that could never convert.
 *
 * Labels are what the contact DID, not the internal event name, because the
 * person configuring a flow is picking an outcome, not a topic string.
 * `list_joined` is deliberately absent: it arrives as `segment_entered`, and
 * offering both would imply a distinction the runtime does not make.
 */
const GOAL_EVENT_OPTIONS: PropertySelectOption[] = [
  { value: "", label: "No goal", hint: "Skip conversion tracking" },
  {
    value: "onchain_event",
    label: "Did something on-chain",
    hint: "A swap, mint or transfer on a watched contract",
  },
  {
    value: "email_opened",
    label: "Opened an email",
    hint: "Any campaign or automation email",
  },
  {
    value: "email_clicked",
    label: "Clicked an email link",
    hint: "A stronger signal than an open",
  },
  {
    value: "segment_entered",
    label: "Joined a list or segment",
    hint: "Entered any audience list",
  },
  {
    value: "form_submitted",
    label: "Submitted a form",
    hint: "Any capture form",
  },
];

/**
 * Right-panel flow-level guardrails, shown when no node is selected. Controlled
 * by the parent's `flowSettings` (persisted in the graph's `settings` and read
 * by the runtime): re-entry policy (onchain-backend #307) + per-contact
 * frequency cap (#309). Only guardrails the runtime actually enforces are shown.
 */
export function FlowSettingsPanel({
  value,
  onChange,
  className,
  triggerEventType,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /**
   * The event that STARTS this flow, so the goal picker can warn when the two
   * match. Conversions are recorded in the same ingest that creates the
   * enrolment, so a goal equal to its own trigger converts every enrolment the
   * instant it begins: a 100% rate that measures nothing.
   */
  triggerEventType?: string;
  /** Root class override so the panel works both as the desktop column and
   *  inside the mobile bottom sheet. */
  className?: string;
}) {
  const reentryUi = reentryConfigToUi(value.reentry);
  const freq = isJsonObject(value.frequencyCap)
    ? (value.frequencyCap as Record<string, unknown>)
    : null;
  const freqOn = !!freq && Number(freq.maxPerContact) > 0;
  const goal = isJsonObject(value.goal)
    ? (value.goal as Record<string, unknown>)
    : null;
  const goalEvent = goal ? String(goal.event ?? "") : "";
  const goalWindow = goal ? Number(goal.windowDays) || 7 : 7;

  const setReentry = (ui: string) =>
    onChange({ ...value, reentry: reentryUiToConfig(ui) });
  const setFreq = (on: boolean) => {
    if (on) {
      onChange({
        ...value,
        frequencyCap: { maxPerContact: 1, windowHours: 10 },
      });
    } else {
      const next = { ...value };
      delete next.frequencyCap;
      onChange(next);
    }
  };
  const setGoal = (event: string, windowDays: number) => {
    const e = event.trim();
    if (!e) {
      const next = { ...value };
      delete next.goal;
      onChange(next);
      return;
    }
    onChange({ ...value, goal: { event: e, windowDays } });
  };

  return (
    <div className={className ?? "abp"}>
      <PanelHead
        icon={<AdjustmentsHorizontalIcon aria-hidden="true" />}
        eyebrow="Automation"
        title="Settings"
      />
      <PickField
        label="Can someone go through it again?"
        value={reentryUi}
        onChange={setReentry}
        options={REENTRY_OPTIONS}
      />
      <Toggle
        label="At most one message per 10 hours"
        checked={freqOn}
        onChange={setFreq}
      />

      <div className="abp-sep" />

      {/* The outcome that counts as "this flow worked": a matching event within
          the window marks the enrolment converted, shown on the Stats tab. */}
      <PickField
        label="Conversion goal"
        optional
        value={goalEvent}
        onChange={(e) => setGoal(e, goalWindow)}
        placeholder="No goal"
        options={GOAL_EVENT_OPTIONS}
        hint="What a contact has to do for this flow to have worked. It counts once per enrolment, within the window."
      />
      {goalEvent && goalEvent === triggerEventType ? (
        <p className="abp-warn">
          This is the same event that starts the flow, so every enrolment
          converts the moment it begins. Pick a different outcome to measure
          anything.
        </p>
      ) : null}
      {goalEvent ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>Within</span>
          <input
            type="number"
            min={1}
            aria-label="Goal window in days"
            className="abp-input w-16 text-center"
            value={goalWindow}
            onChange={(e) =>
              setGoal(goalEvent, Math.max(1, Number(e.target.value) || 7))
            }
          />
          <span>days of starting</span>
        </div>
      ) : null}

      <p className="abp-hint">
        The message cap counts every automation and campaign, so nobody hears
        from you three times in a morning. Click a step to change it.
      </p>
    </div>
  );
}
