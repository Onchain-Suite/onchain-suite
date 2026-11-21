/**
 * CSS that outlines every link in the editor canvas pointing at one of these
 * URLs, so a save refused for a shortened link shows the user where it is
 * without touching the document (a ProseMirror decoration would have to be
 * threaded through the Tiptap setup for the same effect). Matches text links
 * by exact `href`; a button block's link lives in its node attrs and is
 * listed in the dialog instead. Empty string for no links.
 */
export function linkHighlightCss(links: readonly string[]): string {
  const selectors = [...new Set(links)]
    .filter((l) => l.length > 0)
    .map((l) => `.eed-canvas a[href="${escapeCssString(l)}"]`);
  if (selectors.length === 0) return "";
  return `${selectors.join(",\n")} { outline: 2px solid var(--destructive); outline-offset: 2px; border-radius: 2px; }`;
}

/** Make a value safe inside a double-quoted CSS string. */
const escapeCssString = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r\f]/g, " ")
    .replace(/</g, "\\3c ");
