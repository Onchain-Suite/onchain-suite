"use client";

import { createPortal } from "react-dom";

import type { MenuState } from "../../editor/extensions";
import { EditorIcon } from "../editor-icon";

/** The "/" or "{{" menu, under the cursor (or above it near the bottom of the screen). */
export function SuggestionList({ menu }: { menu: MenuState }) {
  if (!menu.rect || typeof document === "undefined") return null;
  const { rect } = menu;
  const below = rect.bottom + 300 < window.innerHeight;
  return createPortal(
    <div
      className="eed-suggest"
      role="listbox"
      aria-label={
        menu.kind === "slash" ? "Insert a block" : "Insert a merge tag"
      }
      style={{
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 280)),
        ...(below
          ? { top: rect.bottom + 6 }
          : { bottom: window.innerHeight - rect.top + 6 }),
      }}
    >
      {menu.items.length === 0 && (
        <p className="eed-suggest__none">No matches</p>
      )}
      {menu.items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          role="option"
          aria-selected={i === menu.index}
          className={i === menu.index ? "is-on" : ""}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => menu.pick(it)}
        >
          <EditorIcon name={it.icon} size={15} />
          <span>{it.label}</span>
          {it.hint && <code>{it.hint}</code>}
        </button>
      ))}
    </div>,
    document.body
  );
}
