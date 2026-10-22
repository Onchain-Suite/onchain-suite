"use client";

import type { EditorDevice } from "./top-bar";

export interface PreviewAudience {
  /** "" for everyone, "none" for a contact with no tags, or "tag:<name>". */
  value: string;
  label: string;
  /** The contact's tags; null means "everyone", which shows every section. */
  tags: string[] | null;
}

/** Who Preview can render for: everyone, nobody special, or a contact with each section's tag. */
export function previewAudiences(sectionTags: string[]): PreviewAudience[] {
  return [
    { value: "", label: "Everyone (sample values)", tags: null },
    ...(sectionTags.length
      ? [
          {
            value: "none",
            label: "A contact with none of these tags",
            tags: [],
          },
        ]
      : []),
    ...sectionTags.map((t) => ({
      value: `tag:${t}`,
      label: `A contact tagged ${t}`,
      tags: [t],
    })),
  ];
}

/** The real inbox HTML, rendered in a sandboxed frame at the chosen width. */
export function EmailPreview({
  html,
  device,
  audiences,
  audience,
  hiddenSections,
  onAudience,
}: {
  html: string;
  device: EditorDevice;
  audiences: PreviewAudience[];
  audience: PreviewAudience;
  hiddenSections: string[];
  onAudience: (value: string) => void;
}) {
  const note = !audience.tags
    ? audiences.length > 1
      ? "Every section shows with sample values. Pick a contact to see exactly what they get."
      : "Merge tags show sample values."
    : hiddenSections.length
      ? `${hiddenSections.length} section${hiddenSections.length === 1 ? "" : "s"} hidden: ${hiddenSections.join(", ")}`
      : "This contact sees every section";
  return (
    <div className="eed-preview">
      <div className="eed-previewbar">
        <label htmlFor="eed-person">Preview as</label>
        <select
          id="eed-person"
          value={audience.value}
          onChange={(e) => onAudience(e.target.value)}
        >
          {audiences.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <span className="eed-previewnote">{note}</span>
      </div>
      <div
        className="eed-frame"
        style={{ width: device === "mobile" ? 375 : 640 }}
      >
        {/* No scripts run in here: the HTML has none, and the sandbox would stop them if it did. */}
        <iframe
          title="Email preview"
          srcDoc={html}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
