"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  type EmailSaveBlock,
  emailSaveBlocksVersion,
  findEmailSaveBlock,
  subscribeEmailSaveBlocks,
} from "../utils/email-save-block";

/**
 * The editor's "this design isn't saved" block for any of these campaigns or
 * designs, or null. Re-renders only when a block is set or cleared. Ids are
 * compared by value, so callers may pass fresh arrays each render.
 */
export function useEmailSaveBlock(ids: {
  campaignIds?: readonly string[];
  designIds?: readonly string[];
}): EmailSaveBlock | null {
  const version = useSyncExternalStore(
    subscribeEmailSaveBlocks,
    emailSaveBlocksVersion,
    () => 0
  );
  const campaignKey = (ids.campaignIds ?? []).join("\u0000");
  const designKey = (ids.designIds ?? []).join("\u0000");
  return useMemo(
    () =>
      findEmailSaveBlock({
        campaignIds: campaignKey ? campaignKey.split("\u0000") : [],
        designIds: designKey ? designKey.split("\u0000") : [],
      }),
    // `version` is the store's change signal; the keys are the ids by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignKey, designKey, version]
  );
}
