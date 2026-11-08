/**
 * Share and profile links for the article page. Plain URLs, no third-party
 * scripts: sharing opens the network's own composer in a new tab.
 */

export function shareOnXUrl(url: string, title: string): string {
  const params = new URLSearchParams({ text: title, url });
  return `https://x.com/intent/post?${params.toString()}`;
}

export function shareOnLinkedInUrl(url: string): string {
  const params = new URLSearchParams({ url });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/** Handles are stored without "@", but tolerate one (or a pasted profile URL). */
export function cleanHandle(handle: string | null | undefined): string | null {
  const trimmed = handle?.trim().replace(/^@/, "") ?? "";
  if (!trimmed) {
    return null;
  }

  const fromUrl = trimmed.match(/^https?:\/\/[^/]+\/@?([^/?#]+)/);
  return fromUrl ? fromUrl[1] : trimmed;
}

export function xProfileUrl(handle: string | null | undefined): string | null {
  const clean = cleanHandle(handle);
  return clean ? `https://x.com/${clean}` : null;
}

export function farcasterProfileUrl(
  handle: string | null | undefined
): string | null {
  const clean = cleanHandle(handle);
  return clean ? `https://farcaster.xyz/${clean}` : null;
}

/** "Ada Lovelace" -> "AL"; used when an author has no avatar. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return letters.map((part) => part?.[0]?.toUpperCase() ?? "").join("") || "?";
}
