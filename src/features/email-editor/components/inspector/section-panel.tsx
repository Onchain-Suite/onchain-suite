"use client";

import { useQuery } from "@tanstack/react-query";

import { EditorIcon } from "../editor-icon";
import { audienceService } from "@/features/audience/audience.service";
import { Button } from "@/shared/components/ui/button";

/** Tag names from GET /audience/tags; the backend tests sections against contact tag names. */
function useTagNames(orgId?: string) {
  return useQuery({
    queryKey: ["audience", "tags", "email-editor", orgId],
    queryFn: async () => {
      const res = await audienceService.listTags(orgId);
      const rows = Array.isArray(res) ? res : (res.items ?? res.data ?? []);
      return rows.map((r) => String(r.name ?? "").trim()).filter(Boolean);
    },
  });
}

/** A tag section: who sees it, and the way back to "everyone". */
export function SectionPanel({
  tag,
  mode,
  orgId,
  onChange,
  onUnwrap,
}: {
  tag: string;
  mode: "only" | "except";
  orgId?: string;
  onChange: (attrs: { tag?: string; mode?: "only" | "except" }) => void;
  onUnwrap: () => void;
}) {
  const tags = useTagNames(orgId);
  const names = tags.data ?? [];
  const options = tag && !names.includes(tag) ? [tag, ...names] : names;
  return (
    <>
      <span className="eed-lbl">Section for a tag</span>
      <p className="eed-hint">
        One send, different content: only the contacts this matches see what is
        inside.
      </p>
      <div className="eed-field">
        <span>Show to</span>
        <div
          className="eed-seg eed-seg--fill"
          role="group"
          aria-label="Who sees this section"
        >
          <button
            type="button"
            aria-pressed={mode !== "except"}
            onClick={() => onChange({ mode: "only" })}
          >
            Only tagged
          </button>
          <button
            type="button"
            aria-pressed={mode === "except"}
            onClick={() => onChange({ mode: "except" })}
          >
            Everyone except
          </button>
        </div>
      </div>
      <label className="eed-field">
        <span>Tag</span>
        <select
          value={tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          disabled={tags.isLoading}
        >
          <option value="">
            {tags.isLoading ? "Loading tags…" : "Pick a tag"}
          </option>
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {tags.isError && (
        <p className="eed-warn">
          <EditorIcon name="triangle-alert" size={13} />
          Couldn&apos;t load your tags. Try again in a moment.
        </p>
      )}
      {!tags.isLoading && !tags.isError && names.length === 0 && (
        <p className="eed-hint">
          No tags yet. Tag contacts in Audience, then pick one here.
        </p>
      )}
      {!tag && (
        <p className="eed-hint">
          Until a tag is picked, everyone sees this section.
        </p>
      )}
      <p className="eed-hint">
        Check it in Preview: pick a contact with and without the tag.
      </p>
      <Button variant="ghost" size="sm" onClick={onUnwrap}>
        <EditorIcon name="x" size={14} />
        Show to everyone
      </Button>
    </>
  );
}
