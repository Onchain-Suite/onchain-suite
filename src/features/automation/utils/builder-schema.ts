/**
 * Builder schema + branch normalization: turn the loosely typed trigger/action
 * schema and branch-rule payloads the backend returns into the tidy shapes the
 * builder renders. Pure (no React), extracted from `create-automations.tsx`
 * (CLAUDE.md 15.5) so it is unit-testable without mounting the builder.
 */
import { isJsonObject } from "@/lib/utils";

import { asBoolean, asString, pickArray, pickText } from "./coerce";

export type BuilderSchemaFieldOption = {
  label: string;
  value: string;
};

export type BuilderSchemaField = {
  key: string;
  label: string;
  description?: string;
  type: string;
  required: boolean;
  placeholder?: string;
  /** Non-essential field: hidden under an "Advanced" disclosure by default. */
  advanced: boolean;
  options: BuilderSchemaFieldOption[];
};

/** A single branch condition row: `field <operator> value → target node`. */
export type BranchRule = {
  id: string;
  field: string;
  operator: string;
  value: string;
  target: string;
};

export const BRANCH_OPERATORS: { value: string; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gte", label: "greater or equal" },
  { value: "lte", label: "less or equal" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "exists" },
];

/** Operators that don't need a comparison value. */
export const BRANCH_VALUELESS_OPERATORS = new Set(["exists"]);

/** Normalize a persisted branch rule (tolerant of backend/legacy key names). */
export const normalizeBranchRule = (
  raw: unknown,
  index: number
): BranchRule => {
  const obj = isJsonObject(raw) ? raw : {};
  return {
    id:
      asString(obj.id) ||
      asString(obj.ruleId) ||
      `rule-${index}-${Math.random().toString(36).slice(2, 8)}`,
    field: asString(obj.field ?? obj.key ?? obj.attribute),
    operator: asString(obj.operator ?? obj.op ?? obj.comparator) || "eq",
    value:
      obj.value === undefined || obj.value === null ? "" : String(obj.value),
    target: asString(obj.target ?? obj.targetNodeId ?? obj.to ?? obj.node),
  };
};

const INTERNAL_SCHEMA_KEYS = new Set([
  "label",
  "schema",
  "stats",
  "nodeType",
  "triggerType",
  "actionType",
  "template",
  "templateId",
  "templateName",
  "contract",
  "contractAddress",
  "event",
]);

export const normalizeSchemaFieldOptions = (
  value: unknown
): BuilderSchemaFieldOption[] =>
  pickArray(value)
    .map((option) => {
      if (typeof option === "string" || typeof option === "number") {
        return {
          label: String(option),
          value: String(option),
        };
      }
      if (!isJsonObject(option)) return null;
      const record = option as Record<string, unknown>;
      const resolvedValue = pickText(
        record.value,
        record.id,
        record.key,
        record.name
      );
      if (resolvedValue.length === 0) return null;
      return {
        value: resolvedValue,
        label:
          pickText(record.label, record.name, record.title, resolvedValue) ||
          resolvedValue,
      };
    })
    .filter((option): option is BuilderSchemaFieldOption => Boolean(option));

export const normalizeSchemaFields = (
  schema: unknown
): BuilderSchemaField[] => {
  if (!isJsonObject(schema)) return [];
  const record = schema as Record<string, unknown>;
  return pickArray(record.fields)
    .map<BuilderSchemaField | null>((field) => {
      if (!isJsonObject(field)) return null;
      const entry = field as Record<string, unknown>;
      const key = pickText(entry.key, entry.name, entry.id);
      if (key.length === 0 || INTERNAL_SCHEMA_KEYS.has(key)) return null;
      const rawType = pickText(
        entry.type,
        entry.inputType,
        entry.component,
        entry.kind,
        "text"
      ).toLowerCase();
      const description = pickText(
        entry.description,
        entry.helpText,
        entry.helperText
      );
      const placeholder = pickText(entry.placeholder);
      // Show the schema default as placeholder text ("smart defaults, visible")
      // so an unset field reads as its default rather than an empty required box.
      const defaultHint =
        entry.default !== undefined &&
        entry.default !== null &&
        typeof entry.default !== "object"
          ? String(entry.default)
          : "";
      return {
        key,
        label: pickText(entry.label, entry.title, key) || key,
        description: description || undefined,
        type: rawType,
        required: asBoolean(entry.required),
        placeholder: placeholder || defaultHint || undefined,
        advanced: asBoolean(entry.advanced),
        options: normalizeSchemaFieldOptions(entry.options ?? entry.enum),
      };
    })
    .filter((field): field is BuilderSchemaField => Boolean(field));
};
