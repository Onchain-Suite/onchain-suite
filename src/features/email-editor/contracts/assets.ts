/**
 * POST /assets (multipart: `file`, `kind`). The backend stores the file and
 * returns the asset row; `url` is a durable read URL safe to put in an email.
 * Images must be png, jpeg, gif or webp, or it answers 400.
 */
export type AssetKind = "image" | "font";

export interface UploadedAsset {
  id: string;
  /** Durable public URL, what an <img src> in a sent email points at. */
  url: string;
  mimeType?: string;
  size?: number;
  kind?: AssetKind;
}
