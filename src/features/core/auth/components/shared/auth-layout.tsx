"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
}

const LOGO_LIGHT =
  "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1761095267/full_logo_horizontal_coloured_light_kl0irx.png";

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
              src={LOGO_LIGHT}
              alt="Onchain Suite"
              width={150}
              height={45}
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

          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="flex -space-x-2">
              {["#9ec5ff", "#5b8cff", "#c7d7ff"].map((c) => (
                <span
                  key={c}
                  className="h-6 w-6 rounded-full ring-2 ring-[#1727e0]"
                  style={{ background: c }}
                />
              ))}
            </span>
            Trusted by teams building world-class protocols
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
