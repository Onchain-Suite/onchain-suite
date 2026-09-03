/**
 * Re-entry policy mapping for the flow-settings panel: translate between the
 * panel's single-select UI value and the runtime's `{ policy, windowDays }`
 * contract (onchain-backend #307). Pure, so it is unit-testable without the
 * panel; the `<select>` option list lives with the panel component.
 */
import { isJsonObject } from "@/lib/utils";

import { asString } from "./coerce";

/** Panel choice → runtime contract `{ policy, windowDays }`. */
export function reentryUiToConfig(ui: string): Record<string, unknown> {
  switch (ui) {
    case "once":
      return { policy: "once" };
    case "daily":
      return { policy: "window", windowDays: 1 };
    case "weekly":
      return { policy: "window", windowDays: 7 };
    default:
      return { policy: "always" };
  }
}

/** Runtime contract → panel choice (tolerant of a missing/partial config). */
export function reentryConfigToUi(cfg: unknown): string {
  const c = isJsonObject(cfg) ? (cfg as Record<string, unknown>) : {};
  const policy = asString(c.policy);
  if (policy === "once") return "once";
  if (policy === "window")
    return Number(c.windowDays) >= 7 ? "weekly" : "daily";
  return "always";
}
