"use client";

import {
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CodeBracketIcon,
  ComputerDesktopIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  MinusIcon,
  PhotoIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { authClient } from "@/lib/auth-client";
import { cn, getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import {
  createBlock,
  type EmailBlock,
  type EmailBlockType,
  type EmailDocument,
  type EmailFooter,
  MERGE_TAGS,
  parseHtmlToDocument,
  renderDocumentToHtml,
  renderDocumentToText,
} from "./blocks";

const PALETTE: { type: EmailBlockType; label: string; glyph?: string }[] = [
  { type: "heading", label: "Heading", glyph: "H1" },
  { type: "text", label: "Text", glyph: "T" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
];

/** Sentinel selection id for the always-on compliance footer. */
const FOOTER_ID = "__footer__";

/** Extract the hosted asset URL from the upload endpoint's response. */
function pickUploadedUrl(payload: unknown): string | null {
  const root = isJsonObject(payload) ? payload : {};
  const data = isJsonObject(root.data) ? root.data : root;
  const candidate =
    (typeof data.url === "string" && data.url) ||
    (typeof data.src === "string" && data.src) ||
    (typeof data.location === "string" && data.location) ||
    (typeof root.url === "string" && root.url) ||
    null;
  return candidate && candidate.length > 0 ? candidate : null;
}

function PaletteIcon({
  type,
  glyph,
}: {
  type: EmailBlockType;
  glyph?: string;
}) {
  if (glyph)
    return <span className="text-sm font-bold text-foreground">{glyph}</span>;
  const cls = "h-5 w-5 text-muted-foreground";
  if (type === "button") return <CursorArrowRaysIcon className={cls} />;
  if (type === "image") return <PhotoIcon className={cls} />;
  if (type === "divider") return <MinusIcon className={cls} />;
  return <ArrowsUpDownIcon className={cls} />;
}

export interface EmailEditorProps {
  initialDoc: EmailDocument;
  title: string;
  accent?: string;
  onBack: () => void;
  onSave: (payload: {
    doc: EmailDocument;
    html: string;
    text: string;
  }) => void | Promise<void>;
  saving?: boolean;
}

export function EmailEditor({
  initialDoc,
  title,
  accent = "#4f46e5",
  onBack,
  onSave,
  saving = false,
}: EmailEditorProps) {
  const [doc, setDoc] = useState<EmailDocument>(initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"blocks" | "inspect">("blocks");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [importOpen, setImportOpen] = useState(false);
  const [importHtml, setImportHtml] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: session } = authClient.useSession();

  const footerSelected = selectedId === FOOTER_ID;
  const selected = footerSelected
    ? null
    : (doc.blocks.find((b) => b.id === selectedId) ?? null);

  // Real compliance: the footer carries the physical address + unsubscribe +
  // manage-preferences links (CAN-SPAM), so "compliant" tracks it being on.
  const compliant = doc.footer?.enabled ?? false;

  const setBlocks = (blocks: EmailBlock[]) => setDoc((d) => ({ ...d, blocks }));
  const patchFooter = (patch: Partial<EmailFooter>) =>
    setDoc((d) => ({ ...d, footer: { ...d.footer, ...patch } }));

  const addBlock = (type: EmailBlockType) => {
    const block = createBlock(type);
    setBlocks([...doc.blocks, block]);
    setSelectedId(block.id);
    setTab("inspect");
  };

  const patchBlock = (id: string, patch: Partial<EmailBlock>) =>
    setBlocks(
      doc.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as EmailBlock) : b
      )
    );

  const removeBlock = (id: string) => {
    setBlocks(doc.blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = doc.blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.blocks.length) return;
    const next = [...doc.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  const insertMergeTag = (token: string) => {
    if (!selected || (selected.type !== "heading" && selected.type !== "text"))
      return;
    const value = `${selected.content}${
      selected.content.endsWith(" ") || selected.content.length === 0 ? "" : " "
    }{{ ${token} }}`;
    patchBlock(selected.id, { content: value } as Partial<EmailBlock>);
  };

  const uploadImage = async (id: string, file: File) => {
    const activeOrgId =
      getSelectedOrganizationId() ?? session?.session?.activeOrganizationId;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const headers: Record<string, string> = {};
      if (activeOrgId) headers["x-org-id"] = activeOrgId;
      const res = await axios.post("/api/upload/email-image", formData, {
        headers,
      });
      const url = pickUploadedUrl(res.data);
      if (!url) throw new Error("Upload succeeded but no URL was returned.");
      patchBlock(id, { src: url } as Partial<EmailBlock>);
      toast.success("Image uploaded");
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && isJsonObject(e.response?.data)
          ? String(e.response?.data.error ?? e.message)
          : e instanceof Error
            ? e.message
            : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const applyImport = () => {
    const trimmed = importHtml.trim();
    if (!trimmed) {
      toast.error("Paste some HTML to import.");
      return;
    }
    const next = parseHtmlToDocument(trimmed);
    if (next.blocks.length === 0) {
      toast.error("No content found in that HTML.");
      return;
    }
    // Keep the existing footer config; import only replaces the body blocks.
    setDoc((d) => ({ ...next, footer: d.footer }));
    setSelectedId(null);
    setImportOpen(false);
    setImportHtml("");
    toast.success(`Imported ${next.blocks.length} blocks`);
  };

  const handleSave = async () => {
    const html = renderDocumentToHtml(doc, accent);
    const text = renderDocumentToText(doc);
    await onSave({ doc, html, text });
  };

  const selectFooter = () => {
    setSelectedId(FOOTER_ID);
    setTab("inspect");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Back to campaign
          </button>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {title || "Untitled email"}
          </span>
        </div>

        <div className="hidden items-center gap-1 rounded-lg border border-border p-0.5 md:flex">
          {(
            [
              { key: "desktop", label: "Desktop", Icon: ComputerDesktopIcon },
              { key: "mobile", label: "Mobile", Icon: DevicePhoneMobileIcon },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                device === key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium sm:inline-flex",
              compliant
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}
          >
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            {compliant ? "Compliant" : "Add unsubscribe"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setImportOpen(true)}
          >
            <CodeBracketIcon className="size-4" aria-hidden="true" />
            Import HTML
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="flex gap-4 border-b border-border px-4">
            {(
              [
                { key: "blocks", label: "Blocks" },
                { key: "inspect", label: "Inspect" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "blocks" ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add a block
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTE.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addBlock(item.type)}
                      className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <PaletteIcon type={item.type} glyph={item.glyph} />
                      <span className="text-xs font-medium text-foreground">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Click a block to append it, then use Inspect to edit its
                  content. Reorder or delete from the toolbar on the selected
                  block.
                </p>
              </div>
            ) : footerSelected ? (
              <FooterInspector
                footer={doc.footer}
                onPatch={patchFooter}
                onInsertReasonTag={(token) =>
                  patchFooter({
                    optInReason:
                      `${doc.footer.optInReason} {{ ${token} }}`.trim(),
                  })
                }
              />
            ) : (
              <Inspector
                block={selected}
                uploading={uploading}
                onPatch={(patch) =>
                  selected ? patchBlock(selected.id, patch) : undefined
                }
                onInsertTag={insertMergeTag}
                onUpload={(file) =>
                  selected ? uploadImage(selected.id, file) : undefined
                }
                onRemove={() =>
                  selected ? removeBlock(selected.id) : undefined
                }
              />
            )}
          </div>
        </aside>

        {/* Preview / canvas */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-6">
          <div
            className={cn(
              "mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-[max-width]",
              device === "desktop" ? "max-w-[640px]" : "max-w-[380px]"
            )}
          >
            <div className="p-6">
              {doc.blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
                  Empty email — add a block from the left.
                </div>
              ) : (
                doc.blocks.map((block, i) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    accent={accent}
                    selected={selectedId === block.id}
                    isFirst={i === 0}
                    isLast={i === doc.blocks.length - 1}
                    onSelect={() => {
                      setSelectedId(block.id);
                      setTab("inspect");
                    }}
                    onMove={(dir) => moveBlock(block.id, dir)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))
              )}
            </div>

            {/* Compliance footer preview (always rendered into the email) */}
            {doc.footer?.enabled ? (
              <FooterPreview
                footer={doc.footer}
                selected={footerSelected}
                onSelect={selectFooter}
              />
            ) : null}
          </div>
        </main>
      </div>

      {/* Import HTML dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import HTML</DialogTitle>
            <DialogDescription>
              Paste an existing email&apos;s HTML. We&apos;ll convert headings,
              text, images, buttons and dividers into editable blocks. The
              compliance footer is kept.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importHtml}
            onChange={(e) => setImportHtml(e.target.value)}
            rows={10}
            placeholder="<h1>…</h1> <p>…</p>"
            className="rounded-lg font-mono text-xs"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyImport}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockRow({
  block,
  accent,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMove,
  onRemove,
}: {
  block: EmailBlock;
  accent: string;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      className={cn(
        "group relative cursor-pointer rounded-md p-1 outline-none transition-shadow",
        selected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/30"
      )}
    >
      {selected ? (
        <div className="absolute -top-3 right-1 z-10 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm">
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
            aria-label="Move up"
          >
            <ChevronUpIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
            aria-label="Move down"
          >
            <ChevronDownIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            aria-label="Delete block"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ) : null}
      <BlockView block={block} accent={accent} />
    </div>
  );
}

/** Read-only visual render of a block inside the preview canvas. */
function BlockView({ block, accent }: { block: EmailBlock; accent: string }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="whitespace-pre-wrap text-2xl font-bold leading-tight text-gray-900">
          {block.content || "Heading"}
        </div>
      );
    case "text":
      return (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">
          {block.content || "Text"}
        </p>
      );
    case "button":
      return (
        <span
          className="my-1 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {block.content || "Button"}
        </span>
      );
    case "image":
      return block.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt}
          className="my-1 block h-auto w-full rounded"
        />
      ) : (
        <div className="my-1 flex items-center justify-center rounded-lg bg-gray-100 py-10 text-xs text-gray-400">
          <PhotoIcon className="mr-2 size-5" aria-hidden="true" />
          Image
        </div>
      );
    case "divider":
      return <hr className="my-3 border-gray-200" />;
    case "spacer":
      return <div style={{ height: block.size }} aria-hidden="true" />;
  }
}

/** Muted preview of the compliance footer at the bottom of the canvas. */
function FooterPreview({
  footer,
  selected,
  onSelect,
}: {
  footer: EmailFooter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      className={cn(
        "cursor-pointer border-t border-gray-200 bg-gray-50 px-6 py-5 text-xs leading-relaxed text-gray-400 outline-none transition-shadow",
        selected ? "ring-2 ring-inset ring-primary" : "hover:bg-gray-100"
      )}
    >
      <p className="whitespace-pre-wrap">{footer.optInReason}</p>
      <p>
        <span className="text-gray-500">{"{{ sender_name }}"}</span> ·{" "}
        <span className="text-gray-500">{"{{ postal_address }}"}</span>
      </p>
      <p>
        <span className="underline">Unsubscribe</span> ·{" "}
        <span className="underline">Manage preferences</span>
      </p>
    </div>
  );
}

function FooterInspector({
  footer,
  onPatch,
  onInsertReasonTag,
}: {
  footer: EmailFooter;
  onPatch: (patch: Partial<EmailFooter>) => void;
  onInsertReasonTag: (token: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Compliance footer
      </p>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Show footer</p>
          <p className="text-xs text-muted-foreground">
            Required for CAN-SPAM (address + unsubscribe).
          </p>
        </div>
        <Switch
          checked={footer.enabled}
          onCheckedChange={(v) => onPatch({ enabled: v })}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Opt-in reason
        </label>
        <Textarea
          value={footer.optInReason}
          onChange={(e) => onPatch({ optInReason: e.target.value })}
          rows={3}
          className="rounded-lg"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Insert a merge tag
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MERGE_TAGS.filter((t) =>
            ["sender_name", "campaign_name", "sender_email"].includes(t.token)
          ).map((tag) => (
            <button
              key={tag.token}
              type="button"
              onClick={() => onInsertReasonTag(tag.token)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        The physical address, unsubscribe and manage-preferences links resolve
        from your org settings per recipient at send time.
      </p>
    </div>
  );
}

function Inspector({
  block,
  uploading,
  onPatch,
  onInsertTag,
  onUpload,
  onRemove,
}: {
  block: EmailBlock | null;
  uploading: boolean;
  onPatch: (patch: Partial<EmailBlock>) => void;
  onInsertTag: (token: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!block) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Select a block in the preview to edit its content, insert a merge tag,
        or remove it.
      </p>
    );
  }

  const isTextual = block.type === "heading" || block.type === "text";

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {block.type} block
      </p>

      {isTextual ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Content
            </label>
            <Textarea
              value={block.content}
              onChange={(e) =>
                onPatch({ content: e.target.value } as Partial<EmailBlock>)
              }
              rows={block.type === "heading" ? 2 : 5}
              className="rounded-lg"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Insert a merge tag
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag.token}
                  type="button"
                  onClick={() => onInsertTag(tag.token)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  {tag.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tags resolve per recipient at send time.
            </p>
          </div>
        </>
      ) : null}

      {block.type === "button" ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Label
            </label>
            <Input
              value={block.content}
              onChange={(e) =>
                onPatch({ content: e.target.value } as Partial<EmailBlock>)
              }
              className="h-9 rounded-lg"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Link
            </label>
            <Input
              value={block.url}
              onChange={(e) =>
                onPatch({ url: e.target.value } as Partial<EmailBlock>)
              }
              placeholder="https://"
              className="h-9 rounded-lg font-mono text-sm"
            />
          </div>
        </>
      ) : null}

      {block.type === "image" ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              …or image URL
            </label>
            <Input
              value={block.src}
              onChange={(e) =>
                onPatch({ src: e.target.value } as Partial<EmailBlock>)
              }
              placeholder="https://…/image.png"
              className="h-9 rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Alt text
            </label>
            <Input
              value={block.alt}
              onChange={(e) =>
                onPatch({ alt: e.target.value } as Partial<EmailBlock>)
              }
              className="h-9 rounded-lg"
            />
          </div>
        </>
      ) : null}

      {block.type === "spacer" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Height (px)
          </label>
          <Input
            type="number"
            min={0}
            max={120}
            value={block.size}
            onChange={(e) =>
              onPatch({
                size: Number(e.target.value) || 0,
              } as Partial<EmailBlock>)
            }
            className="h-9 w-28 rounded-lg"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
      >
        <TrashIcon className="size-4" aria-hidden="true" />
        Remove block
      </button>
    </div>
  );
}
