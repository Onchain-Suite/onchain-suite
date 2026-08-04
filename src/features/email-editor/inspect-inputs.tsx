"use client";

import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  type BlockStyle,
  FONT_FAMILIES,
  type FontFamily,
  MERGE_TAGS,
  type Padding,
  type StyleKey,
} from "./blocks";

/** Small labelled section wrapper. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Color picker with an optional clear (for nullable style colors). */
export function ColorInput({
  label,
  value,
  onChange,
  nullable = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  nullable?: boolean;
}) {
  const current = value ?? "#000000";
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label={label}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {value ?? "—"}
        </span>
        {nullable && value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label={`Clear ${label}`}
          >
            <XMarkIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </Field>
  );
}

/** Labelled range slider with a numeric readout. */
export function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  units = "px",
  icon,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  units?: string;
  icon?: React.ReactNode;
}) {
  const v = value ?? 0;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
          aria-label={label}
        />
        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
          {v}
          {units}
        </span>
      </div>
    </Field>
  );
}

/** Four-way padding editor (top / bottom / left / right sliders). */
export function PaddingInput({
  value,
  onChange,
}: {
  value: Padding | null | undefined;
  onChange: (v: Padding) => void;
}) {
  const p: Padding = value ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const set = (k: keyof Padding, n: number) => onChange({ ...p, [k]: n });
  return (
    <Field label="Padding">
      <div className="space-y-2">
        {(
          [
            ["top", "Top"],
            ["bottom", "Bottom"],
            ["left", "Left"],
            ["right", "Right"],
          ] as const
        ).map(([k, lbl]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">
              {lbl}
            </span>
            <input
              type="range"
              min={0}
              max={80}
              step={4}
              value={p[k]}
              onChange={(e) => set(k, Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label={`Padding ${lbl}`}
            />
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {p[k]}px
            </span>
          </div>
        ))}
      </div>
    </Field>
  );
}

/** Generic exclusive toggle group. */
export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T | null | undefined;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  const body = (
    <div className="inline-flex w-full overflow-hidden rounded-lg border border-border">
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 px-2.5 py-1.5 text-sm font-medium transition-colors",
              i > 0 && "border-l border-border",
              active
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
  return label ? <Field label={label}>{body}</Field> : body;
}

export function FontFamilySelect({
  label = "Font family",
  value,
  onChange,
  allowInherit = true,
}: {
  label?: string;
  value: FontFamily | null | undefined;
  onChange: (v: FontFamily | null) => void;
  allowInherit?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? "__inherit__"}
        onChange={(e) =>
          onChange(
            e.target.value === "__inherit__"
              ? null
              : (e.target.value as FontFamily)
          )
        }
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
      >
        {allowInherit ? (
          <option value="__inherit__">Match email settings</option>
        ) : null}
        {FONT_FAMILIES.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FontWeightToggle({
  value,
  onChange,
}: {
  value: "bold" | "normal" | null | undefined;
  onChange: (v: "bold" | "normal") => void;
}) {
  return (
    <ToggleGroup
      label="Font weight"
      value={value ?? "normal"}
      onChange={onChange}
      options={[
        { value: "normal", label: "Regular" },
        { value: "bold", label: "Bold" },
      ]}
    />
  );
}

export function TextAlignToggle({
  value,
  onChange,
}: {
  value: "left" | "center" | "right" | null | undefined;
  onChange: (v: "left" | "center" | "right") => void;
}) {
  return (
    <ToggleGroup
      label="Alignment"
      value={value ?? "left"}
      onChange={onChange}
      options={[
        { value: "left", label: <Bars3BottomLeftIcon className="size-4" /> },
        { value: "center", label: <Bars3Icon className="size-4" /> },
        { value: "right", label: <Bars3BottomRightIcon className="size-4" /> },
      ]}
    />
  );
}

/** Variable-tag inserter (dropdown of merge tags). */
export function VariableTagButton({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
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
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {"{ }"} Variable Tags
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {MERGE_TAGS.map((tag) => (
            <button
              key={tag.token}
              type="button"
              onClick={() => {
                onInsert(`{{ ${tag.token} }}`);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="text-foreground">{tag.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {tag.token}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Render the Inspect "Appearance" controls for a block's style bag. */
export function StyleControls({
  keys,
  style,
  onChange,
}: {
  keys: StyleKey[];
  style: BlockStyle;
  onChange: (next: BlockStyle) => void;
}) {
  const set = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Appearance
      </p>
      {keys.map((k) => {
        switch (k) {
          case "color":
            return (
              <ColorInput
                key={k}
                label="Text color"
                nullable
                value={style.color}
                onChange={(color) => set({ color })}
              />
            );
          case "backgroundColor":
            return (
              <ColorInput
                key={k}
                label="Background color"
                nullable
                value={style.backgroundColor}
                onChange={(backgroundColor) => set({ backgroundColor })}
              />
            );
          case "borderColor":
            return (
              <ColorInput
                key={k}
                label="Border color"
                nullable
                value={style.borderColor}
                onChange={(borderColor) => set({ borderColor })}
              />
            );
          case "borderRadius":
            return (
              <SliderInput
                key={k}
                label="Border radius"
                min={0}
                max={48}
                step={4}
                value={style.borderRadius}
                onChange={(borderRadius) => set({ borderRadius })}
              />
            );
          case "fontFamily":
            return (
              <FontFamilySelect
                key={k}
                value={style.fontFamily}
                onChange={(fontFamily) => set({ fontFamily })}
              />
            );
          case "fontSize":
            return (
              <SliderInput
                key={k}
                label="Font size"
                min={10}
                max={48}
                step={1}
                value={style.fontSize ?? 15}
                onChange={(fontSize) => set({ fontSize })}
              />
            );
          case "fontWeight":
            return (
              <FontWeightToggle
                key={k}
                value={style.fontWeight}
                onChange={(fontWeight) => set({ fontWeight })}
              />
            );
          case "textAlign":
            return (
              <TextAlignToggle
                key={k}
                value={style.textAlign}
                onChange={(textAlign) => set({ textAlign })}
              />
            );
          case "padding":
            return (
              <PaddingInput
                key={k}
                value={style.padding}
                onChange={(padding) => set({ padding })}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
