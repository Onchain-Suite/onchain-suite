import type { CampaignFormData } from "../validations";

/**
 * Roughly how long a tracked link is once the backend rewrites it:
 * `<api host>/l/<link id>.<recipient id>.<signature>`. Used only to estimate
 * segments, so it errs a little long.
 */
export const TRACKED_LINK_CHARS = 80;

// Same link pattern the backend tracks (link-tracking/links/link-rewriter.ts).
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const TRAILING = /[.,!?;:)\]}'"]+$/;

/** The links a message would have tracked. */
export function smsLinks(text: string): string[] {
  return [...text.matchAll(URL_RE)].map((m) => m[0].replace(TRAILING, ""));
}

/**
 * The text as a recipient would receive it with tracking on: each link
 * replaced by a placeholder as long as a tracked link, in plain GSM characters
 * so it never changes the encoding.
 */
export function withTrackedLinks(text: string): string {
  const placeholder = `https://${"a".repeat(TRACKED_LINK_CHARS - 8)}`;
  return text.replace(URL_RE, (raw) => {
    const trail = raw.match(TRAILING)?.[0] ?? "";
    return `${placeholder}${trail}`;
  });
}

/** What `channelsContent.sms` holds for this form state. */
export function smsContent(
  data: Pick<CampaignFormData, "smsBody" | "smsTrackLinks">
): { body: string; trackLinks: boolean } {
  return {
    body: (data.smsBody ?? "").trim(),
    trackLinks: data.smsTrackLinks === true,
  };
}

/** Form values from a saved `channelsContent.sms` (a reopened draft). */
export function smsFormValues(
  saved: Record<string, unknown>
): Pick<CampaignFormData, "smsBody" | "smsTrackLinks"> {
  const body = saved.body ?? saved.text;
  return {
    ...(typeof body === "string" ? { smsBody: body } : {}),
    smsTrackLinks: saved.trackLinks === true,
  };
}
