"use client";

import type { Editor } from "@tiptap/react";

import { MERGE_TAGS } from "../../data/merge-tags";
import { insertTag } from "../../editor/extensions";

const BODY_TAGS = MERGE_TAGS.filter((t) => t.group !== "Compliance");

/** Shown while typing: how to format, and the merge tags to drop in. */
export function TextPanel({ editor }: { editor: Editor }) {
  return (
    <>
      <span className="eed-lbl">Text</span>
      <p className="eed-hint">
        Select text to format it, or rewrite it from the toolbar. Click a
        button, image or the footer to edit it here.
      </p>
      <span className="eed-lbl">Merge tags</span>
      <div className="eed-tags">
        {BODY_TAGS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="eed-tagbtn"
            title={`{{ ${t.key} }} (sample: ${t.sample || "blank"})`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertTag(editor, t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="eed-hint">
        Tags fill in per person when the email sends. Preview shows them with
        sample values.
      </p>
    </>
  );
}
