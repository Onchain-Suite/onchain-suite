"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useId, useState } from "react";

import type { BuilderSchemaField } from "../../../utils/builder-schema";
import { asBoolean, pickText } from "../../../utils/coerce";
import { AutoGrowTextarea } from "../auto-grow-textarea";
import { PropertySelect } from "../property-select";
import { Field, Toggle } from "./panel-ui";

const label = (f: BuilderSchemaField) => `${f.label}${f.required ? " *" : ""}`;

/** One field the backend's schema describes, as the right kind of control. */
function SchemaField({
  field,
  value,
  suggestions,
  onValue,
}: {
  field: BuilderSchemaField;
  value: unknown;
  suggestions: string[];
  onValue: (field: BuilderSchemaField, value: unknown) => void;
}) {
  const id = useId();
  // JSON is kept as typed until it parses, so a half-written object is not lost.
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);

  if (
    field.options.length > 0 ||
    field.type === "select" ||
    field.type === "enum"
  ) {
    return (
      <Field label={label(field)} hint={field.description}>
        <PropertySelect
          placeholder={
            field.placeholder ?? `Choose ${field.label.toLowerCase()}`
          }
          value={pickText(value)}
          options={field.options.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          onChange={(next) => onValue(field, next)}
        />
      </Field>
    );
  }

  if (field.type === "boolean" || field.type === "toggle") {
    return (
      <div className="abp-field">
        <Toggle
          label={label(field)}
          checked={asBoolean(value)}
          onChange={(v) => onValue(field, v)}
        />
        {field.description && <p className="abp-hint">{field.description}</p>}
      </div>
    );
  }

  if (
    field.type === "object" ||
    field.type === "array" ||
    field.type === "json"
  ) {
    const text =
      jsonDraft ?? (value === undefined ? "" : JSON.stringify(value, null, 2));
    let invalid = false;
    if (text.trim()) {
      try {
        JSON.parse(text);
      } catch {
        invalid = true;
      }
    }
    return (
      <Field label={label(field)} hint={field.description}>
        <textarea
          rows={5}
          className="abp-input abp-mono"
          placeholder={field.placeholder ?? "Valid JSON"}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setJsonDraft(next);
            if (!next.trim()) {
              onValue(field, field.type === "array" ? [] : {});
              return;
            }
            try {
              onValue(field, JSON.parse(next));
            } catch {
              // Kept as a draft until it parses.
            }
          }}
        />
        {invalid && (
          <p className="abp-warn">Enter valid JSON to apply this field.</p>
        )}
      </Field>
    );
  }

  const numeric = field.type === "number" || field.type === "integer";
  const multiline =
    field.type === "textarea" ||
    field.type === "multiline" ||
    field.type === "long_text";
  const listId = suggestions.length > 0 ? `${id}-s` : undefined;
  return (
    <Field label={label(field)} hint={field.description}>
      {multiline ? (
        <AutoGrowTextarea
          className="abp-input"
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onValue(field, e.target.value)}
        />
      ) : (
        <>
          <input
            type={numeric ? "number" : field.type === "date" ? "date" : "text"}
            className="abp-input"
            placeholder={field.placeholder}
            list={listId}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) =>
              onValue(
                field,
                numeric
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value
              )
            }
          />
          {listId && (
            <datalist id={listId}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )}
    </Field>
  );
}

/**
 * The settings the backend's schema lists for a step with no panel of its
 * own (custom events and other off-chain triggers). Plain fields, like
 * every other step.
 */
export function SchemaFields({
  fields,
  values,
  loading,
  error,
  eventSuggestions,
  onValue,
}: {
  fields: BuilderSchemaField[];
  values: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  /** Recent event names, offered on an `event` field. */
  eventSuggestions: string[];
  onValue: (field: BuilderSchemaField, value: unknown) => void;
}) {
  return (
    <>
      {loading && fields.length === 0 && (
        <p className="abp-hint inline-flex items-center gap-1.5">
          <ArrowPathIcon
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin"
          />
          Loading its settings…
        </p>
      )}
      {error && (
        <p className="abp-note abp-note--warn">
          Couldn&apos;t load its settings: {error}
        </p>
      )}
      {fields.map((f) => (
        <SchemaField
          key={f.key}
          field={f}
          value={values[f.key]}
          suggestions={f.key === "event" ? eventSuggestions : []}
          onValue={onValue}
        />
      ))}
    </>
  );
}
