import { isJsonObject } from "@/lib/utils";

import type { List, Segment } from "../types";
import { audienceService } from "@/features/audience/audience.service";

/**
 * Audience tags are selectable in the campaign picker as `tag:<name>` ids -
 * the backend audience contract only knows { profileIds, segmentIds }, so tag
 * selections are expanded into profileIds before saving (see
 * resolveTagsToProfileIds).
 */
export const TAG_SELECTION_PREFIX = "tag:";

export const tagSelectionId = (tagName: string) =>
  `${TAG_SELECTION_PREFIX}${tagName}`;

/**
 * Sentinel selection id for "send to every contact in the audience". It rides
 * the same `selectedAudiences` array as real ids (so it satisfies the wizard's
 * min-1 audience validation and flows through the existing autosync/Continue
 * paths), but is translated into the backend's `{ all: true }` audience flag -
 * never sent as a profile id. It is mutually exclusive with any other
 * selection (see the selector's exclusivity logic).
 */
export const ALL_CONTACTS_SELECTION_ID = "all:contacts";

export const isAllContactsSelected = (selectedIds: string[]) =>
  selectedIds.includes(ALL_CONTACTS_SELECTION_ID);

/**
 * Split a wizard selection into the buckets `PUT /campaigns/{id}/audience`
 * accepts. Its canonical body is `{ profileIds, segmentIds }` (plus the
 * `all` flag) - there is no `listIds`, so anything binned there is silently
 * dropped by the backend and the campaign launches with an empty audience.
 *
 * The `all:contacts` sentinel short-circuits everything: it maps to
 * `{ all: true }` with no profile/segment/tag ids. Otherwise anything that
 * isn't a `tag:` selection or a known segment id is treated as a profile id.
 * The `segments` argument is a membership hint; callers that can't supply it
 * (the wizard's Continue save) still produce a correct payload.
 */
export const partitionAudienceSelection = (
  selectedIds: string[],
  segments: Segment[]
) => {
  if (isAllContactsSelected(selectedIds)) {
    return {
      all: true,
      segmentIds: [] as string[],
      profileIds: [] as string[],
      tagNames: [] as string[],
    };
  }

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
      all: false,
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

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
};

const isRateLimitedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as { cause?: unknown; message?: unknown };
  const candidate = (err.cause ?? err) as {
    response?: { status?: unknown };
    status?: unknown;
    message?: unknown;
  };
  const status =
    typeof candidate.response?.status === "number"
      ? candidate.response.status
      : typeof candidate.status === "number"
        ? candidate.status
        : null;
  if (status === 429) return true;
  const msg =
    typeof err.message === "string"
      ? err.message
      : typeof candidate.message === "string"
        ? candidate.message
        : "";
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
};

const listTagProfileIds = async (
  tag: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (value: { tag: string; page: number }) => void;
  }
) => {
  const limit = 200;
  const ids: string[] = [];
  let page = 1;

  for (;;) {
    let payload!: unknown;
    let attempts = 0;
    for (;;) {
      throwIfAborted(options?.signal);
      try {
        payload = await audienceService.listProfiles(
          { tag, page, limit },
          undefined,
          { signal: options?.signal }
        );
        break;
      } catch (error) {
        if (!isRateLimitedError(error) || attempts >= 3) throw error;
        attempts += 1;
        await wait(2000 + Math.floor(Math.random() * 3000));
      }
    }
    options?.onProgress?.({ tag, page });
    const pageIds = extractProfileIds(payload);
    if (pageIds.length === 0) break;
    ids.push(...pageIds);
    if (pageIds.length < limit) break;
    page += 1;
  }

  return ids;
};

/**
 * Expand selected tag names into the tagged contacts' profile ids
 * (GET /audience/profiles?tag=). Failures per tag resolve to an empty set
 * rather than failing the whole save.
 */
export async function resolveTagsToProfileIds(
  tagNames: string[],
  options?: {
    signal?: AbortSignal;
    onProgress?: (value: {
      current: number;
      total: number;
      tag: string;
      page: number;
    }) => void;
  }
): Promise<string[]> {
  if (tagNames.length === 0) return [];
  const seen = new Set<string>();
  for (let i = 0; i < tagNames.length; i += 1) {
    const tag = tagNames[i] ?? "";
    if (!tag) continue;
    try {
      const ids = await listTagProfileIds(tag, {
        signal: options?.signal,
        onProgress: ({ page }) => {
          options?.onProgress?.({
            current: i + 1,
            total: tagNames.length,
            tag,
            page,
          });
        },
      });
      for (const id of ids) seen.add(id);
    } catch (_e) {
      String(_e);
    }
  }
  return Array.from(seen);
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

/**
 * Gate a group row (segment/list/tag) by the campaign's current channel.
 *
 * A row whose `reachableVia` is KNOWN but excludes the channel is marked
 * `disabled` with a short reason, so the picker can dim it and stop new
 * selections. A row with no reachability data (the source doesn't report it -
 * e.g. intelligence segments and tags) is left selectable: we never guess a
 * group is unreachable. `reachableVia` comes from `GET /audience/segments`
 * (email = deliverable + non-suppressed; push = connected wallet).
 */
export const reachabilityGate = (
  reachableVia: ("email" | "push")[] | undefined,
  isPush: boolean
): { disabled?: boolean; disabledHint?: string } => {
  if (!Array.isArray(reachableVia)) return {};
  const channel = isPush ? "push" : "email";
  if (reachableVia.includes(channel)) return {};
  return { disabled: true, disabledHint: isPush ? "No wallets" : "No emails" };
};
