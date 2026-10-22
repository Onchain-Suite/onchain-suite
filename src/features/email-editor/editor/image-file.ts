/*
 * Images on their way into an email. Big uploads are the usual cause of slow,
 * clipped emails, so a file is scaled so its longest side is at most `max`
 * pixels before it is uploaded, and nobody has to resize by hand.
 */

const RESIZE_OVER_BYTES = 400_000;

export const isImageFile = (f: File | undefined | null): f is File =>
  !!f && /^image\/(png|jpe?g|gif|webp)$/.test(f.type);

export const altFromName = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

/** The file, or a smaller copy of it. GIFs pass through so they keep moving. */
export async function shrinkImage(
  file: File,
  max = 1200
): Promise<{ file: File; resized: boolean }> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function")
    return { file, resized: false };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < RESIZE_OVER_BYTES) {
      bitmap.close();
      return { file, resized: false };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, resized: false };
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, 0.85)
    );
    if (!blob || blob.size >= file.size) return { file, resized: false };
    const ext = type === "image/png" ? "png" : "jpg";
    return {
      file: new File([blob], `${altFromName(file.name) || "image"}.${ext}`, {
        type,
      }),
      resized: true,
    };
  } catch {
    return { file, resized: false };
  }
}
