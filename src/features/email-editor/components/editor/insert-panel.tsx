"use client";

import type { Editor } from "@tiptap/react";
import { memo } from "react";

import { BLOCKS } from "../../editor/blocks";
import { EditorIcon } from "../editor-icon";

const MOD =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl";

/** The left column: every block as a button, and the shortcuts that do the same from the keyboard. */
export const InsertPanel = memo(function InsertPanel({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  return (
    <aside className="eed-left" aria-label="Insert a block">
      <span className="eed-lbl">Insert</span>
      <div className="eed-blocks">
        {BLOCKS.map((b) => (
          <button
            key={b.id}
            type="button"
            className="eed-block"
            disabled={disabled || !editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor && b.run(editor)}
          >
            <EditorIcon name={b.icon} size={16} />
            {b.label}
          </button>
        ))}
      </div>
      <div className="eed-tips">
        <span className="eed-lbl">Shortcuts</span>
        <p>
          <kbd>/</kbd> any block
        </p>
        <p>
          <kbd>{"{{"}</kbd> merge tag
        </p>
        <p>
          <kbd>#</kbd> heading, <kbd>-</kbd> list, <kbd>&gt;</kbd> quote
        </p>
        <p>
          <kbd>{MOD}</kbd>
          <kbd>B</kbd> bold, <kbd>{MOD}</kbd>
          <kbd>K</kbd> link
        </p>
        <p>Drop an image file anywhere in the email.</p>
      </div>
    </aside>
  );
});
