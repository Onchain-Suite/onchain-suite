"use client";

import { isJsonObject } from "@/lib/utils";

import {
  PROPERTY_HINT_CLASS,
  PROPERTY_INPUT_CLASS,
  PROPERTY_LABEL_CLASS,
  PropertySelect,
  type PropertySelectOption,
} from "./property-select";
import {
  reentryConfigToUi,
  reentryUiToConfig,
} from "@/features/automation/utils/reentry";

/** A labeled on/off switch used in the flow-settings panel. */
function FlowToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

const REENTRY_OPTIONS: PropertySelectOption[] = [
  { value: "once", label: "Never re-enter" },
  { value: "daily", label: "Once per day" },
  { value: "weekly", label: "Once per week" },
  { value: "always", label: "Always" },
];

/**
 * The events a goal can actually convert on.
 *
 * ONLY THESE FOUR SOURCES CALL THE CONVERSION RECORDER, so a goal set to
 * anything else never fires — silently, with the Stats tab reading 0% forever
 * and nothing to say why. This field used to be free text whose placeholder
 * suggested "purchase, swap_completed": neither exists, so a user following
 * the hint got a goal that could never convert.
 *
 * Labels are what the contact DID, not the internal event name, because the
 * person configuring a flow is picking an outcome, not a topic string.
 * `list_joined` is deliberately absent — it arrives as `segment_entered`, and
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
 * by the runtime) — re-entry policy (onchain-backend #307) + per-contact
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
   * instant it begins — a 100% rate that measures nothing.
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
    <div
      className={
        className ??
        "hidden w-[344px] shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-6 md:block"
      }
    >
      <h3 className="font-semibold tracking-tight text-foreground">
        Flow settings
      </h3>
      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground">Re-entry</span>
          <PropertySelect
            value={reentryUi}
            onChange={setReentry}
            className="w-40"
            options={REENTRY_OPTIONS}
          />
        </div>
        <FlowToggle
          label="Max 1 message / 10h"
          checked={freqOn}
          onChange={setFreq}
        />
      </div>

      {/* Goal — the outcome that counts as "this flow worked". A matching event
          within the window marks the enrolment converted; the rate shows on the
          Stats tab. */}
      <div className="mt-7 border-t border-border pt-5">
        <label className={PROPERTY_LABEL_CLASS}>Conversion goal</label>
        <PropertySelect
          value={goalEvent}
          onChange={(e) => setGoal(e, goalWindow)}
          className="mt-2 w-full"
          placeholder="No goal"
          options={GOAL_EVENT_OPTIONS}
        />
        <p className={`${PROPERTY_HINT_CLASS} mt-2`}>
          What a contact has to do for this flow to have worked. It counts once
          per enrolment, and only if they do it within the window.
        </p>
        {goalEvent && goalEvent === triggerEventType ? (
          <p className="mt-2 text-xs leading-5 text-amber-500">
            This is the same event that starts the flow, so every enrolment
            converts the moment it begins. Pick a different outcome to measure
            anything.
          </p>
        ) : null}
        {goalEvent ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>within</span>
            <input
              type="number"
              min={1}
              className={`${PROPERTY_INPUT_CLASS} w-16 py-1.5 text-center`}
              value={goalWindow}
              onChange={(e) =>
                setGoal(goalEvent, Math.max(1, Number(e.target.value) || 7))
              }
            />
            <span>days of enrolling</span>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Re-entry limits how often a contact can start this flow; the cap limits
        how many messages it sends one contact per window; the goal measures
        whether it worked. Select a node to configure it.
      </p>
    </div>
  );
}
