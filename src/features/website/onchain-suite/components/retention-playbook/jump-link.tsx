"use client";

import type { AriaAttributes, MouseEvent, ReactNode } from "react";

import { scrollToAnchor } from "@/onchain-suite-website/utils/playbook-scroll";

/**
 * An in-page link that scrolls with the page's jump behaviour (reduced motion,
 * focus on the heading). Without JavaScript it is a plain hash link.
 */
export function JumpLink({
  target,
  className,
  ariaCurrent,
  children,
  onJump,
}: {
  target: string;
  className?: string;
  ariaCurrent?: AriaAttributes["aria-current"];
  children: ReactNode;
  onJump?: () => void;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onJump?.();
    scrollToAnchor(target);
  }

  return (
    <a
      href={`#${target}`}
      className={className}
      aria-current={ariaCurrent}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
