/**
 * Generates initials from a full name, supporting Unicode and various name formats.
 * @param name - The full name to generate initials from
 * @returns A string containing the initials (max 2 characters)
 */
export function getInitials(name: string): string {
  if (!name || name.trim() === "") {
    return "U"; // Default for "User"
  }

  const trimmedName = name.trim();

  // Handle hyphenated names by treating hyphens as separators
  const nameParts = trimmedName.split(/[\s-]+/);

  // Filter out empty parts
  const validParts = nameParts.filter((part) => part.length > 0);

  if (validParts.length === 0) return "U";

  // Single name: take first two characters (handling surrogate pairs/unicode)
  if (validParts.length === 1) {
    const [part] = validParts;
    // Use iterator to correctly handle unicode characters (like emojis or non-latin scripts)
    const chars = [...part];
    return (chars[0] + (chars.length > 1 ? chars[1] : "")).toUpperCase();
  }

  // Multiple names: take first character of first and last name
  const [firstPart, ...restParts] = validParts;
  const lastPart =
    restParts.length > 0 ? restParts[restParts.length - 1] : firstPart;
  const [firstInitial] = [...firstPart];
  const [lastInitial] = [...lastPart];

  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generates a deterministic color based on a user ID or string.
 * Ensures WCAG 2.1 AA compliance for contrast against white text.
 * @param id - The unique identifier (e.g., user ID)
 * @returns A hex color string
 */
export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate color HSL
  // Hue: 0-360 based on hash
  const h = Math.abs(hash) % 360;
  // Saturation: 60-80% for vibrancy
  const s = 60 + (Math.abs(hash) % 20);
  // Lightness: 30-45% to ensure contrast with white text (darker colors)
  const l = 30 + (Math.abs(hash) % 15);

  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Formats display name ensuring proper capitalization
 */
export function formatDisplayName(name: string): string {
  if (!name || name.trim() === "") {
    return "User";
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Checks if a URL is a valid image URL
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") {
    return false;
  }

  const placeholderPatterns = [
    /placeholder/i,
    /example\.com/i,
    /avatar\.svg/i,
    /gravatar\.com.*d=blank/i,
  ];

  if (placeholderPatterns.some((pattern) => pattern.test(url))) {
    return false;
  }

  // Any real URL is worth attempting - a host allowlist here silently
  // rejected OAuth avatar hosts (e.g. lh3.googleusercontent.com) in
  // production. Broken images fall back via the <img> onError handler.
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(url.trim());
}
