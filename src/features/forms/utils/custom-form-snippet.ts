/**
 * Build copy-paste request examples for posting to a capture form's PUBLIC
 * submit endpoint from a hand-built form (no SDK, no login - the form's public
 * token in the URL is the only credential).
 *
 * The body shape mirrors what the hosted form sends and what the backend's
 * public submit accepts: `{ fields: { <key>: <value> }, consent: true }`. The
 * backend's ValidationPipe runs `whitelist: true`, so only declared keys survive
 * - `fields` and `consent` are the two a manual integration needs.
 */
import type { CaptureFieldSpec } from "../forms.service";

/** A realistic placeholder value for a field, by type then key. */
export const placeholderForField = (field: CaptureFieldSpec): string => {
  const key = field.key.toLowerCase();
  const { type } = field;
  if (type === "email" || key === "email") return "you@example.com";
  if (type === "wallet" || key.includes("wallet") || key.includes("address"))
    return "0x0000000000000000000000000000000000000000";
  if (type === "x" || key === "x" || key === "twitter") return "@handle";
  if (type === "farcaster" || key === "farcaster" || key === "fid")
    return "your-fid";
  if (key === "telegram" || key === "discord") return "@handle";
  return "value";
};

/**
 * The example `fields` object: every declared field keyed to a placeholder.
 * Falls back to a lone `email` when the form declares no fields, so the example
 * is never an empty object (the backend needs at least an email or a wallet).
 */
export const exampleFieldsObject = (
  fields: CaptureFieldSpec[]
): Record<string, string> => {
  if (fields.length === 0) return { email: "you@example.com" };
  const out: Record<string, string> = {};
  for (const field of fields) out[field.key] = placeholderForField(field);
  return out;
};

const exampleBody = (fields: CaptureFieldSpec[]) => ({
  fields: exampleFieldsObject(fields),
  consent: true,
});

/** A `curl` example posting to the public submit endpoint. */
export const buildCurlExample = (
  submitUrl: string,
  fields: CaptureFieldSpec[]
): string => {
  const body = JSON.stringify(exampleBody(fields), null, 2);
  return [
    `curl -X POST '${submitUrl}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${body}'`,
  ].join("\n");
};

/** A browser `fetch` example for wiring up a hand-built HTML form. */
export const buildFetchExample = (
  submitUrl: string,
  fields: CaptureFieldSpec[]
): string => {
  const body = JSON.stringify(exampleBody(fields), null, 2)
    .split("\n")
    .join("\n  ");
  return [
    `await fetch("${submitUrl}", {`,
    `  method: "POST",`,
    `  headers: { "Content-Type": "application/json" },`,
    `  body: JSON.stringify(${body}),`,
    `});`,
  ].join("\n");
};
