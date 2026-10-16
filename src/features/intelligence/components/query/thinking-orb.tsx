"use client";

import { cn } from "@/lib/utils";

/**
 * The agent's "thinking" orb: three overlapping translucent spheres that drift
 * over one another. Their overlaps brighten toward white via `mix-blend-mode:
 * screen`, which gives the soft, living core in the reference design. Pure CSS
 * (keyframes `ocs-orb-a|b|c` in globals.css, frozen under prefers-reduced-motion)
 * so it stays cheap to run beside streaming text.
 *
 * `active` drives the motion; when false the spheres sit still (a settled, done
 * state). `size` is the square px box the orb is drawn in.
 */
export function ThinkingOrb({
  size = 28,
  active = true,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  // Each sphere: a radial gradient with a bright, opaque center falling to fully
  // transparent, positioned to overlap the others. Screen-blended so the middle
  // reads near-white while the edges keep their tint.
  const spheres: Array<{ bg: string; pos: string; anim: string }> = [
    {
      bg: "radial-gradient(circle at 38% 36%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
      pos: "left-0 top-0",
      anim: "ocs-anim-orb-a",
    },
    {
      bg: "radial-gradient(circle at 50% 50%, rgba(150,170,255,0.8), rgba(150,170,255,0) 68%)",
      pos: "left-0 bottom-0",
      anim: "ocs-anim-orb-b",
    },
    {
      bg: "radial-gradient(circle at 55% 45%, rgba(255,150,190,0.72), rgba(255,150,190,0) 68%)",
      pos: "right-0 top-1/2 -translate-y-1/2",
      anim: "ocs-anim-orb-c",
    },
  ];

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${Math.round(size / 3)}px rgba(200,190,255,0.35))`,
      }}
    >
      {spheres.map((s) => (
        <span
          key={s.anim}
          className={cn("absolute rounded-full", s.pos, active && s.anim)}
          style={{
            width: "72%",
            height: "72%",
            background: s.bg,
            mixBlendMode: "screen",
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </span>
  );
}

export default ThinkingOrb;
