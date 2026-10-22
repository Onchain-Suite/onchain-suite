"use client";

import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import type { ReactNode } from "react";

import { sanitizeEmailHtml } from "../utils/email-safety";
import { EditorIcon } from "./editor-icon";

/*
 * How the email-only nodes look while editing. They are atoms: click one to
 * select it and edit it in the panel on the right, drag the handle to move it.
 * What they turn into in the inbox is utils/render-email.ts, so a change of
 * look here never changes what is sent.
 */

function Frame({
  selected,
  label,
  children,
  className,
}: {
  selected: boolean;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <NodeViewWrapper
      className={`eed-atom${selected ? " is-on" : ""}${className ? ` ${className}` : ""}`}
      data-label={label}
    >
      <span
        className="eed-grip"
        data-drag-handle
        contentEditable={false}
        title="Drag to move"
        aria-hidden="true"
      >
        <EditorIcon name="ellipsis" size={14} />
      </span>
      {children}
    </NodeViewWrapper>
  );
}

export function ButtonView({ node, selected }: NodeViewProps) {
  return (
    <Frame selected={selected} label="Button">
      <div className={`eed-btnrow eed-btnrow--${node.attrs.align}`}>
        <span className="eed-btn">
          {String(node.attrs.label ?? "").trim() ? node.attrs.label : "Button"}
        </span>
      </div>
      {!node.attrs.href && <span className="eed-atomnote">No link yet</span>}
    </Frame>
  );
}

export function ImageView({ node, selected }: NodeViewProps) {
  const { src, alt, caption } = node.attrs as {
    src: string;
    alt: string;
    caption: string;
  };
  return (
    <Frame selected={selected} label="Image">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user content inside the editor, any host
        <img className="eed-img" src={src} alt={alt} draggable={false} />
      ) : (
        <div className="eed-imgph">
          <EditorIcon name="image" size={22} />
          {alt || "Add an image"}
          <span>Drop a file here or set one in the panel</span>
        </div>
      )}
      {caption && <p className="eed-cap">{caption}</p>}
    </Frame>
  );
}

export function SpacerView({ node, selected }: NodeViewProps) {
  const height = Number(node.attrs.height) || 24;
  return (
    <Frame selected={selected} label="Spacer">
      <div className="eed-spacer" style={{ height }}>
        <span>{height}px</span>
      </div>
    </Frame>
  );
}

export function SocialView({ node, selected }: NodeViewProps) {
  const links =
    (node.attrs.links as { label: string; url: string }[] | null) ?? [];
  return (
    <Frame selected={selected} label="Social links">
      <p className="eed-social">
        {links.map((l, i) => (
          <span key={`${l.label}${i}`}>
            {i > 0 && <i>·</i>}
            <b>{l.label}</b>
          </span>
        ))}
      </p>
    </Frame>
  );
}

export function HtmlView({ node, selected }: NodeViewProps) {
  // Sanitised before it is shown, the same way it is before it is sent.
  const clean = sanitizeEmailHtml(String(node.attrs.html ?? "")).html;
  return (
    <Frame selected={selected} label="HTML" className="eed-atom--html">
      <div className="eed-html" dangerouslySetInnerHTML={{ __html: clean }} />
    </Frame>
  );
}

export function SectionView({ node, selected }: NodeViewProps) {
  const only = node.attrs.mode !== "except";
  const tag = String(node.attrs.tag ?? "");
  return (
    <NodeViewWrapper className={`eed-section${selected ? " is-on" : ""}`}>
      <div className="eed-section__lbl" contentEditable={false}>
        <EditorIcon name="users" size={13} />
        {only ? "Only contacts tagged" : "Everyone except contacts tagged"}{" "}
        <b>{tag || "pick a tag"}</b>
      </div>
      <NodeViewContent className="eed-section__body" />
    </NodeViewWrapper>
  );
}
