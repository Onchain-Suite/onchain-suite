"use client";

import {
  CheckCircleIcon,
  PaperClipIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState } from "react";

import { intelligenceService } from "../../intelligence.service";

const ACCEPT = "image/*,.pdf,.csv,.txt,.json,.log,.xlsx,.xls,.doc,.docx";
const MAX_FILES = 5;
const MAX_MB = 15;

const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * The "Report a bug" tab of the Cerebra panel: a note + optional files (images,
 * pdf, csv…). Files upload first (reusing the chat-attachment storage path),
 * then the report is sent; the backend emails the team with download links.
 */
export function CerebraBugReport() {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const ok = picked.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    if (ok.length < picked.length)
      setError(`Files must be under ${MAX_MB} MB.`);
    else setError(null);
    setFiles((prev) => [...prev, ...ok].slice(0, MAX_FILES));
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    setMessage("");
    setFiles([]);
    setDone(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ids: string[] = [];
      for (const f of files) {
        const r = await intelligenceService.uploadAttachment(f);
        ids.push(r.id);
      }
      await intelligenceService.reportBug({
        message: message.trim(),
        attachmentFileIds: ids,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't send the report. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <CheckCircleIcon
          className="size-10 text-emerald-500"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          Thanks - report sent
        </p>
        <p className="text-xs text-muted-foreground">
          The team has it and will take a look.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Report another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3 p-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What went wrong? What were you doing when it happened?"
        aria-label="Describe the bug"
        rows={5}
        maxLength={5000}
        className="min-h-24 w-full flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <PaperClipIcon className="size-4" aria-hidden="true" />
          Attach a file{" "}
          {files.length > 0 ? `(${files.length}/${MAX_FILES})` : ""}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {files.map((f, i) => (
          <div
            key={`${f.name}-${f.size}-${f.lastModified}`}
            className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm"
          >
            <PaperClipIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {f.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {sizeLabel(f.size)}
            </span>
            <button
              type="button"
              onClick={() => removeFile(i)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${f.name}`}
            >
              <XMarkIcon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={busy || !message.trim()}
        className="mt-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
