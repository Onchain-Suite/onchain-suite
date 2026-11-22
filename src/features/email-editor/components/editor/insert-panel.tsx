"use client";

import type { Editor } from "@tiptap/react";
import { memo, useEffect, useState } from "react";

import { BLOCKS } from "../../editor/blocks";
import { EditorIcon } from "../editor-icon";

const isMacPlatform = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The left column: every block as a button, and the shortcuts that do the same from the keyboard. */
export const InsertPanel = memo(function InsertPanel({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  // Platform detection is client-only, so render a stable "Ctrl" on the server
  // and first paint, then swap in the Mac symbol after mount to avoid a
  // hydration mismatch (⌘ vs Ctrl).
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (isMacPlatform()) setMod("⌘");
  }, []);

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
          <kbd>{mod}</kbd>
          <kbd>B</kbd> bold, <kbd>{mod}</kbd>
          <kbd>K</kbd> link
        </p>
        <p>Drop an image file anywhere in the email.</p>
      </div>
    </aside>
  );
});
