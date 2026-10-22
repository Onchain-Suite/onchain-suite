"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  cleanGoogleDocsHtml,
  sanitizeEmailHtml,
} from "../../utils/email-safety";
import { EditorIcon } from "../editor-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/** Replace the body with pasted HTML: headings, text, lists, links and images become editable. */
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
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import HTML</DialogTitle>
          <DialogDescription>
            Paste an existing email&apos;s HTML. Headings, paragraphs, lists,
            links and images become editable. This replaces the current body;
            the footer is kept.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="eed-code"
          aria-label="HTML to import"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={9}
          spellCheck={false}
          placeholder={"<h1>Season 3</h1>\n<p>Packs are live.</p>"}
        />
        {clean.removed > 0 && (
          <p className="eed-warn">
            {clean.removed} unsafe thing{clean.removed === 1 ? "" : "s"} will be
            removed (scripts, frames, forms or event handlers).
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!html.trim()}
            onClick={() => {
              editor.commands.setContent(cleanGoogleDocsHtml(clean.html), {
                emitUpdate: true,
              });
              setHtml("");
              onClose();
              toast.success("Imported. The footer stays as it was");
            }}
          >
            Replace the email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const fileName = (name: string) =>
  `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "email"}.html`;

/** The exact HTML that will be sent, to copy or download. */
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Email HTML</DialogTitle>
          <DialogDescription>
            Table-based and inline-styled, so it renders in Outlook as well as
            Gmail and Apple Mail. Merge tags stay as <code>{"{{ tags }}"}</code>
            ; they fill in per person when it sends.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="eed-code eed-code--tall"
          readOnly
          aria-label="Email HTML"
          value={html}
        />
        <DialogFooter>
          <Button variant="outline" onClick={download}>
            <EditorIcon name="download" size={14} />
            Download
          </Button>
          <Button onClick={copy}>
            <EditorIcon name="copy" size={14} />
            Copy HTML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
