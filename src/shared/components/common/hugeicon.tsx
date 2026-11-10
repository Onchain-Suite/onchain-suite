import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { SVGProps } from "react";

export type { IconSvgElement };

/** Line weight for the app: Hugeicons' 1.5 reads thin next to our type. */
export const ICON_STROKE = 1.75;

/**
 * Hugeicons is the app's icon set (2026-11-10). Icons are data objects from
 * `@hugeicons/core-free-icons`, imported by name so only the ones used ship.
 *
 * `hugeicon` turns one into a plain svg component, for the places that take
 * an icon component (the sidebar rows, menus). Call it at module level so the
 * component is stable across renders.
 */
export function hugeicon(icon: IconSvgElement, name: string) {
  function Glyph({ strokeWidth, ...props }: SVGProps<SVGSVGElement>) {
    return (
      <HugeiconsIcon
        icon={icon}
        strokeWidth={
          typeof strokeWidth === "number" ? strokeWidth : ICON_STROKE
        }
        aria-hidden="true"
        {...props}
      />
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

/** Inline use: `<Icon icon={Search01Icon} className="size-4" />`. Decorative by default. */
export function Icon({
  icon,
  className,
  size,
}: {
  icon: IconSvgElement;
  className?: string;
  size?: number;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={ICON_STROKE}
      className={className}
      aria-hidden="true"
    />
  );
}
