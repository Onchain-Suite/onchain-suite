import { isJsonObject } from "@/lib/utils";

import type { EditorSaveBlockCheck } from "../contracts/editor-messages";
import { GENERIC_ERROR_MESSAGE } from "./presend-errors";

/**
 * "The editor could not save this design" state, shared by the page hosting
 * the editor iframe and the pages whose launch / activate buttons would ship
 * the design. Those are often different routes (the campaign wizard navigates
 * to the editor and back) or different tabs (the automation builder opens it
 * with window.open), so the state lives in this module for the tab and rides
 * a BroadcastChannel to the others. Everything degrades to a no-op without
 * `window` / `BroadcastChannel`, and nothing here runs until the editor sends
 * `EMAIL_SAVE_BLOCKED`, so an editor that never does leaves every page as is.
 */

export interface EmailSaveBlock {
  campaignId?: string;
  designId?: string;
  source: "save" | "autosave";
  code: string;
  /** The editor's one-line reason; may be empty, then the checks carry it. */
  message: string;
  rulesetVersion?: string;
  checks: EditorSaveBlockCheck[];
}

export type EditorSaveMessage =
  | { type: "blocked"; block: EmailSaveBlock }
  | { type: "cleared"; campaignId?: string; designId?: string };

export const EMAIL_SAVE_BLOCKED_REASON =
  "The latest email edit isn't saved. Fix the issue in the email editor first.";

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const toCheck = (value: unknown): EditorSaveBlockCheck | null => {
  if (!isJsonObject(value)) return null;
  const code = str(value.code);
  if (!code) return null;
  const links = Array.isArray(value.links)
    ? value.links.filter((l): l is string => typeof l === "string")
    : [];
  return {
    code,
    message: str(value.message) ?? "",
    ...(str(value.fix) ? { fix: str(value.fix) } : {}),
    ...(links.length > 0 ? { links } : {}),
  };
};

/**
 * Validate an editor postMessage into a save-block event, or null for every
 * other message. Accepts the fields at the top level or under `payload` (the
 * editor's `EMAIL_SAVED` uses the latter). A message naming neither a
 * campaign nor a design is useless to key on and is dropped, unless the
 * caller supplies the campaign it hosts.
 */
export function parseEditorSaveMessage(
  data: unknown,
  hostCampaignId?: string
): EditorSaveMessage | null {
  if (!isJsonObject(data)) return null;
  const { type } = data;
  if (type !== "EMAIL_SAVE_BLOCKED" && type !== "EMAIL_SAVE_BLOCK_CLEARED") {
    return null;
  }
  const body = isJsonObject(data.payload) ? data.payload : data;
  const campaignId = str(body.campaignId) ?? str(hostCampaignId);
  const designId = str(body.designId);
  if (!campaignId && !designId) return null;
  const ids = {
    ...(campaignId ? { campaignId } : {}),
    ...(designId ? { designId } : {}),
  };
  if (type === "EMAIL_SAVE_BLOCK_CLEARED") return { type: "cleared", ...ids };
  const message = str(body.message);
  const rulesetVersion = str(body.rulesetVersion);
  return {
    type: "blocked",
    block: {
      ...ids,
      source: body.source === "autosave" ? "autosave" : "save",
      code: str(body.code) ?? "PRESEND_BLOCKED",
      message: message && message !== GENERIC_ERROR_MESSAGE ? message : "",
      ...(rulesetVersion ? { rulesetVersion } : {}),
      checks: Array.isArray(body.checks)
        ? body.checks
            .map(toCheck)
            .filter((c): c is EditorSaveBlockCheck => c !== null)
        : [],
    },
  };
}

/** The reason to show: the editor's message, else the first check's. */
export const saveBlockReason = (block: EmailSaveBlock): string =>
  (block.message.length > 0 ? block.message : undefined) ??
  block.checks.find((c) => c.message.length > 0)?.message ??
  "a content check failed";

// ---- tab-local store, mirrored across tabs --------------------------------

const CHANNEL_NAME = "onchain:email-save-block";

const blocks = new Map<string, EmailSaveBlock>();
const listeners = new Set<() => void>();
let version = 0;
let channel: BroadcastChannel | null = null;

const keysOf = (ids: { campaignId?: string; designId?: string }) => [
  ...(ids.campaignId ? [`c:${ids.campaignId}`] : []),
  ...(ids.designId ? [`d:${ids.designId}`] : []),
];

const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};

const apply = (event: EditorSaveMessage) => {
  if (event.type === "blocked") {
    keysOf(event.block).forEach((k) => blocks.set(k, event.block));
  } else {
    // Clearing by either id clears the entry under both of its ids.
    for (const key of keysOf(event)) {
      const existing = blocks.get(key);
      blocks.delete(key);
      if (existing) keysOf(existing).forEach((k) => blocks.delete(k));
    }
  }
  emit();
};

const ensureChannel = () => {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => {
      const { data } = event;
      if (
        isJsonObject(data) &&
        (data.type === "blocked" || data.type === "cleared")
      ) {
        apply(data as EditorSaveMessage);
      }
    };
  } catch {
    channel = null;
  }
  return channel;
};

/** Record a block / clear here and tell the other tabs. Never throws. */
export function publishEditorSaveMessage(event: EditorSaveMessage): void {
  apply(event);
  try {
    ensureChannel()?.postMessage(event);
  } catch {
    // Other tabs fall back to their own state; this tab is already updated.
  }
}

export function subscribeEmailSaveBlocks(listener: () => void): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever any block is set or cleared (a useSyncExternalStore key). */
export const emailSaveBlocksVersion = (): number => version;

/** The first block recorded for any of these campaigns / designs. */
export function findEmailSaveBlock(ids: {
  campaignIds?: readonly string[];
  designIds?: readonly string[];
}): EmailSaveBlock | null {
  for (const id of ids.campaignIds ?? []) {
    const hit = id ? blocks.get(`c:${id}`) : undefined;
    if (hit) return hit;
  }
  for (const id of ids.designIds ?? []) {
    const hit = id ? blocks.get(`d:${id}`) : undefined;
    if (hit) return hit;
  }
  return null;
}

/** Tests only: forget every block. */
export function resetEmailSaveBlocks(): void {
  blocks.clear();
  emit();
}
