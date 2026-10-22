"use client";

import { memo } from "react";

import {
  CLIP_WARN_BYTES,
  GMAIL_CLIP_BYTES,
  kb,
} from "../../utils/render-email";
import { EditorIcon } from "../editor-icon";
import { Button } from "@/shared/components/ui/button";

export type EditorMode = "edit" | "preview";
export type EditorDevice = "desktop" | "mobile";

interface TopBarProps {
  name: string;
  backLabel: string;
  saveLabel: string;
  saveFailed: boolean;
  mode: EditorMode;
  device: EditorDevice;
  dark: boolean;
  bytes: number;
  missing: string[];
  done: { busy: boolean; label: string };
  onBack: () => void;
  onMode: (m: EditorMode) => void;
  onDevice: (d: EditorDevice) => void;
  onDark: () => void;
  onImport: () => void;
  onViewHtml: () => void;
  onDone: () => void;
}

/** Back, name and save state; edit/preview and device; size, compliance and the actions. */
export const TopBar = memo(function TopBar(p: TopBarProps) {
  const clipped = p.bytes > GMAIL_CLIP_BYTES;
  return (
    <div className="eed-top">
      <button type="button" className="eed-back" onClick={p.onBack}>
        <EditorIcon name="arrow-left" size={16} />
        {p.backLabel}
      </button>
      <span className="eed-sep" />
      <span className="eed-name">{p.name}</span>
      {p.saveLabel && (
        <span className={`eed-saved${p.saveFailed ? " is-bad" : ""}`}>
          {p.saveLabel}
        </span>
      )}
      <span className="eed-grow" />
      <div className="eed-seg" role="group" aria-label="Mode">
        <button
          type="button"
          aria-pressed={p.mode === "edit"}
          onClick={() => p.onMode("edit")}
        >
          <EditorIcon name="pen-line" size={14} />
          Edit
        </button>
        <button
          type="button"
          aria-pressed={p.mode === "preview"}
          onClick={() => p.onMode("preview")}
        >
          <EditorIcon name="eye" size={14} />
          Preview
        </button>
      </div>
      <div className="eed-seg" role="group" aria-label="Device">
        <button
          type="button"
          aria-pressed={p.device === "desktop"}
          aria-label="Desktop width"
          title="Desktop"
          onClick={() => p.onDevice("desktop")}
        >
          <EditorIcon name="monitor" size={14} />
        </button>
        <button
          type="button"
          aria-pressed={p.device === "mobile"}
          aria-label="Mobile width"
          title="Mobile"
          onClick={() => p.onDevice("mobile")}
        >
          <EditorIcon name="smartphone" size={14} />
        </button>
        {p.mode === "preview" && (
          <button
            type="button"
            aria-pressed={p.dark}
            aria-label="Dark mode"
            title="Dark mode, as mail apps that invert colours show it"
            onClick={p.onDark}
          >
            <EditorIcon name="moon" size={14} />
          </button>
        )}
      </div>
      <span className="eed-grow" />
      {/* Gmail hides everything past 102 KB, footer and unsubscribe link included. */}
      <span
        className={`eed-size${clipped ? " is-bad" : p.bytes > CLIP_WARN_BYTES ? " is-warn" : ""}`}
        title="Gmail clips emails over 102 KB and hides the rest, including the footer."
      >
        <span className="eed-size__bar" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, (p.bytes / GMAIL_CLIP_BYTES) * 100)}%`,
            }}
          />
        </span>
        {clipped
          ? `${kb(p.bytes)}: Gmail will clip this`
          : `${kb(p.bytes)} of 102 KB`}
      </span>
      {p.missing.length > 0 ? (
        <span
          className="eed-chip eed-chip--warn"
          title={`Missing: ${p.missing.join(", ")}`}
        >
          <EditorIcon name="triangle-alert" size={13} />
          {p.missing.length} required tag{p.missing.length === 1 ? "" : "s"}{" "}
          missing
        </span>
      ) : (
        <span className="eed-chip eed-chip--ok">
          <EditorIcon name="shield-check" size={13} />
          Compliant
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={p.onImport}>
        <EditorIcon name="upload" size={14} />
        Import HTML
      </Button>
      <Button variant="ghost" size="sm" onClick={p.onViewHtml}>
        <EditorIcon name="code" size={14} />
        View HTML
      </Button>
      <Button size="sm" onClick={p.onDone} disabled={p.done.busy}>
        <EditorIcon name="check" size={14} />
        {p.done.label}
      </Button>
    </div>
  );
});
