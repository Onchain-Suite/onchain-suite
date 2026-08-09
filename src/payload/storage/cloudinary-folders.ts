/**
 * Where blog assets live inside the Cloudinary account, and the rules for moving
 * them there.
 *
 * Layout:
 *
 *   onchainsuite/blog/_unassigned/<file>   just uploaded, not on a post yet
 *   onchainsuite/blog/<post-slug>/<file>   claimed by a post
 *
 * Media is uploaded independently of posts — Payload's upload drawer creates the
 * media document on its own, often before the post has been saved — so the
 * destination folder is not knowable at upload time. Assets therefore land in
 * `_unassigned` and are moved when a post that references them is saved. See
 * src/payload/hooks/organize-post-media.ts.
 *
 * Everything here is pure string work so the policy can be tested without
 * Cloudinary, a database or a Payload instance.
 */

/** Root for everything this CMS uploads. Nothing outside it is ever touched. */
export const CLOUDINARY_ROOT = "onchainsuite/blog";

/** Holding folder for media that no post references yet. */
export const UNASSIGNED_SEGMENT = "_unassigned";

/** Used when a post has no usable slug (unsaved, or slug not yet generated). */
const FALLBACK_SEGMENT = "untitled";

/**
 * Longest folder segment we will create. Cloudinary allows far more, but a
 * slug-derived folder that runs to hundreds of characters is unusable in the
 * media library, which is the entire reason for having folders.
 */
const MAX_SEGMENT_LENGTH = 80;

/**
 * Cap on the file's own name after prefixing. Cloudinary allows far more; this
 * just stops a long slug plus a long filename from compounding.
 */
const MAX_PUBLIC_ID_BASENAME = 150;

/**
 * Reduces a slug to something safe and readable as a single Cloudinary folder
 * segment. Notably strips `/`, which would otherwise silently create nested
 * folders and break the "one folder per post" invariant.
 */
export function sanitizeFolderSegment(value: unknown): string {
  if (typeof value !== "string") {
    return FALLBACK_SEGMENT;
  }

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH)
    // A trailing dash can appear after slicing.
    .replace(/-+$/g, "");

  return cleaned || FALLBACK_SEGMENT;
}

/** The folder segment a given post owns. */
export function postFolderSegment(post: {
  id?: number | string | null;
  slug?: unknown;
}): string {
  if (typeof post.slug === "string" && post.slug.trim()) {
    return sanitizeFolderSegment(post.slug);
  }
  // Falling back to the id keeps assets grouped even for a post whose slug has
  // not been generated yet; it is stable and unique, just not pretty.
  if (post.id !== undefined && post.id !== null && post.id !== "") {
    return sanitizeFolderSegment(`post-${String(post.id)}`);
  }
  return FALLBACK_SEGMENT;
}

/** Full folder path for a segment. */
export function folderFor(segment: string): string {
  return `${CLOUDINARY_ROOT}/${segment}`;
}

/** The last path component of a public id — the file's own name. */
export function basenameOf(publicId: string): string {
  const index = publicId.lastIndexOf("/");
  return index === -1 ? publicId : publicId.slice(index + 1);
}

/** Everything before the basename. */
export function folderOf(publicId: string): string {
  const index = publicId.lastIndexOf("/");
  return index === -1 ? "" : publicId.slice(0, index);
}

/**
 * The folder segment immediately under the blog root, or null when the asset is
 * not under our root at all.
 */
export function segmentOf(publicId: string): string | null {
  const folder = folderOf(publicId);
  if (folder === CLOUDINARY_ROOT) {
    // Directly in the root — an asset from before folders existed.
    return "";
  }
  const prefix = `${CLOUDINARY_ROOT}/`;
  if (!folder.startsWith(prefix)) {
    return null;
  }
  return folder.slice(prefix.length);
}

/**
 * The file's own name, prefixed with the post it belongs to.
 *
 * The folder already says which post owns an asset, but the name is what shows up
 * in Cloudinary's search, in the media library's flat views and in the delivery
 * URL — so `my-post-hero.png` is findable where a bare `hero.png` is not.
 *
 * Idempotent: an already-prefixed name is left alone, so re-saving a post does
 * not produce `my-post-my-post-hero`.
 */
export function prefixedBasename(publicId: string, segment: string): string {
  const basename = basenameOf(publicId);
  if (basename === segment || basename.startsWith(`${segment}-`)) {
    return basename;
  }
  return `${segment}-${basename}`.slice(0, MAX_PUBLIC_ID_BASENAME);
}

/**
 * Where a public id should end up for a given post: that post's folder, with a
 * name that identifies the post.
 */
export function targetPublicId(publicId: string, segment: string): string {
  return `${folderFor(segment)}/${prefixedBasename(publicId, segment)}`;
}

/**
 * Whether an asset should be moved into `segment`.
 *
 * The policy, and why:
 *
 * - Not under our root -> never touch it. It belongs to something else in the
 *   Cloudinary account (the product's own branding uploads live there too).
 * - Already at its destination -> nothing to do. Without this check every post
 *   save would issue a pointless rename.
 * - In `_unassigned`, or loose in the blog root -> move it. This is the normal
 *   path for a freshly uploaded image.
 * - In the right folder but not yet name-prefixed -> rename it. This is what
 *   brings assets filed before prefixing existed up to date.
 * - Already inside a *different* post's folder -> leave it. The same image can be
 *   referenced by two posts, and one folder cannot hold it twice; whichever post
 *   claimed it first keeps it. Moving it on every save of either post would mean
 *   its URL changed constantly and the other post's cached page would go stale.
 */
export function shouldMove(publicId: string, segment: string): boolean {
  const current = segmentOf(publicId);

  if (current === null) {
    return false;
  }
  if (publicId === targetPublicId(publicId, segment)) {
    return false;
  }
  return (
    current === UNASSIGNED_SEGMENT || current === "" || current === segment
  );
}
