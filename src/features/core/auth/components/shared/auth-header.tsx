"use client";

import { type ComponentType, type SVGProps } from "react";

interface AuthHeaderProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  subtitle: string;
  delay?: number;
}

/**
 * Branded auth header - electric-blue eyebrow chip, bold Outfit title, muted
 * subtitle. Matches the main app's design system.
 */
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-8">
      <span className="os-auth-eyebrow">Onchain Suite</span>
      <h1 className="os-auth-title">{title}</h1>
      <p className="os-auth-sub">{subtitle}</p>
    </div>
  );
}
