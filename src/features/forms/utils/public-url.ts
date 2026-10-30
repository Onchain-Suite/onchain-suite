/**
 * The public URL a hosted form is shared at. Published forms live on their own
 * host (`forms.onchainsuite.com/<token>`, Option 2 - one fixed host, not a
 * per-org wildcard); `NEXT_PUBLIC_FORMS_HOST` overrides it per environment.
 * Falls back to the app-relative `/f/<token>` only when no host is configured
 * (local dev, previews), so copied links there still open in the running app.
 */
export function publicFormUrl(token: string): string {
  const host = process.env.NEXT_PUBLIC_FORMS_HOST?.trim();
  if (host) return `https://${host}/${token}`;
  if (typeof window !== "undefined")
    return `${window.location.origin}/f/${token}`;
  return `/f/${token}`;
}
