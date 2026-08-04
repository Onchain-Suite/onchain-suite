"use client";

import { type ComponentType, type SVGProps } from "react";

import { cn } from "@/lib/utils";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Vertical settings sub-nav (Profile / Account / Privacy & Identity / …). The
 * "Settings" title sits above it so the whole left column reads as one unit,
 * matching the reference two-pane layout.
 */
export function SettingsNav({
  items,
  value,
  onValueChange,
  className,
}: {
  items: SettingsNavItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Settings sections" className={className}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = value === item.id;
          return (
            <li key={item.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onValueChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-muted/70 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {Icon ? (
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                ) : null}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
