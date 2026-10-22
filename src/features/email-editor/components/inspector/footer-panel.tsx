"use client";

import { useRef } from "react";

import {
  DEFAULT_FOOTER,
  MERGE_TAGS,
  REQUIRED_TAGS,
  tagToken,
} from "../../data/merge-tags";
import { EditorIcon } from "../editor-icon";

const REQUIRED = new Set<string>(REQUIRED_TAGS);

/** The compliance footer: reword it freely, but the unsubscribe link and postal address must stay. */
export function FooterPanel({
  footer,
  missing,
  onChange,
}: {
  footer: string;
  missing: string[];
  onChange: (f: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (key: string) => {
    const token = tagToken(key);
    const el = ref.current;
    const at =
      el && typeof el.selectionStart === "number"
        ? el.selectionStart
        : footer.length;
    onChange(footer.slice(0, at) + token + footer.slice(at));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  return (
    <>
      <span className="eed-lbl">Footer</span>
      <p className="eed-lock">
        <EditorIcon name="lock" size={13} />
        Required by law. Every email must say who sent it and how to
        unsubscribe. Reword it freely; it cannot be removed.
      </p>
      <label className="eed-field">
        <span>Footer text</span>
        <textarea
          ref={ref}
          rows={6}
          value={footer}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {missing.length > 0 && (
        <p className="eed-warn">
          <EditorIcon name="triangle-alert" size={13} />
          Missing {missing.join(", ")}. The email cannot send without them.
        </p>
      )}
      <span className="eed-lbl">Insert a merge tag</span>
      <div className="eed-tags">
        {MERGE_TAGS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`eed-tagbtn${REQUIRED.has(t.key) ? " is-req" : ""}`}
            onClick={() => insert(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="eed-link"
        onClick={() => onChange(DEFAULT_FOOTER)}
      >
        Reset to the standard footer
      </button>
    </>
  );
}
