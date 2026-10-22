"use client";

import type { Node as PMNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

import { altFromName, isImageFile } from "../../editor/image-file";
import { uploadImage } from "../../hooks/use-email-tiptap";
import { isSafeUrl, sanitizeEmailHtml } from "../../utils/email-safety";
import { EditorIcon } from "../editor-icon";
import { Button } from "@/shared/components/ui/button";

export const ATOM_LABEL: Record<string, string> = {
  emailButton: "Button",
  emailImage: "Image",
  spacer: "Spacer",
  socialLinks: "Social links",
  htmlBlock: "Custom HTML",
};

type Attrs = Record<string, unknown>;

function UnsafeLink({ href }: { href: string }) {
  if (isSafeUrl(href)) return null;
  return (
    <p className="eed-warn">
      <EditorIcon name="triangle-alert" size={13} />
      Only web, mailto and merge-tag links can be sent. This one will be
      removed.
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="eed-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ButtonFields({
  attrs,
  set,
}: {
  attrs: Attrs;
  set: (a: Attrs) => void;
}) {
  return (
    <>
      <Field label="Button label">
        <input
          value={String(attrs.label ?? "")}
          onChange={(e) => set({ label: e.target.value })}
        />
      </Field>
      <Field label="Link">
        <input
          value={String(attrs.href ?? "")}
          placeholder="https://acme.xyz/season-2"
          onChange={(e) => set({ href: e.target.value })}
        />
      </Field>
      <UnsafeLink href={String(attrs.href ?? "")} />
      <div className="eed-field">
        <span>Alignment</span>
        <div
          className="eed-seg eed-seg--fill"
          role="group"
          aria-label="Button alignment"
        >
          <button
            type="button"
            aria-pressed={attrs.align !== "center"}
            onClick={() => set({ align: "left" })}
          >
            Left
          </button>
          <button
            type="button"
            aria-pressed={attrs.align === "center"}
            onClick={() => set({ align: "center" })}
          >
            Center
          </button>
        </div>
      </div>
      <p className="eed-hint">
        Built as a bulletproof button, so Outlook shows it as a button rather
        than a bare link.
      </p>
    </>
  );
}

function ImageFields({
  editor,
  pos,
  attrs,
  set,
  orgId,
}: {
  editor: Editor;
  pos: number;
  attrs: Attrs;
  set: (a: Attrs) => void;
  orgId?: string;
}) {
  const onFile = async (file: File | undefined) => {
    if (!isImageFile(file)) return;
    const src = await uploadImage(file, orgId);
    // The upload takes a moment: the URL goes to this image wherever the
    // selection has moved since, and nowhere if the editor has closed.
    if (!src || editor.isDestroyed) return;
    const node = editor.state.doc.nodeAt(pos);
    if (node?.type.name !== "emailImage") return;
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src,
        alt: String(node.attrs.alt) || altFromName(file.name),
      })
    );
  };
  return (
    <>
      <Field label="Upload">
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </Field>
      <Field label="Or image URL">
        <input
          value={String(attrs.src ?? "")}
          placeholder="https://…/key-art.png"
          onChange={(e) => set({ src: e.target.value })}
        />
      </Field>
      <Field label="Alt text">
        <input
          value={String(attrs.alt ?? "")}
          onChange={(e) => set({ alt: e.target.value })}
        />
      </Field>
      <p className="eed-hint">
        Read aloud by screen readers, and shown when images are off, which many
        inboxes do by default.
      </p>
      <Field label="Caption">
        <input
          value={String(attrs.caption ?? "")}
          onChange={(e) => set({ caption: e.target.value })}
        />
      </Field>
      <Field label="Link when clicked">
        <input
          value={String(attrs.href ?? "")}
          placeholder="Optional"
          onChange={(e) => set({ href: e.target.value })}
        />
      </Field>
      <UnsafeLink href={String(attrs.href ?? "")} />
    </>
  );
}

function SocialFields({
  attrs,
  set,
}: {
  attrs: Attrs;
  set: (a: Attrs) => void;
}) {
  const all = (attrs.links as { label: string; url: string }[] | null) ?? [];
  const put = (i: number, patch: Partial<{ label: string; url: string }>) =>
    set({ links: all.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <>
      {all.map((l, i) => (
        <div className="eed-social-row" key={i}>
          <input
            aria-label={`Link ${i + 1} label`}
            value={l.label}
            onChange={(e) => put(i, { label: e.target.value })}
          />
          <input
            aria-label={`Link ${i + 1} address`}
            value={l.url}
            onChange={(e) => put(i, { url: e.target.value })}
          />
          <button
            type="button"
            aria-label={`Remove ${l.label}`}
            onClick={() => set({ links: all.filter((_, j) => j !== i) })}
          >
            <EditorIcon name="x" size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="eed-link"
        onClick={() =>
          set({ links: [...all, { label: "New link", url: "https://" }] })
        }
      >
        Add a link
      </button>
    </>
  );
}

function HtmlFields({ attrs, set }: { attrs: Attrs; set: (a: Attrs) => void }) {
  const html = String(attrs.html ?? "");
  const { removed } = sanitizeEmailHtml(html);
  return (
    <>
      <Field label="HTML">
        <textarea
          className="eed-code"
          rows={9}
          spellCheck={false}
          value={html}
          onChange={(e) => set({ html: e.target.value })}
        />
      </Field>
      <p className={removed ? "eed-warn" : "eed-hint"}>
        {removed
          ? `${removed} thing${removed === 1 ? "" : "s"} removed: scripts, frames, video, forms and event handlers never reach an inbox.`
          : "Scripts, frames, video, forms and event handlers are removed before sending. Inboxes block them anyway."}
      </p>
    </>
  );
}

/** Settings for the selected button, image, spacer, social row or HTML block. */
export function AtomPanel({
  editor,
  node,
  pos,
  orgId,
}: {
  editor: Editor;
  node: PMNode;
  pos: number;
  orgId?: string;
}) {
  const type = node.type.name;
  const set = (attrs: Attrs) =>
    editor.chain().updateAttributes(type, attrs).run();
  return (
    <>
      <span className="eed-lbl">{ATOM_LABEL[type]}</span>
      {type === "emailButton" && <ButtonFields attrs={node.attrs} set={set} />}
      {type === "emailImage" && (
        <ImageFields
          editor={editor}
          pos={pos}
          attrs={node.attrs}
          set={set}
          orgId={orgId}
        />
      )}
      {type === "spacer" && (
        <Field label="Height">
          <select
            value={String(node.attrs.height)}
            onChange={(e) => set({ height: Number(e.target.value) })}
          >
            {[12, 24, 40, 64].map((h) => (
              <option key={h} value={h}>
                {h}px
              </option>
            ))}
          </select>
        </Field>
      )}
      {type === "socialLinks" && <SocialFields attrs={node.attrs} set={set} />}
      {type === "htmlBlock" && <HtmlFields attrs={node.attrs} set={set} />}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().deleteSelection().run()}
      >
        <EditorIcon name="trash-2" size={14} />
        Remove block
      </Button>
    </>
  );
}
