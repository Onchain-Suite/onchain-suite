"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ReactNode, useRef } from "react";

import {
  CLIP_WARN_BYTES,
  GMAIL_CLIP_BYTES,
  kb,
} from "../../utils/render-email";
import { EditorIcon } from "../editor-icon";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/*
 * A full-screen surface for reading and editing raw email HTML.
 *
 * Import HTML and View HTML used to be a nine-row <textarea> cramped into a
 * centred dialog, for a whole email. The HTML of a real email is the thing
 * being worked on, so it gets the whole window: a monospace, word-wrapped
 * field that fills the viewport, with the description and the size meter kept
 * in view. It portals above the editor (a fixed overlay itself) and traps
 * focus (Radix Dialog), so Escape and the close controls land here.
 */

/**
 * Gmail's 102 KB meter, shared by the top bar's reading and the HTML surfaces.
 * Green up to the warning mark, orange past it, a hard flag once Gmail clips.
 */
export function SizeMeter({ bytes }: { bytes: number }) {
  const state =
    bytes > GMAIL_CLIP_BYTES
      ? " is-bad"
      : bytes > CLIP_WARN_BYTES
        ? " is-warn"
        : "";
  return (
    <span
      className={`eed-size${state}`}
      title="Gmail clips emails over 102 KB and hides the rest, including the footer."
    >
      <span className="eed-size__bar" aria-hidden="true">
        <span
          style={{
            width: `${Math.min(100, (bytes / GMAIL_CLIP_BYTES) * 100)}%`,
          }}
        />
      </span>
      {bytes > GMAIL_CLIP_BYTES
        ? `${kb(bytes)}: over Gmail's 102 KB limit`
        : `${kb(bytes)} of 102 KB`}
    </span>
  );
}

export function HtmlScreen({
  title,
  intro,
  value,
  onChange,
  readOnly,
  ariaLabel,
  placeholder,
  status,
  actions,
  open,
  onClose,
}: {
  title: string;
  intro: ReactNode;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
  placeholder?: string;
  status?: ReactNode;
  actions: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="z-[60]" />
        <DialogPrimitive.Content
          data-slot="html-screen"
          className="bg-background fixed inset-0 z-[60] flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          // The code is the point of the screen, so the cursor starts in it.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            taRef.current?.focus();
          }}
        >
          <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-4">
            <div className="min-w-0">
              <DialogTitle className="text-foreground text-base font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 max-w-3xl text-sm">
                {intro}
              </DialogDescription>
            </div>
            <DialogPrimitive.Close
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 shrink-0 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Close"
            >
              <EditorIcon name="x" size={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 px-6 py-4">
            <textarea
              ref={taRef}
              className="eed-code h-full w-full resize-none"
              aria-label={ariaLabel}
              value={value}
              readOnly={readOnly}
              spellCheck={false}
              placeholder={placeholder}
              onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            />
          </div>

          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">{status}</div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
