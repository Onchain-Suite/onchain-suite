"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { type ReactNode, useId } from "react";

import "./step-panel.css";

/*
 * The pieces every settings panel is built from, after the reference Loop
 * builder: a header naming the step, what is still missing said once under
 * it, plain labelled fields, and a footer to remove the step. Everything
 * saves as it changes, so there is no Apply button.
 */

export function PanelHead({
  icon,
  eyebrow,
  title,
  entry = false,
  onClose,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  entry?: boolean;
  onClose?: () => void;
}) {
  return (
    <header className="abp-head">
      <span className={`abp-ic${entry ? " abp-ic--entry" : ""}`}>{icon}</span>
      <div>
        <i>{eyebrow}</i>
        <b>{title}</b>
      </div>
      {onClose && (
        <button
          type="button"
          className="abp-close"
          aria-label="Close settings"
          onClick={onClose}
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </header>
  );
}

export function PanelTodo({ children }: { children: ReactNode }) {
  return (
    <p className="abp-todo">
      <ExclamationCircleIcon aria-hidden="true" />
      {children}
    </p>
  );
}

/** A label, the control, and an optional hint, stacked. */
export function Field({
  label,
  optional,
  hint,
  action,
  children,
}: {
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  /** A small link on the label's row, e.g. "Change". */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="abp-field">
      {action ? (
        <span className="abp-field__head">
          <span className="abp-label">
            {label}
            {optional && <i> (optional)</i>}
          </span>
          {action}
        </span>
      ) : (
        <span className="abp-label">
          {label}
          {optional && <i> (optional)</i>}
        </span>
      )}
      {children}
      {hint && <p className="abp-hint">{hint}</p>}
    </div>
  );
}

/** A text field with its label wired up. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  hint,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  hint?: ReactNode;
  multiline?: boolean;
  type?: "text" | "url" | "number";
}) {
  const id = useId();
  return (
    <div className="abp-field">
      <label className="abp-label" htmlFor={id}>
        {label}
        {optional && <i> (optional)</i>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          className="abp-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className="abp-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="abp-hint">{hint}</p>}
    </div>
  );
}

/** Two to four mutually exclusive choices, side by side. */
export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="abp-field">
      <span className="abp-label">{label}</span>
      <div className="abp-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A switch on a row with its label. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="abp-toggle">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="abp-switch"
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

export function PanelFoot({
  removeLabel,
  onRemove,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  removeLabel: string;
  onRemove: () => void;
  /** Moves the step one place along its path; omitted for a trigger. */
  onMove?: (dir: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <div className="abp-foot">
      {onMove && (
        <>
          <button
            type="button"
            className="abp-move"
            aria-label="Move up"
            title="Move up"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="abp-move"
            aria-label="Move down"
            title="Move down"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon aria-hidden="true" />
          </button>
        </>
      )}
      <button type="button" className="abp-remove" onClick={onRemove}>
        <TrashIcon aria-hidden="true" />
        {removeLabel}
      </button>
    </div>
  );
}
