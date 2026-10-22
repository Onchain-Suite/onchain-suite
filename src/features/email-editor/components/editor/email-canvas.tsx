"use client";

import { type Editor, EditorContent } from "@tiptap/react";
import { memo } from "react";

import { findMergeTag, TAG_TOKEN } from "../../data/merge-tags";
import { EditorIcon } from "../editor-icon";
import type { EditorDevice } from "./top-bar";

/** One footer line with its merge tags shown as chips, as they look in the body. */
const FooterLine = memo(function FooterLine({ line }: { line: string }) {
  const parts: { text: string; tag?: string }[] = [];
  let last = 0;
  for (const m of line.matchAll(new RegExp(TAG_TOKEN.source, "gi"))) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index) });
    parts.push({ text: m[0], tag: m[1] });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return (
    <span className="eed-footer__line">
      {parts.map((p, i) => {
        const t = p.tag ? findMergeTag(p.tag) : undefined;
        return t ? (
          <span key={i} className="eed-tag">
            {t.label}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        );
      })}
    </span>
  );
});

/*
 * The body you type into, and under it the compliance footer. The footer is
 * not part of the document: it is the one thing nobody may delete, and keeping
 * it outside the editable body makes that structural rather than a rule every
 * editing command has to remember.
 */
export function EmailCanvas({
  editor,
  device,
  footer,
  footerSelected,
  onSelectFooter,
}: {
  editor: Editor;
  device: EditorDevice;
  footer: string;
  footerSelected: boolean;
  onSelectFooter: () => void;
}) {
  return (
    <div
      className="eed-canvas"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) editor.commands.focus("end");
      }}
    >
      <div
        className="eed-mail"
        style={{ maxWidth: device === "mobile" ? 375 : 640 }}
      >
        <EditorContent editor={editor} />
        <div
          className={`eed-footer${footerSelected ? " is-on" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Edit footer"
          onClick={onSelectFooter}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectFooter();
            }
          }}
        >
          <span className="eed-footer__lock">
            <EditorIcon name="lock" size={11} />
            Required footer
          </span>
          {footer.split("\n").map((line, i) => (
            <FooterLine key={i} line={line} />
          ))}
        </div>
      </div>
    </div>
  );
}
