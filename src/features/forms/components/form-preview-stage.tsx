"use client";

import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

import { type FormStyleId, type FormSurface, getStyle } from "../forms.catalog";
import type {
  CaptureFieldSpec,
  FormAppearance,
  FormDisplaySettings,
} from "../forms.service";
import { FormRenderer, type FormRendererEditing } from "./form-renderer";

/** Faint page content the widget sits on top of, so positioning reads clearly. */
const MOCK_BARS = [
  { id: "a", w: 0.7 },
  { id: "b", w: 0.5 },
  { id: "c", w: 0.85 },
  { id: "d", w: 0.6 },
  { id: "e", w: 0.75 },
  { id: "f", w: 0.5 },
  { id: "g", w: 0.8 },
];

function MockPage() {
  return (
    <div
      className="flex flex-col gap-2.5 p-6"
      aria-hidden="true"
      role="presentation"
    >
      {MOCK_BARS.map((bar) => (
        <div
          key={bar.id}
          className="h-2 rounded bg-muted-foreground/15"
          style={{ width: `${bar.w * 100}%` }}
        />
      ))}
    </div>
  );
}

interface StageProps {
  name: string;
  fields: CaptureFieldSpec[];
  display: Required<FormDisplaySettings>;
  appearance: FormAppearance;
  submitLabel?: string;
  zkEnabled: boolean;
  style: FormStyleId;
  surface: FormSurface;
  device: "desktop" | "mobile";
  onDevice: (d: "desktop" | "mobile") => void;
  onEditStyle: () => void;
  editing?: FormRendererEditing;
  hostedUrl: string;
}

/**
 * Style-aware preview. Widget styles position the same card differently
 * (in-page, centered modal + backdrop, top banner, corner card); the hosted
 * style renders inside a browser chrome to signal it's a standalone page.
 */
export function FormPreviewStage({
  name,
  fields,
  display,
  appearance,
  submitLabel,
  zkEnabled,
  style,
  surface,
  device,
  onDevice,
  onEditStyle,
  editing,
  hostedUrl,
}: StageProps) {
  const hosted = surface === "hosted";
  const card = (
    <FormRenderer
      name={name}
      fields={fields}
      displayOverride={display}
      appearance={appearance}
      submitLabel={submitLabel}
      zkEnabled={zkEnabled}
      editing={editing}
      device={device}
      className={
        style === "hellobar" ? "max-w-none rounded-none border-x-0" : undefined
      }
    />
  );

  return (
    <div>
      {/* Header: device toggle + previewing label */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {(
            [
              { key: "desktop", label: "Desktop", Icon: ComputerDesktopIcon },
              { key: "mobile", label: "Mobile", Icon: DevicePhoneMobileIcon },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onDevice(key)}
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
        <button
          type="button"
          onClick={onEditStyle}
          title="Change how this form appears"
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Previewing:{" "}
          <span className="font-semibold text-foreground">
            {hosted ? "Hosted page" : `${getStyle(style).name} widget`}
          </span>
          <PencilIcon className="size-3" aria-hidden="true" />
        </button>
      </div>

      {/* Stage */}
      {hosted ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </span>
            <span className="truncate rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
              {hostedUrl}
            </span>
          </div>
          <div className="flex justify-center px-4 py-10">{card}</div>
        </div>
      ) : (
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border bg-muted/20">
          {style === "inline" ? (
            <>
              <MockPage />
              <div className="flex justify-center px-4 pb-8">{card}</div>
              <MockPage />
            </>
          ) : (
            <>
              <MockPage />
              <MockPage />
              {style === "popup" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 p-4 backdrop-blur-[1px]">
                  {card}
                </div>
              ) : style === "hellobar" ? (
                <div className="absolute inset-x-0 top-0">{card}</div>
              ) : (
                // slide-in
                <div
                  className={cn(
                    "absolute bottom-4",
                    device === "mobile"
                      ? "inset-x-4"
                      : "right-4 w-full max-w-sm"
                  )}
                >
                  {card}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
