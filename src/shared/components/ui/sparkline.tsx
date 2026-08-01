import type * as React from "react";

import { cn } from "@/lib/utils";

interface SparklineProps extends React.SVGProps<SVGSVGElement> {
  /** Series to plot, oldest → newest. Needs at least two points to draw. */
  data: number[];
  /** Line stroke width in viewBox units. */
  strokeWidth?: number;
}

/**
 * Dependency-free inline-SVG sparkline. Recharts stays reserved for full report
 * charts (per CLAUDE.md §7); a trend line on a stat card doesn't warrant the
 * bundle. Colour comes from `currentColor`, so set a text colour on the parent.
 */
export function Sparkline({
  data,
  strokeWidth = 2,
  className,
  ...props
}: SparklineProps) {
  const width = 100;
  const height = 32;

  if (data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className={cn("h-8 w-full text-primary", className)}
        {...props}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  // Inset vertically so the stroke never clips at the top/bottom edge.
  const pad = strokeWidth;

  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-8 w-full text-primary", className)}
      {...props}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
