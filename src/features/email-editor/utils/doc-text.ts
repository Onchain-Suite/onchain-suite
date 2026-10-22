import {
  defaultFallback,
  needsFallback,
  REQUIRED_TAGS,
  TAG_TOKEN,
} from "../data/merge-tags";
import type { DocNode } from "../types/email-doc";

/**
 * Reading an email document without an editor: its text, which required tags
 * it is missing, which recipient tags need a fallback, and which tag sections
 * a given contact would see.
 */

/** A section's rule: shown only to contacts with a tag, or to everyone without it. */
export interface SectionRule {
  tag: string;
  mode: "only" | "except";
}

export const sectionRule = (
  attrs: Record<string, unknown> | undefined
): SectionRule => ({
  tag: String(attrs?.tag ?? ""),
  mode: attrs?.mode === "except" ? "except" : "only",
});

/**
 * Every piece of text in the body, merge tags as `{{ key }}`. `everyone` leaves
 * out tag sections, since only some recipients see those.
 */
export function docText(node: DocNode, { everyone = false } = {}): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mergeTag") return `{{ ${String(node.attrs?.key ?? "")} }}`;
  if (node.type === "emailButton") return String(node.attrs?.label ?? "");
  if (everyone && node.type === "tagSection") return "";
  return (node.content ?? [])
    .map((c) => docText(c, { everyone }))
    .join(node.type === "doc" ? "\n" : "");
}

/** Keys of every `{{ key }}` token in a string (the footer, a link). */
export const tagKeysIn = (text: string): string[] =>
  Array.from(text.matchAll(TAG_TOKEN), (m) => m[1]);

/** Keys of every merge tag in what every recipient gets: the body and the footer. */
function keysEveryoneSees(doc: DocNode, footer: string): Set<string> {
  const keys = new Set(tagKeysIn(footer));
  const walk = (n: DocNode) => {
    if (n.type === "tagSection") return;
    if (n.type === "mergeTag") keys.add(String(n.attrs?.key ?? ""));
    for (const m of n.marks ?? []) {
      if (m.type === "link")
        tagKeysIn(String(m.attrs?.href ?? "")).forEach((k) => keys.add(k));
    }
    if (n.type === "emailButton")
      tagKeysIn(String(n.attrs?.href ?? "")).forEach((k) => keys.add(k));
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return keys;
}

/**
 * Required tags missing from what every recipient gets. A tag inside a section
 * for one tag doesn't count: everyone outside it would get an email without it.
 */
export const missingRequiredTags = (doc: DocNode, footer: string): string[] => {
  const seen = keysEveryoneSees(doc, footer);
  return REQUIRED_TAGS.filter((k) => !seen.has(k));
};

/**
 * Every recipient tag in the body, once each, with its fallback. Where the same
 * tag appears with different fallbacks, an empty one wins, so the author sees
 * that some copy of it has none.
 */
export function recipientTags(
  doc: DocNode
): { key: string; fallback: string }[] {
  const out = new Map<string, string>();
  const walk = (n: DocNode) => {
    if (n.type === "mergeTag") {
      const key = String(n.attrs?.key ?? "");
      if (needsFallback(key)) {
        const fb = String(n.attrs?.fallback ?? "");
        out.set(key, out.has(key) && (!out.get(key) || !fb) ? "" : fb);
      }
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return Array.from(out, ([key, fallback]) => ({ key, fallback }));
}

/** The fallback a newly inserted chip starts with. */
export const initialFallback = (key: string): string => defaultFallback(key);

/** Every tag a section in the document is keyed on, once each. */
export function sectionTags(doc: DocNode): string[] {
  const tags = new Set<string>();
  const walk = (n: DocNode) => {
    if (n.type === "tagSection") {
      const { tag } = sectionRule(n.attrs);
      if (tag) tags.add(tag);
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return Array.from(tags);
}

/**
 * Does a section show for a contact with these tags? `null` means "no one in
 * particular", which shows every section.
 */
export function sectionShows(
  attrs: Record<string, unknown> | undefined,
  contactTags: string[] | null
): boolean {
  if (!contactTags) return true;
  const { tag, mode } = sectionRule(attrs);
  // No tag picked yet: sent to everyone, so previewed for everyone.
  if (!tag) return true;
  const has = contactTags.includes(tag);
  return mode === "except" ? !has : has;
}

/** The sections a contact with these tags would not see, described for the preview bar. */
export function hiddenSections(
  doc: DocNode,
  contactTags: string[] | null
): string[] {
  const out: string[] = [];
  const walk = (n: DocNode) => {
    if (n.type === "tagSection" && !sectionShows(n.attrs, contactTags)) {
      const { tag, mode } = sectionRule(n.attrs);
      out.push(`${mode === "except" ? "everyone except" : "only"} ${tag}`);
      return;
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return out;
}
