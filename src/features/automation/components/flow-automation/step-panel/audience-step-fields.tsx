"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { PropertySelect, type PropertySelectOption } from "../property-select";
import { Field } from "./panel-ui";

/** "Type a name, Create": a new tag or list without leaving the builder. */
function CreateRow({
  placeholder,
  pending,
  onCreate,
}: {
  placeholder: string;
  pending: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const submit = () => {
    if (!trimmed || pending) return;
    onCreate(trimmed);
    setName("");
  };
  return (
    <div className="abp-create">
      <input
        className="abp-input"
        value={name}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        disabled={!trimmed || pending}
        onClick={submit}
        className="shrink-0 rounded-lg border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create"}
      </button>
    </div>
  );
}

/** Add or remove tags: the chosen ones as chips, then a picker for more. */
export function TagStepFields({
  tags,
  options,
  loading,
  removing,
  creating,
  onChange,
  onCreate,
}: {
  tags: string[];
  options: PropertySelectOption[];
  loading: boolean;
  removing: boolean;
  creating: boolean;
  onChange: (tags: string[]) => void;
  onCreate: (name: string) => void;
}) {
  return (
    <Field
      label={removing ? "Tags to remove" : "Tags to add"}
      hint={
        removing
          ? "These tags come off the contact when they reach this step."
          : "Tag where people came from, and every list and report can tell them apart later."
      }
    >
      {tags.length > 0 && (
        <div className="abp-chips">
          {tags.map((tag) => (
            <span key={tag} className="abp-chip">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              >
                <XMarkIcon aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <PropertySelect
        value=""
        options={options.filter((o) => !tags.includes(o.value))}
        onChange={(next) => {
          if (next && !tags.includes(next)) onChange([...tags, next]);
        }}
        placeholder={
          loading
            ? "Loading tags…"
            : removing
              ? "Choose a tag to remove"
              : "Choose a tag"
        }
      />
      {!removing && (
        <CreateRow
          placeholder="Or create a new tag"
          pending={creating}
          onCreate={onCreate}
        />
      )}
    </Field>
  );
}

/** Add to or remove from a list. */
export function ListStepFields({
  value,
  options,
  loading,
  removing,
  creating,
  onChange,
  onCreate,
}: {
  value: string;
  options: PropertySelectOption[];
  loading: boolean;
  removing: boolean;
  creating: boolean;
  onChange: (value: string) => void;
  onCreate: (name: string) => void;
}) {
  return (
    <Field
      label="List"
      hint={
        removing
          ? "The contact leaves this list when they reach this step."
          : "An automation that starts with “Joins a list” picks them up from here."
      }
    >
      <PropertySelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={loading ? "Loading lists…" : "Choose a list"}
      />
      {!removing && (
        <CreateRow
          placeholder="Or create a new list"
          pending={creating}
          onCreate={onCreate}
        />
      )}
    </Field>
  );
}
