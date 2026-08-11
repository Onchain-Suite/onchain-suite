"use client";

import {
  ArrowLeftIcon,
  CodeBracketIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import {
  ATTRIBUTION_TEXT,
  BLOCK_BUTTONS,
  type BlockNode,
  childListsOf,
  composeFooterContent,
  createNode,
  type EmailDocument,
  type EmailFooter,
  type EmailLayoutNode,
  footerComplianceIssues,
  type InsertableType,
  MERGE_TAGS,
  newBlockId,
  parseHtmlToDocument,
  renderDocumentToHtml,
  renderDocumentToText,
  resolveSampleTags,
} from "./blocks";
import { EmailCanvas, type InsertLocation } from "./canvas";
import { Field } from "./inspect-inputs";
import { ImageUploadButton, InspectPanel, StylesPanel } from "./inspect-panels";
import { TemplatesTab } from "./templates-tab";
import { useFooterDefaults } from "./use-footer-defaults";

type Tab = "blocks" | "templates" | "styles" | "inspect";

/** Sentinel id for the always-on compliance footer (not a real block node). */
const FOOTER_ID = "__footer__";

/* ------------------------------------------------------- document mutations */

/** Find the child list (and position) that contains `id`. */
function locate(
  doc: EmailDocument,
  id: string
): { parentId: string; columnIndex?: number; index: number } | null {
  for (const [parentId, node] of Object.entries(doc.blocks)) {
    const lists = childListsOf(node);
    for (let li = 0; li < lists.length; li += 1) {
      const index = lists[li].indexOf(id);
      if (index !== -1) {
        const columnIndex = node.type === "ColumnsContainer" ? li : undefined;
        return { parentId, columnIndex, index };
      }
    }
  }
  return null;
}

/** Immutably set a container's child list. */
function withChildList(
  doc: EmailDocument,
  loc: InsertLocation,
  updater: (ids: string[]) => string[]
): EmailDocument {
  const node = doc.blocks[loc.parentId];
  if (!node) return doc;
  const blocks = { ...doc.blocks };
  if (node.type === "EmailLayout") {
    blocks[loc.parentId] = {
      ...node,
      data: { ...node.data, childrenIds: updater(node.data.childrenIds) },
    };
  } else if (node.type === "Container") {
    blocks[loc.parentId] = {
      ...node,
      data: {
        ...node.data,
        props: {
          ...node.data.props,
          childrenIds: updater(node.data.props.childrenIds),
        },
      },
    };
  } else if (node.type === "ColumnsContainer") {
    const ci = loc.columnIndex ?? 0;
    const columns = node.data.props.columns.map((c, i) =>
      i === ci ? { childrenIds: updater(c.childrenIds) } : c
    );
    blocks[loc.parentId] = {
      ...node,
      data: { ...node.data, props: { ...node.data.props, columns } },
    };
  }
  return { ...doc, blocks };
}

/** Collect a node's descendant ids (for deletion). */
function descendantIds(doc: EmailDocument, id: string): string[] {
  const out: string[] = [];
  const node = doc.blocks[id];
  if (!node) return out;
  for (const list of childListsOf(node)) {
    for (const cid of list) {
      out.push(cid, ...descendantIds(doc, cid));
    }
  }
  return out;
}

/* ------------------------------------------------------------------- editor */

export interface EmailEditorProps {
  initialDoc: EmailDocument;
  title: string;
  /** Kept for API compatibility; per-block colors now drive buttons. */
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
  onBack,
  onSave,
  saving = false,
}: EmailEditorProps) {
  const [doc, setDoc] = useState<EmailDocument>(initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("blocks");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [importOpen, setImportOpen] = useState(false);
  const [importHtml, setImportHtml] = useState("");

  const root = doc.blocks[doc.root] as EmailLayoutNode | undefined;
  const selectedNode = selectedId ? doc.blocks[selectedId] : null;
  const complianceIssues = useMemo(
    () => footerComplianceIssues(doc.footer),
    [doc.footer]
  );
  const compliant = complianceIssues.length === 0;

  // Auto-populate the compliance footer with the org's company name, address
  // and logo on first load. Only fills blanks, so saved values and user edits
  // are never clobbered.
  const footerDefaults = useFooterDefaults();
  const [footerSeeded, setFooterSeeded] = useState(false);
  useEffect(() => {
    const defaults = footerDefaults.data;
    if (!defaults || footerSeeded) return;
    setFooterSeeded(true);
    setDoc((prev) => {
      const f = prev.footer;
      const next = {
        ...f,
        companyName: f.companyName?.trim()
          ? f.companyName
          : defaults.companyName,
        companyAddress: f.companyAddress?.trim()
          ? f.companyAddress
          : defaults.companyAddress,
        logoUrl: f.logoUrl?.trim() ? f.logoUrl : defaults.logoUrl,
      };
      const unchanged =
        next.companyName === f.companyName &&
        next.companyAddress === f.companyAddress &&
        next.logoUrl === f.logoUrl;
      return unchanged ? prev : { ...prev, footer: next };
    });
  }, [footerDefaults.data, footerSeeded]);

  const selectBlock = (id: string) => {
    setSelectedId(id);
    setTab(id === doc.root ? "styles" : "inspect");
  };

  const insertBlock = (
    loc: InsertLocation,
    index: number,
    type: InsertableType
  ) => {
    const node = createNode(type);
    const id = newBlockId();
    const next = withChildList(
      { ...doc, blocks: { ...doc.blocks, [id]: node } },
      loc,
      (ids) => [...ids.slice(0, index), id, ...ids.slice(index)]
    );
    setDoc(next);
    setSelectedId(id);
    setTab("inspect");
  };

  const appendToRoot = (type: InsertableType) =>
    insertBlock(
      { parentId: doc.root },
      root?.data.childrenIds.length ?? 0,
      type
    );

  const updateNode = (id: string, node: BlockNode) =>
    setDoc((d) => ({ ...d, blocks: { ...d.blocks, [id]: node } }));

  /** Move an existing block to `target`/`index` (drag-and-drop reorder). */
  const reorderBlock = (
    dragId: string,
    target: InsertLocation,
    index: number
  ) => {
    const from = locate(doc, dragId);
    if (!from) return;
    // Never drop a container into itself or one of its own descendants.
    if (
      target.parentId === dragId ||
      descendantIds(doc, dragId).includes(target.parentId)
    ) {
      return;
    }
    const sameList =
      from.parentId === target.parentId &&
      (from.columnIndex ?? undefined) === (target.columnIndex ?? undefined);
    const insertIndex = sameList && from.index < index ? index - 1 : index;

    let next = withChildList(
      doc,
      { parentId: from.parentId, columnIndex: from.columnIndex },
      (ids) => ids.filter((x) => x !== dragId)
    );
    next = withChildList(next, target, (ids) => [
      ...ids.slice(0, insertIndex),
      dragId,
      ...ids.slice(insertIndex),
    ]);
    setDoc(next);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const loc = locate(doc, id);
    if (!loc) return;
    const next = withChildList(
      doc,
      { parentId: loc.parentId, columnIndex: loc.columnIndex },
      (ids) => {
        const j = loc.index + dir;
        if (j < 0 || j >= ids.length) return ids;
        const arr = [...ids];
        [arr[loc.index], arr[j]] = [arr[j], arr[loc.index]];
        return arr;
      }
    );
    setDoc(next);
  };

  const removeBlock = (id: string) => {
    const loc = locate(doc, id);
    if (!loc) return;
    const toDelete = new Set([id, ...descendantIds(doc, id)]);
    let next = withChildList(
      doc,
      { parentId: loc.parentId, columnIndex: loc.columnIndex },
      (ids) => ids.filter((x) => x !== id)
    );
    const blocks = { ...next.blocks };
    for (const d of toDelete) delete blocks[d];
    next = { ...next, blocks };
    setDoc(next);
    if (selectedId && toDelete.has(selectedId)) setSelectedId(null);
  };

  const loadDocument = (next: EmailDocument) => {
    setDoc(next);
    setSelectedId(null);
    setTab("blocks");
  };

  const applyImport = () => {
    const trimmed = importHtml.trim();
    if (!trimmed) {
      toast.error("Paste some HTML to import.");
      return;
    }
    const next = parseHtmlToDocument(trimmed);
    setDoc((d) => ({ ...next, footer: d.footer }));
    setSelectedId(null);
    setImportOpen(false);
    setImportHtml("");
    setTab("blocks");
    toast.success("HTML imported");
  };

  const handleSave = async () => {
    // CAN-SPAM: never let a template save unless the footer identifies the
    // sender, gives a postal address and offers a way to unsubscribe.
    if (!compliant) {
      toast.error(
        complianceIssues[0] ?? "Complete the compliance footer before saving."
      );
      setSelectedId(FOOTER_ID);
      setTab("inspect");
      return;
    }
    await onSave({
      doc,
      html: renderDocumentToHtml(doc),
      text: renderDocumentToText(doc),
    });
  };

  const canvasWidth = device === "desktop" ? "max-w-[600px]" : "max-w-[360px]";
  const backdrop = root?.data.backdropColor ?? "#F5F5F5";

  const handlers = useMemo(
    () => ({
      doc,
      selectedId,
      onSelect: selectBlock,
      onInsert: insertBlock,
      onMove: moveBlock,
      onRemove: removeBlock,
      onUpdate: updateNode,
      onReorder: reorderBlock,
    }),
    // selectBlock/insert/move/remove are stable enough for this editor scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, selectedId]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
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
          <span className="text-border">|</span>
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
          <button
            type="button"
            onClick={() => {
              setSelectedId(FOOTER_ID);
              setTab("inspect");
            }}
            title={
              compliant ? "All checks passed" : complianceIssues.join(" · ")
            }
            className={cn(
              "hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors sm:inline-flex",
              compliant
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            )}
          >
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            {compliant ? "Compliant" : complianceIssues[0]}
          </button>
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
        <aside className="flex w-80 shrink-0 flex-col border-r border-border">
          <div className="flex gap-4 border-b border-border px-4">
            {(
              [
                { key: "blocks", label: "Blocks" },
                { key: "templates", label: "Templates" },
                { key: "styles", label: "Styles" },
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
            {tab === "blocks" ? <BlocksTab onAdd={appendToRoot} /> : null}

            {tab === "templates" ? (
              <TemplatesTab currentDoc={doc} onLoad={loadDocument} />
            ) : null}

            {tab === "styles" ? (
              <div className="space-y-5">
                {root ? (
                  <StylesPanel
                    layout={root}
                    onChange={(next) => updateNode(doc.root, next)}
                  />
                ) : null}
                <FooterControls doc={doc} setDoc={setDoc} />
              </div>
            ) : null}

            {tab === "inspect" ? (
              selectedId === FOOTER_ID ? (
                <FooterInspect
                  footer={doc.footer}
                  onChange={(footer) => setDoc((d) => ({ ...d, footer }))}
                />
              ) : selectedNode && selectedId && selectedId !== doc.root ? (
                <InspectPanel
                  node={selectedNode}
                  onChange={(next) => updateNode(selectedId, next)}
                />
              ) : root ? (
                <StylesPanel
                  layout={root}
                  onChange={(next) => updateNode(doc.root, next)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a block in the canvas to edit it.
                </p>
              )
            ) : null}
          </div>
        </aside>

        {/* Canvas */}
        <main
          className="min-h-0 flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: backdrop }}
        >
          <div className={cn("mx-auto w-full", canvasWidth)}>
            <EmailCanvas {...handlers} />
            {doc.footer?.enabled ? (
              <FooterBlock
                footer={doc.footer}
                campaignName={title}
                selected={selectedId === FOOTER_ID}
                onSelect={() => {
                  setSelectedId(FOOTER_ID);
                  setTab("inspect");
                }}
              />
            ) : null}
          </div>
        </main>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import HTML</DialogTitle>
            <DialogDescription>
              Paste an existing email&apos;s HTML - headings, text, images,
              buttons and dividers become editable blocks. The compliance footer
              is kept.
            </DialogDescription>
          </DialogHeader>
          <HtmlCodeInput value={importHtml} onChange={setImportHtml} />
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

function BlocksTab({ onAdd }: { onAdd: (type: InsertableType) => void }) {
  const groups: { title: string; group: "block" | "layout" }[] = [
    { title: "Blocks", group: "block" },
    { title: "Layout", group: "layout" },
  ];
  return (
    <div className="space-y-5">
      {groups.map(({ title, group }) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_BUTTONS.filter((b) => b.group === group).map((b) => (
              <button
                key={b.type}
                type="button"
                onClick={() => onAdd(b.type)}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Click a block to add it to the end of your email, or use the + buttons
        between blocks on the canvas.
      </p>
    </div>
  );
}

function FooterControls({
  doc,
  setDoc,
}: {
  doc: EmailDocument;
  setDoc: React.Dispatch<React.SetStateAction<EmailDocument>>;
}) {
  const { footer } = doc;
  const setFooter = (patch: Partial<EmailDocument["footer"]>) =>
    setDoc((d) => ({ ...d, footer: { ...d.footer, ...patch } }));

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Compliance footer
          </p>
          <p className="text-xs text-muted-foreground">
            Logo + unsubscribe (CAN-SPAM). Required to save.
          </p>
        </div>
        <Switch
          checked={footer.enabled}
          onCheckedChange={(enabled) => setFooter({ enabled })}
        />
      </div>

      <Field label="Logo">
        {footer.logoUrl?.trim() ? (
          <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- email logo preview */}
            <img
              src={footer.logoUrl}
              alt="Footer logo"
              className="h-8 w-auto max-w-[140px] object-contain"
            />
            <button
              type="button"
              onClick={() => setFooter({ logoUrl: "" })}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ) : null}
        <ImageUploadButton
          label={footer.logoUrl?.trim() ? "Change logo" : "Upload logo"}
          onUploaded={(url) => setFooter({ logoUrl: url })}
        />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Sent by OnchainSuite
          </p>
          <p className="text-xs text-muted-foreground">
            Adds a small attribution line under the footer.
          </p>
        </div>
        <Switch
          checked={footer.attribution ?? false}
          onCheckedChange={(attribution) => setFooter({ attribution })}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Edit the footer text and merge tags by selecting the{" "}
        <span className="font-medium text-foreground">Footer</span> block on the
        canvas.
      </p>
    </div>
  );
}

/** The selectable, non-removable compliance footer rendered under the canvas. */
function FooterBlock({
  footer,
  campaignName,
  selected,
  onSelect,
}: {
  footer: EmailFooter;
  campaignName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const lines = useMemo(() => {
    const overrides: Record<string, string> = {};
    if (campaignName?.trim()) overrides.campaign_name = campaignName.trim();
    if (footer.companyName?.trim())
      overrides.sender_name = footer.companyName.trim();
    if (footer.companyAddress?.trim())
      overrides.postal_address = footer.companyAddress.trim();
    return resolveSampleTags(composeFooterContent(footer), overrides).split(
      "\n"
    );
  }, [footer, campaignName]);

  return (
    <div className="mt-2">
      <div className="mx-6 border-t border-border/60" />
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group relative mt-1 block w-full rounded-lg border px-6 py-4 text-left transition-colors",
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-transparent hover:border-primary/40"
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute -top-2.5 left-3 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          Footer · Required
        </span>
        <span
          className={cn(
            "pointer-events-none absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <LockClosedIcon className="size-3" aria-hidden="true" />
          Required
        </span>
        {footer.logoUrl?.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element -- email logo preview, not a Next asset
          <img
            src={footer.logoUrl}
            alt={
              footer.companyName?.trim()
                ? footer.companyName.trim()
                : "Company logo"
            }
            className="mb-3 h-7 w-auto"
          />
        ) : null}
        <div className="space-y-0.5 text-xs leading-relaxed text-gray-400">
          {lines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key -- static preview lines, never reordered
            <p key={i} className="whitespace-pre-wrap break-words">
              {line}
            </p>
          ))}
        </div>
        {footer.attribution ? (
          <p className="mt-3 text-[11px] text-gray-400/80">
            {ATTRIBUTION_TEXT.replace("OnchainSuite", "")}
            <span className="underline">OnchainSuite</span>
          </p>
        ) : null}
      </button>
    </div>
  );
}

/** Inspect panel for the required footer: editable content + merge-tag insert. */
function FooterInspect({
  footer,
  onChange,
}: {
  footer: EmailFooter;
  onChange: (footer: EmailFooter) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const value = footer.content ?? composeFooterContent(footer);
  const setContent = (content: string) => onChange({ ...footer, content });

  const insertTag = (token: string) => {
    const snippet = `{{ ${token} }}`;
    const el = ref.current;
    if (!el) {
      setContent(`${value}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setContent(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Footer · Required block
      </p>
      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        <LockClosedIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Required by law - every email must identify the sender and offer a way
          to unsubscribe. You can reword it, but it can&apos;t be removed.
        </p>
      </div>
      <Field label="Content">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="rounded-lg font-mono text-xs leading-relaxed"
        />
      </Field>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Insert a merge tag
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MERGE_TAGS.map((tag) => (
            <button
              key={tag.token}
              type="button"
              onClick={() => insertTag(tag.token)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tags resolve per recipient at send time. The preview shows sample
        values.
      </p>
    </div>
  );
}

/** Code-editor-styled input (title bar + line-number gutter) for HTML import. */
function HtmlCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const lineCount = Math.max(value.split("\n").length, 12);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
          paste.html
        </span>
      </div>
      <div className="flex h-[28rem] max-h-[60vh] overflow-hidden">
        <div
          aria-hidden="true"
          className="w-10 shrink-0 select-none overflow-hidden border-r border-border bg-muted/50 py-3 text-right font-mono text-[11px] leading-5 text-muted-foreground/70"
        >
          <div style={{ transform: `translateY(${-scrollTop}px)` }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="pr-2">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          spellCheck={false}
          placeholder={"<h1>…</h1>\n<p>…</p>"}
          className="h-full flex-1 resize-none bg-transparent px-3 py-3 font-mono text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
