"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  cleanGoogleDocsHtml,
  sanitizeEmailHtml,
} from "../../utils/email-safety";
import { emailBytes } from "../../utils/render-email";
import { EditorIcon } from "../editor-icon";
import { HtmlScreen, SizeMeter } from "./html-screen";
import { Button } from "@/shared/components/ui/button";

/**
 * Replace the body with pasted HTML: headings, text, lists, links and images
 * become editable. Opens as a full-screen editor (HtmlScreen), not a cramped
 * dialog, because the HTML of a real email needs the whole window.
 */
export function ImportHtmlDialog({
  editor,
  open,
  onClose,
}: {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}) {
  const [html, setHtml] = useState("");
  const clean = sanitizeEmailHtml(html);
  const close = () => {
    setHtml("");
    onClose();
  };
  const apply = () => {
    editor.commands.setContent(cleanGoogleDocsHtml(clean.html), {
      emitUpdate: true,
    });
    close();
    toast.success("Imported. The footer stays as it was");
  };
  return (
    <HtmlScreen
      title="Import HTML"
      intro={
        <>
          Paste an existing email&apos;s HTML. Headings, paragraphs, lists,
          links and images become editable. This replaces the current body; the
          footer is kept.
        </>
      }
      value={html}
      onChange={setHtml}
      ariaLabel="HTML to import"
      placeholder={"<h1>Season 3</h1>\n<p>Packs are live.</p>"}
      open={open}
      onClose={close}
      status={
        <>
          <SizeMeter bytes={emailBytes(html)} />
          {clean.removed > 0 && (
            <span className="eed-warn">
              <EditorIcon name="triangle-alert" size={13} />
              {clean.removed} unsafe thing{clean.removed === 1 ? "" : "s"} will
              be removed (scripts, frames, forms or event handlers).
            </span>
          )}
        </>
      }
      actions={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!html.trim()} onClick={apply}>
            <EditorIcon name="check" size={14} />
            Replace the email
          </Button>
        </>
      }
    />
  );
}

const fileName = (name: string) =>
  `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "email"}.html`;

/** The exact HTML that will be sent, to read, copy or download. */
export function ViewHtmlDialog({
  name,
  html,
  open,
  onClose,
}: {
  name: string;
  html: string;
  open: boolean;
  onClose: () => void;
}) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(name);
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <HtmlScreen
      title="Email HTML"
      intro={
        <>
          Table-based and inline-styled, so it renders in Outlook as well as
          Gmail and Apple Mail. Merge tags stay as <code>{"{{ tags }}"}</code>;
          they fill in per person when it sends.
        </>
      }
      value={html}
      readOnly
      ariaLabel="Email HTML"
      open={open}
      onClose={onClose}
      status={<SizeMeter bytes={emailBytes(html)} />}
      actions={
        <>
          <Button variant="outline" onClick={download}>
            <EditorIcon name="download" size={14} />
            Download
          </Button>
          <Button onClick={copy}>
            <EditorIcon name="copy" size={14} />
            Copy HTML
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    />
  );
}
