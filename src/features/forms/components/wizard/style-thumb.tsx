import type { FormCaptureType, FormStyleId } from "../../forms.catalog";

/**
 * Schematic thumbnails for the style / template pickers. Pure SVG using
 * semantic fill tokens so they read correctly in light and dark. Mirrors the
 * reference's little wireframes (viewBox 120x96).
 */

type Fill = "border" | "strong" | "selected" | "subtle" | "surface" | "accent";

const FILL: Record<Fill, string> = {
  border: "fill-border",
  strong: "fill-muted-foreground/50",
  selected: "fill-primary/15",
  subtle: "fill-muted",
  surface: "fill-card",
  accent: "fill-primary",
};

function R({
  x,
  y,
  w,
  h,
  c,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  c: Fill;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={2} className={FILL[c]} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className="h-full w-full"
      role="presentation"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function StyleThumb({ style }: { style: FormStyleId }) {
  switch (style) {
    case "inline":
      return (
        <Frame>
          <R x={20} y={14} w={80} h={5} c="border" />
          <R x={20} y={24} w={80} h={5} c="border" />
          <R x={20} y={38} w={80} h={12} c="selected" />
          <R x={24} y={41} w={40} h={6} c="accent" />
          <R x={20} y={58} w={80} h={5} c="border" />
          <R x={20} y={68} w={80} h={5} c="border" />
        </Frame>
      );
    case "popup":
      return (
        <Frame>
          <R x={6} y={10} w={108} h={76} c="subtle" />
          <R x={34} y={32} w={52} h={32} c="surface" />
          <R x={40} y={40} w={40} h={5} c="strong" />
          <R x={40} y={50} w={40} h={8} c="accent" />
        </Frame>
      );
    case "hellobar":
      return (
        <Frame>
          <R x={10} y={12} w={100} h={14} c="selected" />
          <R x={16} y={17} w={44} h={5} c="accent" />
          <R x={84} y={16} w={20} h={7} c="accent" />
          <R x={20} y={36} w={80} h={5} c="border" />
          <R x={20} y={46} w={80} h={5} c="border" />
          <R x={20} y={56} w={80} h={5} c="border" />
        </Frame>
      );
    case "slidein":
      return (
        <Frame>
          <R x={20} y={14} w={80} h={5} c="border" />
          <R x={20} y={24} w={80} h={5} c="border" />
          <R x={20} y={34} w={80} h={5} c="border" />
          <R x={62} y={54} w={46} h={30} c="surface" />
          <R x={68} y={60} w={34} h={5} c="strong" />
          <R x={68} y={70} w={34} h={8} c="accent" />
        </Frame>
      );
    case "hosted":
      return (
        <Frame>
          <R x={6} y={10} w={108} h={12} c="subtle" />
          <R x={12} y={14} w={10} h={4} c="strong" />
          <R x={34} y={40} w={52} h={10} c="surface" />
          <R x={40} y={43} w={24} h={4} c="strong" />
          <R x={40} y={56} w={40} h={8} c="accent" />
        </Frame>
      );
  }
}

export function TemplateThumb({ type }: { type: FormCaptureType }) {
  if (type === "identity") {
    return (
      <Frame>
        <R x={30} y={16} w={60} h={5} c="strong" />
        <R x={30} y={26} w={60} h={4} c="border" />
        <R x={30} y={38} w={60} h={10} c="accent" />
        <R x={30} y={54} w={60} h={7} c="selected" />
        <R x={30} y={66} w={60} h={7} c="selected" />
        <R x={30} y={80} w={60} h={8} c="accent" />
      </Frame>
    );
  }
  return (
    <Frame>
      <R x={20} y={30} w={58} h={10} c="surface" />
      <R x={82} y={30} w={18} h={10} c="accent" />
      <R x={20} y={48} w={80} h={4} c="border" />
      <R x={20} y={56} w={80} h={4} c="border" />
    </Frame>
  );
}
