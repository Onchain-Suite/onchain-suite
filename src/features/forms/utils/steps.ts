import type { CaptureFieldSpec } from "../forms.service";

/**
 * Multi-step forms keep ONE flat field list; each field carries a 1-based `step`
 * (absent = step 1) that groups it for the builder's step tabs and the
 * renderer's Next/Back pagination. These helpers are the single source of truth
 * for that grouping, so single-step and pre-existing forms stay valid unchanged.
 */

/** The 1-based step a field belongs to (absent or invalid = step 1). */
export function fieldStep(f: CaptureFieldSpec): number {
  return typeof f.step === "number" && f.step >= 1 ? Math.round(f.step) : 1;
}

/** Total steps: at least 1, covering the highest field step and a persisted count. */
export function stepCount(fields: CaptureFieldSpec[], persisted = 1): number {
  const maxField = fields.reduce((m, f) => Math.max(m, fieldStep(f)), 1);
  return Math.max(1, Math.round(persisted) || 1, maxField);
}

/** Fields on a given step, in their original order. */
export function fieldsForStep(
  fields: CaptureFieldSpec[],
  step: number
): CaptureFieldSpec[] {
  return fields.filter((f) => fieldStep(f) === step);
}

/**
 * Drop a step: remove its fields and shift every later field down one, so the
 * step numbers stay contiguous 1..N. Returns the new field list.
 */
export function removeStep(
  fields: CaptureFieldSpec[],
  step: number
): CaptureFieldSpec[] {
  return fields
    .filter((f) => fieldStep(f) !== step)
    .map((f) => (fieldStep(f) > step ? { ...f, step: fieldStep(f) - 1 } : f));
}
