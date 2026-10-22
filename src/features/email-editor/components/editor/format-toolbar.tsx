"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { TAG_ITEMS } from "../../editor/extensions";
import { rewriteSelection } from "../../editor/rewrite-selection";
import { REWRITES } from "../../utils/rewrite";
import { EditorIcon, type EditorIconName } from "../editor-icon";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const keepFocus = (e: React.MouseEvent) => e.preventDefault();

function Tool({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: EditorIconName;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`eed-tb${active ? " is-on" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      <EditorIcon name={icon} size={16} />
    </button>
  );
}

/** Formatting for the selection: history, style, marks, lists, alignment, tags and rewrite. */
export function FormatToolbar({
  editor,
  onOpenLink,
}: {
  editor: Editor;
  onOpenLink: () => void;
}) {
  const chain = () => editor.chain().focus();
  const style = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  return (
    <div className="eed-toolbar" role="toolbar" aria-label="Formatting">
      <Tool
        label="Undo"
        icon="undo"
        disabled={!editor.can().undo()}
        onClick={() => chain().undo().run()}
      />
      <Tool
        label="Redo"
        icon="redo"
        disabled={!editor.can().redo()}
        onClick={() => chain().redo().run()}
      />
      <span className="eed-tbsep" />
      <select
        className="eed-style"
        aria-label="Text style"
        value={style}
        onChange={(e) => {
          const v = e.target.value;
          (v === "p"
            ? chain().setParagraph()
            : chain().setHeading({ level: Number(v[1]) as 1 | 2 | 3 })
          ).run();
        }}
      >
        <option value="p">Text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <span className="eed-tbsep" />
      <Tool
        label="Bold"
        icon="bold"
        active={editor.isActive("bold")}
        onClick={() => chain().toggleBold().run()}
      />
      <Tool
        label="Italic"
        icon="italic"
        active={editor.isActive("italic")}
        onClick={() => chain().toggleItalic().run()}
      />
      <Tool
        label="Underline"
        icon="underline"
        active={editor.isActive("underline")}
        onClick={() => chain().toggleUnderline().run()}
      />
      <Tool
        label="Strikethrough"
        icon="strikethrough"
        active={editor.isActive("strike")}
        onClick={() => chain().toggleStrike().run()}
      />
      <Tool
        label="Link"
        icon="link"
        active={editor.isActive("link")}
        onClick={onOpenLink}
      />
      <span className="eed-tbsep" />
      <Tool
        label="Bulleted list"
        icon="list"
        active={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
      />
      <Tool
        label="Numbered list"
        icon="list-ordered"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <Tool
        label="Quote"
        icon="quote"
        active={editor.isActive("blockquote")}
        onClick={() => chain().toggleBlockquote().run()}
      />
      <Tool
        label="Align left"
        icon="align-left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => chain().setTextAlign("left").run()}
      />
      <Tool
        label="Align center"
        icon="align-center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => chain().setTextAlign("center").run()}
      />
      <span className="eed-tbsep" />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="eed-tbtext" onMouseDown={keepFocus}>
            <EditorIcon name="braces" size={15} />
            Merge tag
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {TAG_ITEMS.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => t.run(editor)}
              className="flex justify-between gap-3"
            >
              <span>{t.label}</span>
              <code className="text-xs text-muted-foreground">{t.hint}</code>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="eed-tbtext" onMouseDown={keepFocus}>
            <EditorIcon name="sparkles" size={15} />
            Rewrite
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-72"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {REWRITES.map((r) => (
            <DropdownMenuItem
              key={r.id}
              className="flex flex-col items-start gap-0.5"
              onSelect={() => {
                const res = rewriteSelection(editor, r.id);
                toast(res.message);
              }}
            >
              <span>{r.label}</span>
              <small className="text-xs text-muted-foreground">{r.hint}</small>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** The link field that opens under the toolbar (Cmd/Ctrl+K or the link button). */
export function LinkBar({
  editor,
  draft,
  onDraft,
  onClose,
}: {
  editor: Editor;
  draft: string;
  onDraft: (v: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const apply = () => {
    const href = draft.trim();
    const c = editor.chain().focus().extendMarkRange("link");
    if (href)
      c.setLink({
        href: /^(https?:|mailto:|\{\{)/.test(href) ? href : `https://${href}`,
      }).run();
    else c.unsetLink().run();
    onClose();
  };
  return (
    <form
      className="eed-linkbar"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <EditorIcon name="link" size={14} />
      <input
        ref={ref}
        aria-label="Link address"
        placeholder="https://acme.xyz or {{ preference_center_url }}"
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <Button size="sm" type="submit">
        {draft.trim() ? "Apply" : "Remove link"}
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={onClose}>
        Cancel
      </Button>
    </form>
  );
}
