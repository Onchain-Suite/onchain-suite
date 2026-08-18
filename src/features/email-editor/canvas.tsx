"use client";

import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  createContext,
  type CSSProperties,
  type DragEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

import {
  BLOCK_BUTTONS,
  type BlockNode,
  type BlockStyle,
  type EmailDocument,
  type FontFamily,
  fontFamilyToCss,
  type InsertableType,
  resolveSampleTags,
  sanitizeEmailHtml,
  STYLE_KEYS,
  type StyleKey,
} from "./blocks";

/** Where a new block gets inserted. */
export interface InsertLocation {
  parentId: string;
  columnIndex?: number;
}

interface CanvasHandlers {
  doc: EmailDocument;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInsert: (loc: InsertLocation, index: number, type: InsertableType) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  /** Clone a block (and its descendants) directly after itself. */
  onDuplicate: (id: string) => void;
  /** Commit an edited block (inline text editing). */
  onUpdate: (id: string, node: BlockNode) => void;
  /** Move an existing block to a container location at a given index. */
  onReorder: (dragId: string, loc: InsertLocation, index: number) => void;
}

/** Tracks the block currently being dragged so drop zones can react. */
const DragCtx = createContext<{
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}>({ draggingId: null, setDraggingId: () => undefined });

/** Convert a BlockStyle (subset) to React inline styles. */
function toCss(style: BlockStyle | undefined, keys: StyleKey[]): CSSProperties {
  const s: CSSProperties = {};
  if (!style) return s;
  for (const k of keys) {
    const v = style[k];
    if (v === null || v === undefined) continue;
    if (k === "color") s.color = v as string;
    else if (k === "backgroundColor") s.backgroundColor = v as string;
    else if (k === "borderColor") s.border = `1px solid ${v}`;
    else if (k === "borderRadius") s.borderRadius = `${v}px`;
    else if (k === "fontFamily") {
      if (style.fontStack) continue; // fontStack wins over the preset
      const css = fontFamilyToCss(v as FontFamily);
      if (css) s.fontFamily = css;
    } else if (k === "fontStack") s.fontFamily = v as string;
    else if (k === "fontSize") s.fontSize = `${v}px`;
    else if (k === "fontWeight") s.fontWeight = v as "bold" | "normal";
    else if (k === "letterSpacing") s.letterSpacing = `${v}px`;
    else if (k === "textTransform")
      s.textTransform = v as CSSProperties["textTransform"];
    else if (k === "lineHeight") s.lineHeight = v as number;
    else if (k === "textAlign") s.textAlign = v as CSSProperties["textAlign"];
    else if (k === "padding") {
      const p = v as {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
      s.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    }
  }
  return s;
}

/** "+" affordance opening a block-type menu; doubles as a drop target for
 *  reordering an existing block to this position while a drag is in progress. */
function AddButton({
  onPick,
  onDropBlock,
}: {
  onPick: (type: InsertableType) => void;
  onDropBlock?: (dragId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const { draggingId } = useContext(DragCtx);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dragActive = Boolean(draggingId) && Boolean(onDropBlock);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    if (draggingId && onDropBlock) onDropBlock(draggingId);
  };

  if (dragActive) {
    return (
      <div
        className="flex justify-center py-1.5"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "h-1.5 w-full rounded-full transition-colors",
            over ? "bg-primary" : "bg-primary/15"
          )}
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="group/add relative flex justify-center py-0.5">
      <button
        type="button"
        data-open={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-5 items-center justify-center rounded-full border border-dashed border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover/add:opacity-100 focus-visible:opacity-100 data-[open=true]:opacity-100"
        aria-label="Add block here"
      >
        <PlusIcon className="size-3.5" />
      </button>
      {open ? (
        <div className="absolute top-6 z-30 grid w-56 grid-cols-2 gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-md">
          {BLOCK_BUTTONS.map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPick(b.type);
                setOpen(false);
              }}
              className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A list of children (with "+" between each) for a given container location. */
function ChildList({
  ids,
  location,
  handlers,
  emptyHint,
}: {
  ids: string[];
  location: InsertLocation;
  handlers: CanvasHandlers;
  emptyHint?: string;
}) {
  return (
    <div>
      <AddButton
        onPick={(t) => handlers.onInsert(location, 0, t)}
        onDropBlock={(dragId) => handlers.onReorder(dragId, location, 0)}
      />
      {ids.length === 0 && emptyHint ? (
        <p className="py-3 text-center text-xs text-muted-foreground/70">
          {emptyHint}
        </p>
      ) : null}
      {ids.map((id, i) => (
        <div key={id}>
          <BlockView id={id} handlers={handlers} />
          <AddButton
            onPick={(t) => handlers.onInsert(location, i + 1, t)}
            onDropBlock={(dragId) =>
              handlers.onReorder(dragId, location, i + 1)
            }
          />
        </div>
      ))}
    </div>
  );
}

/** Selectable visual render of one block (recurses into containers). */
function BlockView({ id, handlers }: { id: string; handlers: CanvasHandlers }) {
  const node = handlers.doc.blocks[id];
  const { draggingId, setDraggingId } = useContext(DragCtx);
  if (!node) return null;
  const selected = handlers.selectedId === id;
  const dragging = draggingId === id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        handlers.onSelect(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          handlers.onSelect(id);
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded outline-none transition-shadow",
        selected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/30",
        dragging && "opacity-40"
      )}
    >
      {selected ? (
        <div className="absolute -top-3 right-1 z-10 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm">
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              setDraggingId(id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
            }}
            onDragEnd={() => setDraggingId(null)}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <ArrowsUpDownIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onMove(id, -1);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Move up"
          >
            <ChevronUpIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onMove(id, 1);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Move down"
          >
            <ChevronDownIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onDuplicate(id);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Duplicate block"
            title="Duplicate (⌘D)"
          >
            <DocumentDuplicateIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onRemove(id);
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            aria-label="Delete block"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ) : null}
      <BlockInner id={id} node={node} handlers={handlers} selected={selected} />
    </div>
  );
}

/** Inline-editable text for Heading/Text blocks. Uncontrolled (seeded once) so
 *  the caret never jumps; commits to the doc on blur. */
function EditableText({
  value,
  onCommit,
  style,
  className,
}: {
  value: string;
  onCommit: (text: string) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
    // Seed once on mount; further prop changes come from this same field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onBlur={() => onCommit(ref.current?.innerText ?? "")}
      style={style}
      className={cn("cursor-text outline-none", className)}
    />
  );
}

function BlockInner({
  id,
  node,
  handlers,
  selected,
}: {
  id: string;
  node: BlockNode;
  handlers: CanvasHandlers;
  selected: boolean;
}) {
  switch (node.type) {
    case "Heading": {
      const size =
        node.data.props.level === "h1"
          ? 32
          : node.data.props.level === "h3"
            ? 20
            : 24;
      const style: CSSProperties = {
        fontWeight: "bold",
        lineHeight: 1.25,
        ...toCss(node.data.style, STYLE_KEYS.Heading),
        fontSize: size,
      };
      if (selected) {
        return (
          <EditableText
            value={node.data.props.text}
            onCommit={(text) =>
              handlers.onUpdate(id, {
                ...node,
                data: { ...node.data, props: { ...node.data.props, text } },
              })
            }
            style={style}
            className="whitespace-pre-wrap"
          />
        );
      }
      return (
        <div style={style} className="whitespace-pre-wrap">
          {resolveSampleTags(node.data.props.text) || "Heading"}
        </div>
      );
    }
    case "Text": {
      const style: CSSProperties = {
        lineHeight: 1.6,
        ...toCss(node.data.style, STYLE_KEYS.Text),
      };
      if (selected) {
        return (
          <EditableText
            value={node.data.props.text}
            onCommit={(text) =>
              handlers.onUpdate(id, {
                ...node,
                data: { ...node.data, props: { ...node.data.props, text } },
              })
            }
            style={style}
            className="whitespace-pre-wrap"
          />
        );
      }
      return (
        <div style={style} className="whitespace-pre-wrap">
          {resolveSampleTags(node.data.props.text) || "Text"}
        </div>
      );
    }
    case "Button": {
      const p = node.data.props;
      const radius =
        p.buttonStyle === "rectangle" ? 0 : p.buttonStyle === "pill" ? 64 : 4;
      return (
        <div
          style={toCss(node.data.style, [
            "backgroundColor",
            "textAlign",
            "padding",
          ])}
        >
          <span
            style={{
              display: p.fullWidth ? "block" : "inline-block",
              backgroundColor: p.buttonBackgroundColor,
              color: p.buttonTextColor,
              borderRadius: radius,
              padding: "10px 18px",
              fontWeight: 600,
              textAlign: "center",
              ...toCss(node.data.style, [
                "fontFamily",
                "fontStack",
                "fontSize",
                "fontWeight",
                "letterSpacing",
                "textTransform",
              ]),
            }}
          >
            {resolveSampleTags(p.text) || "Button"}
          </span>
        </div>
      );
    }
    case "Image": {
      const p = node.data.props;
      return (
        <div style={toCss(node.data.style, STYLE_KEYS.Image)}>
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.url}
              alt={p.alt}
              style={{
                width: p.width ?? "100%",
                height: p.height ?? "auto",
                display: "inline-block",
              }}
            />
          ) : (
            <div className="flex items-center justify-center rounded bg-gray-100 py-10 text-xs text-gray-400">
              <PhotoIcon className="mr-2 size-5" aria-hidden="true" />
              Image
            </div>
          )}
        </div>
      );
    }
    case "Avatar": {
      const p = node.data.props;
      const radius =
        p.shape === "circle"
          ? 9999
          : p.shape === "rounded"
            ? p.size * 0.125
            : 0;
      return (
        <div style={toCss(node.data.style, STYLE_KEYS.Avatar)}>
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt={p.alt}
              style={{
                width: p.size,
                height: p.size,
                borderRadius: radius,
                objectFit: "cover",
                display: "inline-block",
              }}
            />
          ) : (
            <div
              style={{ width: p.size, height: p.size, borderRadius: radius }}
              className="inline-block bg-gray-200"
            />
          )}
        </div>
      );
    }
    case "Divider":
      return (
        <div style={toCss(node.data.style, STYLE_KEYS.Divider)}>
          <hr
            style={{
              border: 0,
              borderTop: `${node.data.props.lineHeight}px solid ${node.data.props.lineColor}`,
              margin: 0,
            }}
          />
        </div>
      );
    case "Spacer":
      return (
        <div style={{ height: node.data.props.height }} aria-hidden="true" />
      );
    case "Html":
      return (
        <div
          style={toCss(node.data.style, STYLE_KEYS.Html)}
          // Html block: authoring an email's raw HTML is the block's purpose.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: sanitizeEmailHtml(node.data.props.contents),
          }}
        />
      );
    case "Container":
      return (
        <div style={toCss(node.data.style, STYLE_KEYS.Container)}>
          <ChildList
            ids={node.data.props.childrenIds}
            location={{ parentId: id }}
            handlers={handlers}
            emptyHint="Empty container - add a block"
          />
        </div>
      );
    case "ColumnsContainer": {
      const p = node.data.props;
      return (
        <div style={toCss(node.data.style, STYLE_KEYS.ColumnsContainer)}>
          <div className="flex" style={{ gap: p.columnsGap }}>
            {Array.from({ length: p.columnsCount }).map((_, i) => (
              <div
                // Columns are fixed positional slots - index is the identity.
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="min-w-0 flex-1 rounded border border-dashed border-border/50"
              >
                <ChildList
                  ids={p.columns[i]?.childrenIds ?? []}
                  location={{ parentId: id, columnIndex: i }}
                  handlers={handlers}
                  emptyHint="Column"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "EmailLayout":
      return null;
  }
}

/** The email canvas: renders the root's children with insert/select/reorder. */
export function EmailCanvas(handlers: CanvasHandlers) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const root = handlers.doc.blocks[handlers.doc.root];
  if (root?.type !== "EmailLayout") return null;
  const d = root.data;
  return (
    <DragCtx.Provider value={{ draggingId, setDraggingId }}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Select email styles"
        onClick={() => handlers.onSelect(handlers.doc.root)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handlers.onSelect(handlers.doc.root);
        }}
        style={{
          backgroundColor: d.canvasColor,
          borderRadius: d.borderRadius,
          border: d.borderColor ? `1px solid ${d.borderColor}` : undefined,
          color: d.textColor,
          fontFamily: fontFamilyToCss(d.fontFamily) ?? undefined,
        }}
        className="mx-auto w-full overflow-hidden outline-none"
      >
        <div className="p-2">
          <ChildList
            ids={d.childrenIds}
            location={{ parentId: handlers.doc.root }}
            handlers={handlers}
            emptyHint="Empty email - add a block from the left or the + button."
          />
        </div>
      </div>
    </DragCtx.Provider>
  );
}
