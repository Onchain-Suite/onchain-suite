import type { Field } from "payload";

/**
 * URL-safe slug derivation. Deliberately conservative: strips diacritics, drops
 * anything that is not alphanumeric or a hyphen, and collapses runs of
 * separators so a title like "Base's L2 — Q3 Recap!" yields "bases-l2-q3-recap".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A unique, indexed slug that auto-fills from another field but stays editable.
 *
 * Indexed because every public blog route looks a document up by slug; unique
 * because two posts sharing a slug would make one of them unreachable.
 */
export function slugField(sourceField = "title"): Field {
  return {
    name: "slug",
    type: "text",
    index: true,
    unique: true,
    admin: {
      position: "sidebar",
      description:
        "Auto-filled from the title. Safe to edit before publishing; changing it after publishing breaks existing links.",
    },
    hooks: {
      beforeValidate: [
        ({ data, value }) => {
          // An explicit value always wins, so an editor can override the
          // generated slug (and so re-saving never silently rewrites it).
          if (typeof value === "string" && value.length > 0) {
            return slugify(value);
          }

          const source = data?.[sourceField];
          return typeof source === "string" && source.length > 0
            ? slugify(source)
            : value;
        },
      ],
    },
  };
}
