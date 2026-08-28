"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { type ReactNode } from "react";

import { PARTNERS } from "@/features/website/onchain-suite/components/landing/v2/shared";

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
}

// The white (dark-background) wordmark - the brand panel is a deep-blue
// gradient, so the coloured logo washed out. This is the current typeface.
const BRAND_WORDMARK =
  "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787936849/OS-dark_wdb06l.png";

const VALUE_PROPS = [
  "Turn any wallet into an audience you can actually reach",
  "Launch onchain-triggered campaigns and automations",
  "Track conversions and revenue for every journey",
];

/**
 * Branded auth shell - reflects the main app's light "paper + electric-blue"
 * identity. A showcase brand panel (left, desktop) sits beside a clean white
 * form card (right). `.os-auth` remaps the shadcn theme tokens to the brand
 * palette so the shared form controls recolor + round automatically. Used by
 * signin, signup, forgot-password and reset-password views.
 */
export function AuthLayout({ children, className = "" }: AuthLayoutProps) {
  return (
    <div className="os-auth">
      <div className="os-auth-grid">
        {/* Brand / showcase panel */}
        <aside className="os-auth-brand">
          <div className="flex items-center">
            <Image
              src={BRAND_WORDMARK}
              alt="Onchain Suite"
              width={168}
              height={51}
              priority
              className="h-auto w-auto"
            />
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.1]">
              Onchain growth, on autopilot.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              The marketing platform built for protocols, turn onchain activity
              into audiences, campaigns, and revenue.
            </p>
            <ul className="mt-8 space-y-3.5">
              {VALUE_PROPS.map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#9ec5ff]"
                  />
                  <span className="text-sm leading-6 text-white/85">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              Trusted by teams building world-class protocols
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {PARTNERS.map((p) => (
                <div
                  key={p.name}
                  title={p.name}
                  className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/15 bg-white/5"
                >
                  <Image
                    src={p.src}
                    alt={p.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Form column */}
        <div className={`os-auth-formwrap ${className}`}>
          <div className="os-auth-card">{children}</div>
        </div>
      </div>
    </div>
  );
}
