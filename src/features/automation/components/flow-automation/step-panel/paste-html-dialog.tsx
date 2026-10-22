"use client";

import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const kb = (s: string) =>
  `${Math.max(1, Math.round(new TextEncoder().encode(s).length / 1024))} KB`;

/** Scripts, frames and inline handlers that inboxes block anyway. */
const RISKY = /<\s*(script|iframe|object|embed|form)\b|\son[a-z]+\s*=/i;

/** Paste an email's HTML, designed in another tool, for the step to send. */
export function PasteHtmlDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (html: string) => void;
}) {
  const [html, setHtml] = useState(initial);
  useEffect(() => {
    if (open) setHtml(initial);
  }, [open, initial]);
  const trimmed = html.trim();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Paste the email&apos;s HTML</DialogTitle>
          <DialogDescription>
            Open the .html file in any text editor, copy everything, and paste
            it here. Images need to be hosted (https links).
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Email HTML"
          rows={10}
          spellCheck={false}
          className="abp-input abp-mono"
          value={html}
          placeholder="<!doctype html>…"
          onChange={(e) => setHtml(e.target.value)}
        />
        {trimmed && (
          <p className={RISKY.test(html) ? "abp-warn" : "abp-hint"}>
            {kb(html)}
            {RISKY.test(html)
              ? " · has scripts, frames or forms, which inboxes strip"
              : " · looks inbox-safe"}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!trimmed} onClick={() => onSave(html)}>
            Use this HTML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The pasted email at full size. Sandboxed: nothing in it runs. */
PasteHtmlDialog.Preview = function PastedPreview({
  open,
  html,
  onClose,
}: {
  open: boolean;
  html: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pasted email</DialogTitle>
        </DialogHeader>
        <iframe
          title="Pasted email preview"
          sandbox=""
          srcDoc={html}
          className="abp-frame"
        />
      </DialogContent>
    </Dialog>
  );
};
