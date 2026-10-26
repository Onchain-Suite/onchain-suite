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
  // The hand font runs up to about 11px a character at size 21.
  const labels = items.map((it) => wrapLines(it.label, Math.floor(bw / 11)));
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
    const labels = wrapLines(it.label, 11);
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
  // A label may use 80% of the gap between ticks, at the hand font's real
  // width (about 7.6px a character at size 16), so neighbours never touch.
  const chars = Math.max(10, Math.floor(((n > 1 ? step : 300) * 0.8) / 7.6));
  const labels = points.map((p) => wrapLines(p.label, chars));
  // Each label is centred on its tick, but kept inside the drawing: the first
  // and last ticks sit 44px from the edges, closer than half a long label.
  // The hand font runs about 7.6px a character at size 16.
  const labelXs = labels.map((lines, i) => {
    const half = (Math.max(...lines.map((l) => l.length)) * 7.6) / 2 + 4;
    return Math.min(Math.max(xs[i], half), WIDE - half);
  });
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
            x={labelXs[i]}
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

type Spoke = {
  label: string;
  note?: string;
  dir?: "in" | "out" | "both";
  tone?: StageTone;
};

/** An arrow between two points, pointing in, out, or both ways. */
function Flow({
  from,
  to,
  dir = "in",
  rand,
  i,
}: {
  from: [number, number];
  to: [number, number];
  dir?: "in" | "out" | "both";
  rand: Rand;
  i: number;
}) {
  if (dir === "both") {
    // Two arrows a few pixels apart, one each way.
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const ox = (-dy / len) * 5;
    const oy = (dx / len) * 5;
    return (
      <>
        <Ink
          d={roughArrow(
            from[0] + ox,
            from[1] + oy,
            to[0] + ox,
            to[1] + oy,
            rand
          )}
          i={i}
        />
        <Ink
          d={roughArrow(
            to[0] - ox,
            to[1] - oy,
            from[0] - ox,
            from[1] - oy,
            rand
          )}
          i={i}
        />
      </>
    );
  }
  const [a, b] = dir === "out" ? [to, from] : [from, to];
  return <Ink d={roughArrow(a[0], a[1], b[0], b[1], rand)} i={i} />;
}

/** The centre in the middle, spokes alternating left and right, notes under each. */
function HubWide({
  centre,
  spokes,
  rand,
}: {
  centre: { label: string; note?: string };
  spokes: Spoke[];
  rand: Rand;
}) {
  const colW = 196;
  const bh = 50;
  const top = 14;
  const cw = 220;
  const ch = 60;
  const cx = (WIDE - cw) / 2;
  const notes = spokes.map((sp) => (sp.note ? wrapLines(sp.note, 25) : []));
  const labels = spokes.map((sp) => wrapLines(sp.label, 17));
  const rowCount = Math.ceil(spokes.length / 2);
  const rowH = Array.from({ length: rowCount }, (_, r) => {
    const lines = Math.max(
      notes[r * 2]?.length ?? 0,
      notes[r * 2 + 1]?.length ?? 0
    );
    return bh + (lines ? 10 + lines * 16 : 0) + 26;
  });
  const ys = rowH.map(
    (_, r) => top + rowH.slice(0, r).reduce((a, b) => a + b, 0)
  );
  const total = top + rowH.reduce((a, b) => a + b, 0) - 14;
  const cy = Math.max(top, total / 2 - ch / 2);
  const cNote = centre.note ? wrapLines(centre.note, 28) : [];
  return (
    <Svg w={WIDE} h={total + (cNote.length ? 6 : 0)} wide>
      <Ink d={roughRect(cx, cy, cw, ch, rand)} i={0} />
      <Words
        x={WIDE / 2}
        y={cy + ch / 2 + 7 - (wrapLines(centre.label, 20).length - 1) * 11}
        lines={wrapLines(centre.label, 20)}
        size={21}
        i={0}
      />
      {cNote.length > 0 && (
        <Words
          x={WIDE / 2}
          y={cy + ch + 20}
          lines={cNote}
          size={15}
          i={0}
          soft
        />
      )}
      {spokes.map((sp, k) => {
        const r = Math.floor(k / 2);
        const isLeft = k % 2 === 0;
        const x = isLeft ? 12 : WIDE - 12 - colW;
        const y = ys[r];
        const edge: [number, number] = isLeft
          ? [x + colW + 4, y + bh / 2]
          : [x - 4, y + bh / 2];
        const centreEdge: [number, number] = isLeft
          ? [cx - 4, cy + ch / 2]
          : [cx + cw + 4, cy + ch / 2];
        return (
          <g key={sp.label}>
            <Ink d={roughRect(x, y, colW, bh, rand)} i={k + 1} tone={sp.tone} />
            <Words
              x={x + colW / 2}
              y={y + bh / 2 + 7 - (labels[k].length - 1) * 11}
              lines={labels[k]}
              size={21}
              i={k + 1}
            />
            {notes[k].length > 0 && (
              <Words
                x={x + colW / 2}
                y={y + bh + 24}
                lines={notes[k]}
                size={15}
                i={k + 1}
                soft
              />
            )}
            <Flow
              from={edge}
              to={centreEdge}
              dir={sp.dir}
              rand={rand}
              i={k + 1}
            />
          </g>
        );
      })}
    </Svg>
  );
}

/** The centre on top, a spine down the middle, spokes in two columns joined
    to the spine sideways, so no arrow crosses a box. */
function HubNarrow({
  centre,
  spokes,
  rand,
}: {
  centre: { label: string; note?: string };
  spokes: Spoke[];
  rand: Rand;
}) {
  const colW = 136;
  const spineX = NARROW / 2;
  const xs = [6, NARROW - 6 - colW];
  const bh = 46;
  const cw = 240;
  const ch = 50;
  const cx = (NARROW - cw) / 2;
  const cNote = centre.note ? wrapLines(centre.note, 34) : [];
  const spineTop = 8 + ch + (cNote.length ? 14 + cNote.length * 15 : 0) + 4;
  const spokesTop = spineTop + 26;
  const notes = spokes.map((sp) => (sp.note ? wrapLines(sp.note, 20) : []));
  const labels = spokes.map((sp) => wrapLines(sp.label, 13));
  const rowCount = Math.ceil(spokes.length / 2);
  const rowH = Array.from({ length: rowCount }, (_, r) => {
    const lines = Math.max(
      notes[r * 2]?.length ?? 0,
      notes[r * 2 + 1]?.length ?? 0
    );
    return bh + (lines ? 8 + lines * 15 : 0) + 24;
  });
  const ys = rowH.map(
    (_, r) => spokesTop + rowH.slice(0, r).reduce((a, b) => a + b, 0)
  );
  const total = spokesTop + rowH.reduce((a, b) => a + b, 0) - 16;
  const spineEnd = ys[rowCount - 1] + bh / 2;
  return (
    <Svg w={NARROW} h={total} wide={false}>
      <Ink d={roughRect(cx, 8, cw, ch, rand)} i={0} />
      <Words
        x={NARROW / 2}
        y={8 + ch / 2 + 7 - (wrapLines(centre.label, 22).length - 1) * 11}
        lines={wrapLines(centre.label, 22)}
        size={20}
        i={0}
      />
      {cNote.length > 0 && (
        <Words
          x={NARROW / 2}
          y={8 + ch + 20}
          lines={cNote}
          size={13}
          i={0}
          soft
        />
      )}
      <Ink d={roughLine(spineX, spineTop, spineX, spineEnd, rand)} i={0} />
      {spokes.map((sp, k) => {
        const r = Math.floor(k / 2);
        const isLeft = k % 2 === 0;
        const x = xs[k % 2];
        const y = ys[r];
        const edge: [number, number] = isLeft
          ? [x + colW + 3, y + bh / 2]
          : [x - 3, y + bh / 2];
        const spine: [number, number] = isLeft
          ? [spineX - 3, y + bh / 2]
          : [spineX + 3, y + bh / 2];
        return (
          <g key={sp.label}>
            <Ink d={roughRect(x, y, colW, bh, rand)} i={k + 1} tone={sp.tone} />
            <Words
              x={x + colW / 2}
              y={y + bh / 2 + 7 - (labels[k].length - 1) * 10}
              lines={labels[k]}
              size={18}
              i={k + 1}
            />
            {notes[k].length > 0 && (
              <Words
                x={x + colW / 2}
                y={y + bh + 20}
                lines={notes[k]}
                size={13}
                i={k + 1}
                soft
              />
            )}
            <Flow from={edge} to={spine} dir={sp.dir} rand={rand} i={k + 1} />
          </g>
        );
      })}
    </Svg>
  );
}

/** Bars that narrow from top to bottom, each with its note beside it. */
function FunnelWide({
  stages,
  rand,
}: {
  stages: { label: string; note: string; tone?: StageTone }[];
  rand: Rand;
}) {
  const n = stages.length;
  const bh = 46;
  const gap = 12;
  const top = 10;
  const centre = 280;
  const maxW = 520;
  const minW = 240;
  const step = n > 1 ? (maxW - minW) / (n - 1) : 0;
  const noteX = centre + maxW / 2 + 16;
  const notes = stages.map((st) => wrapLines(st.note, 25));
  let y = top;
  const rows = stages.map((st, i) => {
    const w = maxW - i * step;
    const h = Math.max(bh, notes[i].length * 16 + 6);
    const row = { st, w, y, h, lines: notes[i] };
    y += h + gap;
    return row;
  });
  return (
    <Svg w={WIDE} h={y - gap + 8} wide>
      {rows.map((row, i) => (
        <g key={row.st.label}>
          <Ink
            d={roughRect(centre - row.w / 2, row.y, row.w, bh, rand)}
            i={i}
            tone={row.st.tone}
          />
          <Words
            x={centre}
            y={row.y + bh / 2 + 7}
            lines={[row.st.label]}
            size={20}
            i={i}
          />
          <Words
            x={noteX}
            y={row.y + 20}
            lines={row.lines}
            size={15}
            i={i}
            anchor="start"
            soft
          />
        </g>
      ))}
    </Svg>
  );
}

function FunnelNarrow({
  stages,
  rand,
}: {
  stages: { label: string; note: string; tone?: StageTone }[];
  rand: Rand;
}) {
  const n = stages.length;
  const bh = 40;
  const centre = NARROW / 2;
  const maxW = 320;
  const minW = 150;
  const step = n > 1 ? (maxW - minW) / (n - 1) : 0;
  let y = 8;
  const rows = stages.map((st, i) => {
    const lines = wrapLines(st.note, 44);
    const row = { st, w: maxW - i * step, y, lines };
    y += bh + 8 + lines.length * 15 + 12;
    return row;
  });
  return (
    <Svg w={NARROW} h={y - 4} wide={false}>
      {rows.map((row, i) => (
        <g key={row.st.label}>
          <Ink
            d={roughRect(centre - row.w / 2, row.y, row.w, bh, rand)}
            i={i}
            tone={row.st.tone}
          />
          <Words
            x={centre}
            y={row.y + bh / 2 + 7}
            lines={[row.st.label]}
            size={19}
            i={i}
          />
          <Words
            x={centre}
            y={row.y + bh + 18}
            lines={row.lines}
            size={13}
            i={i}
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
    case "hub":
      return (
        <>
          <HubWide
            centre={diagram.centre}
            spokes={diagram.spokes}
            rand={wide}
          />
          <HubNarrow
            centre={diagram.centre}
            spokes={diagram.spokes}
            rand={narrow}
          />
        </>
      );
    case "funnel":
      return (
        <>
          <FunnelWide stages={diagram.stages} rand={wide} />
          <FunnelNarrow stages={diagram.stages} rand={narrow} />
        </>
      );
  }
}
