"use client";

import type { ReactNode } from "react";

import { PropertySelect, type PropertySelectOption } from "../property-select";
import { Field } from "./panel-ui";

/** A labelled single choice: the panel's most common field. */
export function PickField({
  label,
  value,
  options,
  onChange,
  placeholder,
  hint,
  optional,
  disabled,
}: {
  label: string;
  value: string;
  options: PropertySelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  optional?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} optional={optional}>
      <PropertySelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}

/**
 * Something the panel can do right now, apart from settings: run a check,
 * send a test event. A box, so it never reads as one more field.
 */
export function ActionBox({
  title,
  body,
  actionLabel,
  busyLabel,
  busy,
  icon,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  busyLabel: string;
  busy: boolean;
  icon?: ReactNode;
  onAction: () => void;
}) {
  return (
    <div className="abp-box">
      <b>{title}</b>
      <p>{body}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {icon}
        {busy ? busyLabel : actionLabel}
      </button>
    </div>
  );
}
