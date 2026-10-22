/* Hand-drawn SVG geometry for the playbook's diagrams. Pure and deterministic:
   the same seed always draws the same wobble, so server and client render
   identical paths and nothing shifts on hydration. */

export type Rand = () => number;

/** Mulberry32: a tiny seeded PRNG, enough for pen wobble. */
export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a string, e.g. an artifact code. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const jitter = (rand: Rand, amount: number) => (rand() - 0.5) * 2 * amount;

/**
 * A pen stroke from one point to another: a slightly bowed curve with a small
 * overshoot at each end, the way a quick line by hand looks.
 */
export function roughLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: Rand,
  wobble = 1.6
): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const bow = Math.min(wobble * 1.5, len / 40);
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const sx = x1 + jitter(rand, wobble);
  const sy = y1 + jitter(rand, wobble);
  const ex = x2 + jitter(rand, wobble);
  const ey = y2 + jitter(rand, wobble);
  const off = jitter(rand, bow);
  const cx = (sx + ex) / 2 + nx * off;
  const cy = (sy + ey) / 2 + ny * off;
  return `M${r1(sx)} ${r1(sy)}Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}`;
}

/** A box drawn as four separate strokes that slightly overshoot the corners. */
export function roughRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rand: Rand,
  wobble = 1.6
): string {
  const o = 3;
  return [
    roughLine(x - o, y, x + w + o, y, rand, wobble),
    roughLine(x + w, y - o, x + w, y + h + o, rand, wobble),
    roughLine(x + w + o, y + h, x - o, y + h, rand, wobble),
    roughLine(x, y + h + o, x, y - o, rand, wobble),
  ].join("");
}

/**
 * An ellipse drawn in one loop that does not quite close and overlaps its
 * start, like circling a word with a pen.
 */
export function roughEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: Rand
): string {
  const start = -Math.PI / 2 + jitter(rand, 0.4);
  const steps = 12;
  const sweep = Math.PI * 2.15;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    const k = 1 + jitter(rand, 0.06);
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 2) {
    d += `Q${r1(pts[i][0])} ${r1(pts[i][1])} ${r1(pts[i + 1][0])} ${r1(pts[i + 1][1])}`;
  }
  return d;
}

/** A line with an open arrowhead at the end. */
export function roughArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: Rand
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 9;
  const spread = 0.5;
  const hx1 = x2 - head * Math.cos(angle - spread);
  const hy1 = y2 - head * Math.sin(angle - spread);
  const hx2 = x2 - head * Math.cos(angle + spread);
  const hy2 = y2 - head * Math.sin(angle + spread);
  return [
    roughLine(x1, y1, x2, y2, rand, 1.2),
    roughLine(hx1, hy1, x2, y2, rand, 0.6),
    roughLine(hx2, hy2, x2, y2, rand, 0.6),
  ].join("");
}

/**
 * Greedy word wrap by character count, for SVG text (which does not wrap).
 * Never breaks a word; a word longer than the limit gets its own line.
 */
export function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) {
      line = word;
    } else if (line.length + 1 + word.length <= maxChars) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}
