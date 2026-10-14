import type { CSSProperties, ReactNode } from "react";

import type {
  Diagram,
  StageTone,
} from "@/onchain-suite-website/types/retention-playbook";
import {
  type Rand,
  roughArrow,
  roughLine,
  roughRect,
  seededRandom,
  wrapLines,
} from "@/onchain-suite-website/utils/sketch";

/* Hand-drawn diagrams, server rendered. Each diagram draws twice: a wide
   layout for desktop and a narrow one for phones (CSS shows one), so labels
   stay legible instead of scaling down. `--i` staggers the draw-in order. */

const WIDE = 760;
const NARROW = 340;

interface Item {
  label: string;
  note?: string;
  tone?: StageTone;
}

function Ink({ d, i, tone }: { d: string; i: number; tone?: StageTone }) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`rp-ink${tone ? ` ink-${tone}` : ""}`}
      style={{ "--i": i } as CSSProperties}
    />
  );
}

function Words({
  x,
  y,
  lines,
  size,
  i,
  anchor = "middle",
  soft = false,
}: {
  x: number;
  y: number;
  lines: string[];
  size: number;
  i: number;
  anchor?: "start" | "middle";
  soft?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      className={`rp-hand${soft ? " is-soft" : ""}`}
      style={{ "--i": i } as CSSProperties}
    >
      {lines.map((line, k) => (
        // Wrapped lines of one label do not repeat, so the text is the key.
        <tspan key={line} x={x} dy={k === 0 ? 0 : size * 1.12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Svg({
  w,
  h,
  wide,
  children,
}: {
  w: number;
  h: number;
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${Math.ceil(h)}`}
      className={`rp-art-svg ${wide ? "rp-art-wide" : "rp-art-narrow"}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Boxes left to right with arrows between, notes under each box. */
function BoxesWide({ items, rand }: { items: Item[]; rand: Rand }) {
  const pad = 12;
  const gap = 26;
  const top = 14;
  const bh = 58;
  const n = items.length;
  const bw = (WIDE - pad * 2 - gap * (n - 1)) / n;
  const labels = items.map((it) => wrapLines(it.label, Math.floor(bw / 9.5)));
  const notes = items.map((it) =>
    it.note ? wrapLines(it.note, Math.floor(bw / 6.8)) : []
  );
  const maxNote = Math.max(0, ...notes.map((l) => l.length));
  const h = top + bh + (maxNote ? 30 + maxNote * 17 : 0) + 10;
  return (
    <Svg w={WIDE} h={h} wide>
      {items.map((it, i) => {
        const x = pad + i * (bw + gap);
        const ly = top + bh / 2 + 7 - (labels[i].length - 1) * 11;
        return (
          <g key={it.label}>
            <Ink d={roughRect(x, top, bw, bh, rand)} i={i * 2} tone={it.tone} />
            <Words
              x={x + bw / 2}
              y={ly}
              lines={labels[i]}
              size={21}
              i={i * 2}
            />
            {notes[i].length > 0 && (
              <Words
                x={x + bw / 2}
                y={top + bh + 28}
                lines={notes[i]}
                size={16}
                i={i * 2 + 1}
                soft
              />
            )}
            {i < n - 1 && (
              <Ink
                d={roughArrow(
                  x + bw + 5,
                  top + bh / 2,
                  x + bw + gap - 5,
                  top + bh / 2,
                  rand
                )}
                i={i * 2 + 1}
              />
            )}
          </g>
        );
      })}
    </Svg>
  );
}

/** The same boxes stacked top to bottom, each note beside its box. */
function BoxesNarrow({ items, rand }: { items: Item[]; rand: Rand }) {
  const bx = 6;
  const bw = 126;
  const noteX = bx + bw + 16;
  const gap = 26;
  let y = 8;
  const rows = items.map((it) => {
    const labels = wrapLines(it.label, 12);
    const notes = it.note ? wrapLines(it.note, 22) : [];
    const bh = Math.max(46, labels.length * 22 + 18);
    const rowH = Math.max(bh, notes.length * 17 + 8);
    const row = { it, labels, notes, bh, y };
    y += rowH + gap;
    return row;
  });
  const h = y - gap + 8;
  return (
    <Svg w={NARROW} h={h} wide={false}>
      {rows.map((row, i) => (
        <g key={row.it.label}>
          <Ink
            d={roughRect(bx, row.y, bw, row.bh, rand)}
            i={i * 2}
            tone={row.it.tone}
          />
          <Words
            x={bx + bw / 2}
            y={row.y + row.bh / 2 + 7 - (row.labels.length - 1) * 11}
            lines={row.labels}
            size={21}
            i={i * 2}
          />
          {row.notes.length > 0 && (
            <Words
              x={noteX}
              y={row.y + 18}
              lines={row.notes}
              size={16}
              i={i * 2 + 1}
              anchor="start"
              soft
            />
          )}
          {i < rows.length - 1 && (
            <Ink
              d={roughArrow(
                bx + bw / 2,
                row.y + row.bh + 4,
                bx + bw / 2,
                rows[i + 1].y - 4,
                rand
              )}
              i={i * 2 + 1}
            />
          )}
        </g>
      ))}
    </Svg>
  );
}

/** A dated line: when above each tick, what happened below. */
function TimelineWide({
  points,
  rand,
}: {
  points: { when: string; label: string }[];
  rand: Rand;
}) {
  const x0 = 24;
  const x1 = WIDE - 24;
  const lineY = 44;
  const n = points.length;
  const step = n > 1 ? (x1 - x0 - 40) / (n - 1) : 0;
  const xs = points.map((_, i) => (n > 1 ? x0 + 20 + i * step : WIDE / 2));
  const chars = Math.max(12, Math.floor((n > 1 ? step : 300) / 7.2));
  const labels = points.map((p) => wrapLines(p.label, chars));
  const h = lineY + 34 + Math.max(...labels.map((l) => l.length)) * 17 + 8;
  return (
    <Svg w={WIDE} h={h} wide>
      <Ink d={roughArrow(x0, lineY, x1, lineY, rand)} i={0} />
      {points.map((p, i) => (
        <g key={`${p.when}-${p.label}`}>
          <Ink
            d={roughLine(xs[i], lineY - 8, xs[i], lineY + 8, rand, 0.8)}
            i={i + 1}
          />
          <Words
            x={xs[i]}
            y={lineY - 16}
            lines={[p.when]}
            size={19}
            i={i + 1}
          />
          <Words
            x={xs[i]}
            y={lineY + 32}
            lines={labels[i]}
            size={16}
            i={i + 1}
            soft
          />
        </g>
      ))}
    </Svg>
  );
}

function TimelineNarrow({
  points,
  rand,
}: {
  points: { when: string; label: string }[];
  rand: Rand;
}) {
  const lx = 16;
  let y = 14;
  const rows = points.map((p) => {
    const lines = wrapLines(p.label, 30);
    const row = { p, lines, y };
    y += 26 + lines.length * 17 + 18;
    return row;
  });
  const h = y;
  return (
    <Svg w={NARROW} h={h} wide={false}>
      <Ink d={roughArrow(lx, 6, lx, h - 6, rand)} i={0} />
      {rows.map((row, i) => (
        <g key={`${row.p.when}-${row.p.label}`}>
          <Ink
            d={roughLine(lx - 7, row.y + 2, lx + 7, row.y + 2, rand, 0.8)}
            i={i + 1}
          />
          <Words
            x={lx + 20}
            y={row.y + 8}
            lines={[row.p.when]}
            size={19}
            i={i + 1}
            anchor="start"
          />
          <Words
            x={lx + 20}
            y={row.y + 30}
            lines={row.lines}
            size={16}
            i={i + 1}
            anchor="start"
            soft
          />
        </g>
      ))}
    </Svg>
  );
}

/** Layers, narrowest on top, on a hatched ground line. */
function StackWide({
  layers,
  rand,
}: {
  layers: { label: string; note: string }[];
  rand: Rand;
}) {
  const bh = 54;
  const top = 10;
  const n = layers.length;
  const maxW = WIDE - 60;
  const minW = Math.min(360, maxW);
  const step = n > 1 ? (maxW - minW) / (n - 1) : 0;
  const ground = top + n * bh + 6;
  const hatch = Array.from({ length: 34 }, (_, k) => 40 + k * 20);
  return (
    <Svg w={WIDE} h={ground + 22} wide>
      {layers.map((layer, i) => {
        const w = minW + i * step;
        const x = (WIDE - w) / 2;
        const y = top + i * bh;
        return (
          <g key={layer.label}>
            <Ink d={roughRect(x, y, w, bh - 4, rand)} i={n - i} />
            <Words
              x={WIDE / 2}
              y={y + bh / 2 + 4}
              lines={[`${layer.label}  →  ${layer.note}`]}
              size={20}
              i={n - i}
            />
          </g>
        );
      })}
      <Ink d={roughLine(30, ground, WIDE - 30, ground, rand)} i={0} />
      {hatch.map((hx) => (
        <Ink
          key={hx}
          d={roughLine(hx, ground + 2, hx - 10, ground + 14, rand, 0.4)}
          i={0}
        />
      ))}
    </Svg>
  );
}

function StackNarrow({
  layers,
  rand,
}: {
  layers: { label: string; note: string }[];
  rand: Rand;
}) {
  let y = 8;
  const rows = layers.map((layer) => {
    const notes = wrapLines(layer.note, 34);
    const bh = 34 + notes.length * 17;
    const row = { layer, notes, y, bh };
    y += bh + 8;
    return row;
  });
  return (
    <Svg w={NARROW} h={y} wide={false}>
      {rows.map((row, i) => (
        <g key={row.layer.label}>
          <Ink
            d={roughRect(6, row.y, NARROW - 12, row.bh, rand)}
            i={rows.length - i}
          />
          <Words
            x={18}
            y={row.y + 24}
            lines={[row.layer.label]}
            size={20}
            i={rows.length - i}
            anchor="start"
          />
          <Words
            x={18}
            y={row.y + 44}
            lines={row.notes}
            size={16}
            i={rows.length - i}
            anchor="start"
            soft
          />
        </g>
      ))}
    </Svg>
  );
}

/** Draws a diagram in both layouts from one seed. */
export function DiagramSketch({
  diagram,
  seed,
}: {
  diagram: Diagram;
  seed: number;
}) {
  // Separate generators per layout: each layout's wobble is independent of
  // how many strokes the other one drew.
  const wide = seededRandom(seed);
  const narrow = seededRandom(seed + 1);
  switch (diagram.type) {
    case "ladder":
      return (
        <>
          <BoxesWide items={diagram.steps} rand={wide} />
          <BoxesNarrow items={diagram.steps} rand={narrow} />
        </>
      );
    case "flow":
      return (
        <>
          <BoxesWide items={diagram.nodes} rand={wide} />
          <BoxesNarrow items={diagram.nodes} rand={narrow} />
        </>
      );
    case "timeline":
      return (
        <>
          <TimelineWide points={diagram.points} rand={wide} />
          <TimelineNarrow points={diagram.points} rand={narrow} />
        </>
      );
    case "stack":
      return (
        <>
          <StackWide layers={diagram.layers} rand={wide} />
          <StackNarrow layers={diagram.layers} rand={narrow} />
        </>
      );
  }
}
