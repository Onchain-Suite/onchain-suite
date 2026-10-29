"use client";

import { useEffect, useId, useRef, useState } from "react";

import "./cerebra-mark.css";

/* Cerebra, drawn from the logo.
 *
 * At rest it is the OnchainSuite mark with a pair of eyes in its ring, following the cursor.
 * When Cerebra speaks, the mark's two tabs fold away and the ring grows into a brain of the
 * same size (two lobes, a centre groove, a few folds) with the eyes where they were and a mouth
 * that moves while the words type out. When someone is about to press the button that moves
 * them on, it grins.
 *
 * Drawn on a 120 x 120 box: the logo path is scaled into it, so its ring sits at (60, 67) with a
 * radius of about 40, and the brain is drawn around the same centre so one turns into the other
 * without a jump. Ported verbatim from the 2.7 handoff (web/src/components/CerebraMark.tsx). */
const LOGO_D =
  "M1767.97 4251.22c815.51,-76.23 1452.35,-737.1 1452.35,-1541.14 0,-807.04 -641.66,-1469.89 -1462.09,-1541.93 -83.88,-13.08 -148.07,-85.64 -148.07,-173.22l0 -229.73c0,-101.82 82.56,-184.38 184.38,-184.38l307.1 0c49.15,0 89.34,-40.19 89.34,-89.34l0 -402.14c0,-49.16 -40.19,-89.34 -89.34,-89.34l-402.14 0c-49.16,0 -89.34,40.18 -89.34,89.34l0 316.33c0,92.8 -68.6,169.61 -157.81,182.48 -815.52,76.23 -1452.35,737.1 -1452.35,1541.14 0,807.07 641.66,1469.84 1462.08,1541.93 83.88,13.08 148.08,85.64 148.08,173.21l0 229.74c0,101.82 -82.56,184.38 -184.38,184.38l-307.1 0c-49.15,0 -89.34,40.19 -89.34,89.34l0 402.14c0,49.15 40.19,89.34 89.34,89.34l402.14 0c49.15,0 89.34,-40.19 89.34,-89.34l0 -316.33c0,-92.8 68.6,-169.61 157.81,-182.48zm2.08 -585.7c-85.72,7.83 -159.89,-58.31 -159.89,-144.94l0 -324.56c0,-63.43 -49.55,-98.47 -111.8,-105.02 -503.61,-52.95 -894.72,-463.61 -894.72,-961.71 0,-482.09 366.7,-881.72 846.91,-955.46 4.62,-0.43 9.27,-0.66 13.96,-0.66 80.45,0 145.65,65.19 145.65,145.62l0 324.56c0,63.43 49.55,98.47 111.79,105.02 503.62,52.95 894.73,463.61 894.73,961.71 0,482.11 -366.78,881.82 -846.63,955.44z";

export function CerebraMark({
  face = false,
  talking = false,
  cheer = false,
  size = 64,
  track = true,
  className,
}: {
  /** Showing Cerebra's face rather than the plain mark. */
  face?: boolean;
  /** The mouth moves. */
  talking?: boolean;
  /** A wide grin: someone is about to move on. Shows the face. */
  cheer?: boolean;
  size?: number;
  /** Eyes follow the pointer. Off where there is no pointer, where they glance around instead. */
  track?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [touch] = useState(
    () =>
      typeof matchMedia === "function" && matchMedia("(hover: none)").matches
  );
  const following = track && !touch;

  useEffect(() => {
    const el = ref.current;
    if (!following || !el) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.54);
        const d = Math.hypot(dx, dy) || 1;
        // Up to 3.4 units off centre, easing in over the first hundred pixels or so.
        const k = Math.min(3.4, d / 30) / d;
        el.style.setProperty("--px", `${(dx * k).toFixed(2)}px`);
        el.style.setProperty("--py", `${(dy * k).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [following]);

  const cls = [
    "cm",
    (face || cheer) && "cm--face",
    talking && !cheer && "cm--talking",
    cheer && "cm--cheer",
    !following && "cm--wander",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      ref={ref}
      className={cls}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1727E0" />
          <stop offset=".5" stopColor="#2F94FF" />
          <stop offset="1" stopColor="#F0F7FF" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="36%" cy="28%" r="78%">
          <stop offset="0" stopColor="#8CC6FF" />
          <stop offset=".45" stopColor="#2F94FF" />
          <stop offset="1" stopColor="#1727E0" />
        </radialGradient>
      </defs>
      <g className="cm__logo">
        <path
          d={LOGO_D}
          fill={`url(#${id}l)`}
          transform="translate(20 0) scale(0.0248)"
        />
      </g>
      <g className="cm__face">
        <path
          fill={`url(#${id}f)`}
          d="M60 104 C48 108 34 104 30 96 C18 96 12 84 16 74 C8 66 10 52 20 46 C18 34 28 24 40 26 C44 18 56 16 60 22 C64 16 76 18 80 26 C92 24 102 34 100 46 C110 52 112 66 104 74 C108 84 102 96 90 96 C86 104 72 108 60 104 Z"
        />
        {/* The centre groove and a few folds, kept clear of the eyes and mouth. */}
        <path
          className="cm__folds"
          d="M60 22 C56 34 64 44 60 54 C57 62 63 70 60 76 M60 94 C58 98 61 101 60 104 M24 50 C28 44 34 50 38 44 M36 32 C40 27 46 34 52 29 M17 66 C22 62 26 68 31 64 C33 70 29 74 33 79 M29 92 C34 88 40 94 46 89 M96 50 C92 44 86 50 82 44 M84 32 C80 27 74 34 68 29 M103 66 C98 62 94 68 89 64 C87 70 91 74 87 79 M91 92 C86 88 80 94 74 89"
        />
      </g>
      <g className="cm__eyes">
        <g className="cm__blink">
          <ellipse cx="47" cy="63" rx="8.2" ry="9.6" fill="#fff" />
          <ellipse cx="73" cy="63" rx="8.2" ry="9.6" fill="#fff" />
          <g className="cm__pupils">
            <circle cx="47" cy="64" r="4.3" fill="#0B1440" />
            <circle cx="73" cy="64" r="4.3" fill="#0B1440" />
            <circle cx="48.7" cy="62.2" r="1.4" fill="#fff" />
            <circle cx="74.7" cy="62.2" r="1.4" fill="#fff" />
          </g>
        </g>
      </g>
      <path
        className="cm__smile"
        d="M50.5 82 Q60 90 69.5 82"
        fill="none"
        stroke="#0B1440"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <ellipse
        className="cm__mouth"
        cx="60"
        cy="84"
        rx="6.5"
        ry="4"
        fill="#0B1440"
      />
      <path className="cm__grin" d="M47 79 Q60 98 73 79 Z" fill="#0B1440" />
      <path
        className="cm__grin"
        d="M53.5 88.5 Q60 93 66.5 88.5 Q60 85.5 53.5 88.5 Z"
        fill="#FF7A9C"
      />
    </svg>
  );
}
