"use client";

import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  BlockNode,
  BlockStyle,
  ButtonNode,
  ColumnsContainerNode,
  EmailLayoutNode,
  FontFamily,
} from "./blocks";
import { resolveColumnWidths, STYLE_KEYS } from "./blocks";
import {
  ColorInput,
  Field,
  FontFamilySelect,
  SliderInput,
  StyleControls,
  ToggleGroup,
  VariableTagButton,
} from "./inspect-inputs";

/** Textarea + Variable Tags with insert-at-cursor. */
function ContentField({
  label,
  value,
  onChange,
  rows = 3,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <VariableTagButton onInsert={insert} />
      </div>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={mono ? "rounded-lg font-mono text-xs" : "rounded-lg"}
      />
    </div>
  );
}

async function uploadEmailImage(
  file: File,
  orgId: string | undefined
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (orgId) headers["x-org-id"] = orgId;
  const res = await axios.post("/api/upload/email-image", formData, {
    headers,
  });
  const root = isJsonObject(res.data) ? res.data : {};
  const data = isJsonObject(root.data) ? root.data : root;
  const url =
    (typeof data.url === "string" && data.url) ||
    (typeof data.src === "string" && data.src) ||
    "";
  if (!url) throw new Error("Upload returned no URL");
  return url;
}

export function ImageUploadButton({
  onUploaded,
  label = "Upload image",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: session } = authClient.useSession();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (ref.current) ref.current.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const orgId =
              getSelectedOrganizationId() ??
              session?.session?.activeOrganizationId;
            const url = await uploadEmailImage(file, orgId ?? undefined);
            onUploaded(url);
            toast.success("Image uploaded");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
      >
        <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}

/** Per-block configuration panel, dispatched by node type. */
export function InspectPanel({
  node,
  onChange,
}: {
  node: BlockNode;
  onChange: (next: BlockNode) => void;
}) {
  const title = `${node.type === "ColumnsContainer" ? "Columns" : node.type} block`;

  const setStyle = (style: BlockStyle) => {
    if (node.type === "Spacer" || node.type === "EmailLayout") return;
    onChange({ ...node, data: { ...node.data, style } } as BlockNode);
  };
  const styleOf = (n: BlockNode): BlockStyle =>
    n.type === "Spacer" || n.type === "EmailLayout" ? {} : n.data.style;

  return (
    <div className="space-y-4">
      <p className="border-l-2 border-primary pl-2 text-sm font-semibold text-foreground">
        {title}
      </p>

      {node.type === "Heading" ? (
        <>
          <ContentField
            label="Content"
            value={node.data.props.text}
            onChange={(text) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, text } },
              })
            }
          />
          <ToggleGroup
            label="Level"
            value={node.data.props.level}
            onChange={(level) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, level } },
              })
            }
            options={[
              { value: "h1", label: "H1" },
              { value: "h2", label: "H2" },
              { value: "h3", label: "H3" },
            ]}
          />
        </>
      ) : null}

      {node.type === "Text" ? (
        <ContentField
          label="Content"
          rows={5}
          value={node.data.props.text}
          onChange={(text) =>
            onChange({
              ...node,
              data: { ...node.data, props: { ...node.data.props, text } },
            })
          }
        />
      ) : null}

      {node.type === "Button" ? (
        <ButtonProps node={node} onChange={onChange} />
      ) : null}

      {node.type === "Image" ? (
        <>
          <Field label="Source URL">
            <Input
              value={node.data.props.url}
              onChange={(e) =>
                onChange({
                  ...node,
                  data: {
                    ...node.data,
                    props: { ...node.data.props, url: e.target.value },
                  },
                })
              }
              placeholder="https://…/image.png"
              className="h-9 rounded-lg font-mono text-xs"
            />
          </Field>
          <ImageUploadButton
            onUploaded={(url) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, url } },
              })
            }
          />
          <Field label="Alt text">
            <Input
              value={node.data.props.alt}
              onChange={(e) =>
                onChange({
                  ...node,
                  data: {
                    ...node.data,
                    props: { ...node.data.props, alt: e.target.value },
                  },
                })
              }
              className="h-9 rounded-lg"
            />
          </Field>
          <Field label="Click-through URL">
            <Input
              value={node.data.props.linkHref ?? ""}
              onChange={(e) =>
                onChange({
                  ...node,
                  data: {
                    ...node.data,
                    props: {
                      ...node.data.props,
                      linkHref: e.target.value || null,
                    },
                  },
                })
              }
              placeholder="https://"
              className="h-9 rounded-lg font-mono text-xs"
            />
          </Field>
          <ToggleGroup
            label="Content alignment"
            value={node.data.props.contentAlignment}
            onChange={(contentAlignment) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, contentAlignment },
                },
              })
            }
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </>
      ) : null}

      {node.type === "Avatar" ? (
        <>
          <SliderInput
            label="Size"
            min={32}
            max={256}
            step={4}
            value={node.data.props.size}
            onChange={(size) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, size } },
              })
            }
          />
          <ToggleGroup
            label="Shape"
            value={node.data.props.shape}
            onChange={(shape) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, shape } },
              })
            }
            options={[
              { value: "circle", label: "Circle" },
              { value: "square", label: "Square" },
              { value: "rounded", label: "Rounded" },
            ]}
          />
          <Field label="Image URL">
            <Input
              value={node.data.props.imageUrl}
              onChange={(e) =>
                onChange({
                  ...node,
                  data: {
                    ...node.data,
                    props: { ...node.data.props, imageUrl: e.target.value },
                  },
                })
              }
              placeholder="https://…"
              className="h-9 rounded-lg font-mono text-xs"
            />
          </Field>
          <ImageUploadButton
            onUploaded={(imageUrl) =>
              onChange({
                ...node,
                data: { ...node.data, props: { ...node.data.props, imageUrl } },
              })
            }
          />
        </>
      ) : null}

      {node.type === "Divider" ? (
        <>
          <ColorInput
            label="Line color"
            value={node.data.props.lineColor}
            onChange={(v) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, lineColor: v ?? "#CCCCCC" },
                },
              })
            }
          />
          <SliderInput
            label="Line height"
            min={1}
            max={24}
            step={1}
            value={node.data.props.lineHeight}
            onChange={(lineHeight) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, lineHeight },
                },
              })
            }
          />
        </>
      ) : null}

      {node.type === "Spacer" ? (
        <SliderInput
          label="Height"
          min={4}
          max={128}
          step={4}
          value={node.data.props.height}
          onChange={(height) =>
            onChange({ ...node, data: { props: { height } } })
          }
        />
      ) : null}

      {node.type === "Html" ? (
        <ContentField
          label="Contents"
          rows={6}
          mono
          value={node.data.props.contents}
          onChange={(contents) =>
            onChange({
              ...node,
              data: { ...node.data, props: { ...node.data.props, contents } },
            })
          }
        />
      ) : null}

      {node.type === "List" ? (
        <>
          <ToggleGroup
            label="List style"
            value={node.data.props.ordered ? "ordered" : "bullet"}
            onChange={(v) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, ordered: v === "ordered" },
                },
              })
            }
            options={[
              { value: "bullet", label: "Bulleted" },
              { value: "ordered", label: "Numbered" },
            ]}
          />
          <ContentField
            label="Items (one per line)"
            rows={6}
            value={node.data.props.items.join("\n")}
            onChange={(text) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, items: text.split("\n") },
                },
              })
            }
          />
        </>
      ) : null}

      {node.type === "ColumnsContainer" ? (
        <>
          <ToggleGroup
            label="Number of columns"
            value={String(node.data.props.columnsCount) as "2" | "3"}
            onChange={(v) => {
              const columnsCount = Number(v) as 2 | 3;
              const columns = [0, 1, 2].map(
                (i) => node.data.props.columns[i] ?? { childrenIds: [] }
              );
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, columnsCount, columns },
                },
              });
            }}
            options={[
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
          />
          <SliderInput
            label="Columns gap"
            min={0}
            max={80}
            step={4}
            value={node.data.props.columnsGap}
            onChange={(columnsGap) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, columnsGap },
                },
              })
            }
          />
          <ColumnWidthControl node={node} onChange={onChange} />
          <ToggleGroup
            label="Content alignment"
            value={node.data.props.contentAlignment}
            onChange={(contentAlignment) =>
              onChange({
                ...node,
                data: {
                  ...node.data,
                  props: { ...node.data.props, contentAlignment },
                },
              })
            }
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </>
      ) : null}

      {STYLE_KEYS[node.type] ? (
        <StyleControls
          keys={STYLE_KEYS[node.type]}
          style={styleOf(node)}
          onChange={setStyle}
        />
      ) : null}
    </div>
  );
}

function ColumnWidthControl({
  node,
  onChange,
}: {
  node: ColumnsContainerNode;
  onChange: (n: BlockNode) => void;
}) {
  const count = node.data.props.columnsCount;
  const presets =
    count === 2
      ? [
          { key: "even", label: "50 / 50", widths: [50, 50] },
          { key: "left", label: "67 / 33", widths: [67, 33] },
          { key: "right", label: "33 / 67", widths: [33, 67] },
        ]
      : [
          { key: "even", label: "Even", widths: [34, 33, 33] },
          { key: "center", label: "25 / 50 / 25", widths: [25, 50, 25] },
        ];
  const cur = resolveColumnWidths(count, node.data.props.columnWidths);
  const match = presets.find(
    (p) =>
      p.widths.length === cur.length &&
      p.widths.every((w, i) => Math.abs(w - cur[i]) <= 1)
  );
  return (
    <ToggleGroup
      label="Column widths"
      value={match?.key ?? "even"}
      onChange={(key) => {
        const preset = presets.find((p) => p.key === key);
        if (!preset) return;
        onChange({
          ...node,
          data: {
            ...node.data,
            props: { ...node.data.props, columnWidths: preset.widths },
          },
        });
      }}
      options={presets.map((p) => ({ value: p.key, label: p.label }))}
    />
  );
}

function ButtonProps({
  node,
  onChange,
}: {
  node: ButtonNode;
  onChange: (n: BlockNode) => void;
}) {
  const p = node.data.props;
  const setProps = (patch: Partial<ButtonNode["data"]["props"]>) =>
    onChange({ ...node, data: { ...node.data, props: { ...p, ...patch } } });
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Text
          </label>
          <VariableTagButton
            onInsert={(token) => {
              const el = ref.current;
              const start = el?.selectionStart ?? p.text.length;
              const end = el?.selectionEnd ?? p.text.length;
              setProps({
                text: p.text.slice(0, start) + token + p.text.slice(end),
              });
            }}
          />
        </div>
        <Textarea
          ref={ref}
          value={p.text}
          onChange={(e) => setProps({ text: e.target.value })}
          rows={2}
          className="rounded-lg"
        />
      </div>
      <Field label="Link URL">
        <Input
          value={p.url}
          onChange={(e) => setProps({ url: e.target.value })}
          placeholder="https://"
          className="h-9 rounded-lg font-mono text-xs"
        />
      </Field>
      <ToggleGroup
        label="Width"
        value={p.fullWidth ? "full" : "auto"}
        onChange={(v) => setProps({ fullWidth: v === "full" })}
        options={[
          { value: "auto", label: "Auto" },
          { value: "full", label: "Full" },
        ]}
      />
      <ToggleGroup
        label="Size"
        value={p.size}
        onChange={(size) => setProps({ size })}
        options={[
          { value: "x-small", label: "Xs" },
          { value: "small", label: "Sm" },
          { value: "medium", label: "Md" },
          { value: "large", label: "Lg" },
        ]}
      />
      <ToggleGroup
        label="Style"
        value={p.buttonStyle}
        onChange={(buttonStyle) => setProps({ buttonStyle })}
        options={[
          { value: "rectangle", label: "Rectangle" },
          { value: "rounded", label: "Rounded" },
          { value: "pill", label: "Pill" },
        ]}
      />
      <ColorInput
        label="Button color"
        value={p.buttonBackgroundColor}
        onChange={(v) => setProps({ buttonBackgroundColor: v ?? "#111111" })}
      />
      <ColorInput
        label="Text color"
        value={p.buttonTextColor}
        onChange={(v) => setProps({ buttonTextColor: v ?? "#FFFFFF" })}
      />
    </>
  );
}

/** Global email styles (the Styles tab), editing the root EmailLayout. */
export function StylesPanel({
  layout,
  onChange,
}: {
  layout: EmailLayoutNode;
  onChange: (next: EmailLayoutNode) => void;
}) {
  const d = layout.data;
  const set = (patch: Partial<EmailLayoutNode["data"]>) =>
    onChange({ ...layout, data: { ...d, ...patch } });
  return (
    <div className="space-y-3">
      <p className="border-l-2 border-primary pl-2 text-sm font-semibold text-foreground">
        Email styles
      </p>
      <Field label="Preview text">
        <Input
          value={d.preheader ?? ""}
          onChange={(e) => set({ preheader: e.target.value })}
          placeholder="Shown in the inbox after the subject line"
          className="h-9 rounded-lg"
        />
      </Field>
      <ColorInput
        label="Backdrop color"
        value={d.backdropColor}
        onChange={(v) => set({ backdropColor: v ?? "#F5F5F5" })}
      />
      <ColorInput
        label="Canvas color"
        value={d.canvasColor}
        onChange={(v) => set({ canvasColor: v ?? "#FFFFFF" })}
      />
      <ColorInput
        label="Canvas border color"
        nullable
        value={d.borderColor}
        onChange={(borderColor) => set({ borderColor })}
      />
      <SliderInput
        label="Canvas border radius"
        min={0}
        max={48}
        step={4}
        value={d.borderRadius}
        onChange={(borderRadius) => set({ borderRadius })}
      />
      <FontFamilySelect
        label="Font family"
        allowInherit={false}
        value={d.fontFamily}
        onChange={(fontFamily) =>
          set({ fontFamily: (fontFamily ?? "MODERN_SANS") as FontFamily })
        }
      />
      <ColorInput
        label="Text color"
        value={d.textColor}
        onChange={(v) => set({ textColor: v ?? "#262626" })}
      />
    </div>
  );
}
