import type { SendPreflight } from "../contracts/send-preflight";

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

export interface PreflightLines {
  /** "1,200 selected · 1,140 will receive it", or null without numbers. */
  reach: string | null;
  /** "60 contacts will be skipped as unengaged", or null when none are. */
  unengaged: string | null;
  /** The sender chose to include unengaged contacts. */
  includingUnengaged: boolean;
}

const count = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;

/** The review step's copy for a send preflight. Tolerates an older backend with no `sunset`. */
export function preflightLines(
  p: SendPreflight | null | undefined
): PreflightLines {
  const recipients = count(p?.recipients);
  const after = count(p?.afterSuppression);
  const excluded = count(p?.sunset?.excluded) ?? 0;
  const applied = p?.sunset?.applied;
  return {
    reach:
      recipients !== null && after !== null
        ? `${recipients.toLocaleString()} selected · ${after.toLocaleString()} will receive it`
        : null,
    unengaged:
      applied !== false && excluded > 0
        ? `${plural(excluded, "contact", "contacts")} will be skipped as unengaged`
        : null,
    includingUnengaged: applied === false,
  };
}
