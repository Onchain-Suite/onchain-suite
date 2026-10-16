/**
 * Small value-coercion helpers for the automation builder: turn the loosely
 * typed data that rides on ReactFlow nodes and backend payloads into the exact
 * primitive a caller needs. Pure and dependency-light (only `isJsonObject`), so
 * they live here rather than inline in the 5k-line builder component.
 */
import { isJsonObject } from "@/lib/utils";

/** A value as a string, or `""` when it isn't one (never `String(undefined)`). */
export const asString = (v: unknown): string =>
  typeof v === "string" ? v : "";

/** A finite number, parsing numeric strings; `0` for anything else. */
export const asNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/** Strict boolean: only the literal `true` counts (never truthy coercion). */
export const asBoolean = (value: unknown): boolean => value === true;

/**
 * The array inside a payload, whether it's the array itself or wrapped as
 * `{ items }` / `{ data }` (both envelope shapes the backend uses); `[]` when
 * there is no array to find.
 */
export const pickArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isJsonObject(payload) && Array.isArray(payload.items))
    return payload.items;
  if (isJsonObject(payload) && Array.isArray(payload.data)) return payload.data;
  return [];
};

/** First non-blank string among the arguments, trimmed; `""` if none. */
export const pickText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};
