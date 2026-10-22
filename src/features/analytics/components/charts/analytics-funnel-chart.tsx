"use client";

import {
  Layer,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

import { cn } from "@/lib/utils";

import type { FunnelStep } from "../../utils/funnel";
import { funnelSankey } from "../../utils/funnel";

interface NodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: { name: string; value: number; lost?: boolean };
}

function FunnelNode({ x, y, width, height, payload }: NodeProps) {
  const lost = payload.lost === true;
  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 2)}
        fill={lost ? "var(--neutral-400)" : "var(--chart-2)"}
        radius={2}
      />
      <text
        x={x + width + 6}
        y={y + height / 2 - 2}
        fontSize={12}
        fontWeight={500}
        fill="var(--text-primary)"
      >
        {payload.name}
      </text>
      <text
        x={x + width + 6}
        y={y + height / 2 + 12}
        fontSize={11}
        fill="var(--text-tertiary)"
      >
        {payload.value.toLocaleString("en-US")}
      </text>
    </Layer>
  );
}

/** Each step of a funnel, with the people lost after each one peeling away. */
export function AnalyticsFunnelChart({
  steps,
  className,
}: {
  steps: FunnelStep[];
  className?: string;
}) {
  const data = funnelSankey(steps);
  return (
    <div className={cn("h-[240px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodePadding={18}
          nodeWidth={8}
          margin={{ left: 4, right: 120, top: 8, bottom: 8 }}
          link={{ stroke: "var(--chart-2)", strokeOpacity: 0.18 }}
          node={(p: NodeProps) => <FunnelNode {...p} />}
        >
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
