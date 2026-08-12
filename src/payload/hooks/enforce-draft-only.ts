import { APIError, type CollectionBeforeChangeHook } from "payload";

import { canAccessCms, canPublish } from "@/payload/access/roles";

/**
 * Stops an editor from publishing.
 *
 * Access control decides *which documents* someone may touch; it cannot see the
 * `_status` value being written. So `canEditPost` confines editors to documents
 * that are not live, and this hook confines the status they may set on them.
 * Both halves are needed: without this, an editor could flip their own draft to
 * `published` and reach the public site unreviewed.
 *
 * An explicit publish attempt is refused loudly rather than silently downgraded,
 * so the admin panel shows a real message instead of appearing to succeed while
 * quietly doing something else. Any other write is pinned to `draft`.
 */
export const enforceDraftOnly: CollectionBeforeChangeHook = ({ data, req }) => {
  const role = (req.user as { role?: unknown } | null | undefined)?.role;

  // Publishers are unaffected. Users with no CMS role never get this far -
  // access control has already rejected them - so this is a safety net only.
  if (canPublish(role) || !canAccessCms(role)) {
    return data;
  }

  if (data._status === "published") {
    // APIError rather than Forbidden: Forbidden takes only a translation
    // function, and a generic "you are not allowed to perform this action" does
    // not tell the editor what to do instead. The final `true` marks the message
    // public so the admin panel actually displays it.
    throw new APIError(
      "Editors cannot publish. Save it as a draft and ask an admin to publish it.",
      403,
      null,
      true
    );
  }

  return { ...data, _status: "draft" };
};
