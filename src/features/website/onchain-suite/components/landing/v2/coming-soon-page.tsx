"use client";

import Link from "next/link";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell, SIGNUP } from "./shared";

/**
 * Branded placeholder for marketing routes whose full content (competitor
 * comparisons, the other free tools) is still being written - so every footer
 * link lands on a real, on-brand page instead of a 404.
 */
export function ComingSoonPage({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <PageShell>
      <section className="py-24 sm:py-32">
        <div className="wrap mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">{eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mt-4 font-semibold tracking-tight t-ink"
              style={{
                fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)",
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-[16px] leading-relaxed t-muted">{sub}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={SIGNUP} className="btn btn-primary">
                Connect with sales
              </Link>
              <Link href="/pricing" className="btn btn-ghost">
                See pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default ComingSoonPage;
