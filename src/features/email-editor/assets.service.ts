import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type { AssetKind, UploadedAsset } from "./contracts/assets";

export type { AssetKind, UploadedAsset } from "./contracts/assets";

/** Uploads are small images; anything slower than this has stalled. */
const UPLOAD_TIMEOUT_MS = 60_000;

const unwrap = (payload: unknown): unknown =>
  isJsonObject(payload) && "data" in payload ? payload.data : payload;

export const assetsService = {
  /** Hosts an image so a sent email can reference it by URL (inboxes block data: images). */
  async upload(
    file: File,
    {
      kind = "image",
      orgId,
      signal,
    }: { kind?: AssetKind; orgId?: string; signal?: AbortSignal } = {}
  ): Promise<UploadedAsset> {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const resolvedOrgId = orgId ?? getSelectedOrganizationId() ?? undefined;
    // Content-Type must be unset so axios writes the multipart boundary.
    const res = await apiClient.post<unknown>("/assets", form, {
      headers: {
        "Content-Type": undefined,
        ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
      },
      timeout: UPLOAD_TIMEOUT_MS,
      signal,
    });
    const data = unwrap(res.data);
    const url =
      isJsonObject(data) && typeof data.url === "string" ? data.url : "";
    if (!url) throw new Error("Upload failed: no URL came back");
    return {
      id: isJsonObject(data) && typeof data.id === "string" ? data.id : "",
      url,
      mimeType:
        isJsonObject(data) && typeof data.mimeType === "string"
          ? data.mimeType
          : undefined,
      size:
        isJsonObject(data) && typeof data.size === "number"
          ? data.size
          : undefined,
      kind,
    };
  },
};
