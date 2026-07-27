import { isJsonObject } from "@/lib/utils";

import type { List, Segment } from "../types";
import { audienceService } from "@/features/audience/audience.service";

/**
 * Audience tags are selectable in the campaign picker as `tag:<name>` ids —
 * the backend audience contract only knows { profileIds, segmentIds }, so tag
 * selections are expanded into profileIds before saving (see
 * resolveTagsToProfileIds).
 */
export const TAG_SELECTION_PREFIX = "tag:";

export const tagSelectionId = (tagName: string) =>
  `${TAG_SELECTION_PREFIX}${tagName}`;

/**
 * Split a wizard selection into the buckets `PUT /campaigns/{id}/audience`
 * accepts. Its canonical body is `{ profileIds, segmentIds }` — there is no
 * `listIds`, so anything binned there is silently dropped by the backend and
 * the campaign launches with an empty audience.
 *
 * Therefore anything that isn't a `tag:` selection or a known segment id is
 * treated as a profile id. The `profiles` argument is now only a hint used to
 * confirm membership; callers that can't supply it (the wizard's Continue
 * save) still produce a correct payload, which they previously did not.
 */
export const partitionAudienceSelection = (
  selectedIds: string[],
  segments: Segment[]
) => {
  const knownSegmentIds = new Set(segments.map((segment) => segment.id));

  return selectedIds.reduce(
    (result, id) => {
      if (id.startsWith(TAG_SELECTION_PREFIX)) {
        const tagName = id.slice(TAG_SELECTION_PREFIX.length);
        if (tagName.length > 0) result.tagNames.push(tagName);
      } else if (knownSegmentIds.has(id)) {
        result.segmentIds.push(id);
      } else {
        result.profileIds.push(id);
      }
      return result;
    },
    {
      segmentIds: [] as string[],
      profileIds: [] as string[],
      tagNames: [] as string[],
    }
  );
};

const extractProfileIds = (payload: unknown): string[] => {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : isJsonObject(payload)
      ? Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : isJsonObject(payload.data) && Array.isArray(payload.data.data)
            ? payload.data.data
            : []
      : [];
  return rows
    .map((row) =>
      isJsonObject(row) && typeof row.id === "string" ? row.id : ""
    )
    .filter((id) => id.length > 0);
};

/**
 * Expand selected tag names into the tagged contacts' profile ids
 * (GET /audience/profiles?tag=). Failures per tag resolve to an empty set
 * rather than failing the whole save.
 */
export async function resolveTagsToProfileIds(
  tagNames: string[]
): Promise<string[]> {
  if (tagNames.length === 0) return [];
  const results = await Promise.all(
    tagNames.map((tag) =>
      audienceService
        .listProfiles({ tag, page: 1, limit: 200 })
        .then(extractProfileIds)
        .catch(() => [] as string[])
    )
  );
  return Array.from(new Set(results.flat()));
}

export const getEstimatedRecipientsFromSelection = (
  selectedIds: string[],
  lists: List[],
  segments: Segment[]
) => {
  const listCounts = new Map(lists.map((list) => [list.id, list.count]));
  const segmentCounts = new Map(
    segments.map((segment) => [segment.id, segment.count])
  );

  return selectedIds.reduce(
    (total, id) => total + (listCounts.get(id) ?? segmentCounts.get(id) ?? 0),
    0
  );
};
