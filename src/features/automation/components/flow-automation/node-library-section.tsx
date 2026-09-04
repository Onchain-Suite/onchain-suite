"use client";

/**
 * The left-rail node library: a color-accented, draggable group of builder
 * nodes. Extracted from create-automations.tsx (CLAUDE.md 15.5); the parent
 * builds the `NodeLibraryItem[]` (icon included) and drops sections onto the
 * canvas via the drag payload set here.
 */

export type NodeLibraryItem = {
  type: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
};

const NODE_ACCENTS = {
  sky: {
    tile: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hover: "hover:border-sky-500/50",
    dot: "bg-sky-500",
  },
  orange: {
    tile: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    hover: "hover:border-orange-500/50",
    dot: "bg-orange-500",
  },
  indigo: {
    tile: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    hover: "hover:border-indigo-500/50",
    dot: "bg-indigo-500",
  },
} as const;

/** A draggable, color-accented group of builder nodes in the left library. */
export function NodeLibrarySection({
  title,
  accent,
  nodes,
}: {
  title: string;
  accent: keyof typeof NODE_ACCENTS;
  nodes: NodeLibraryItem[];
}) {
  const a = NODE_ACCENTS[accent];
  if (nodes.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full ${a.dot}`}
          aria-hidden="true"
        />
        {title}
        <span aria-hidden="true" className="text-muted-foreground/60">
          ·
        </span>
        <span className="tabular-nums text-muted-foreground/80">
          {nodes.length}
        </span>
      </h3>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div
            key={node.type}
            draggable
            tabIndex={0}
            role="button"
            aria-label={`Drag ${node.label} onto the canvas`}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", node.type);
              e.dataTransfer.setData("application/label", node.label);
            }}
            className={`group flex cursor-grab items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/30 ${a.hover}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${a.tile}`}
            >
              {node.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {node.label}
              </p>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {node.description}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="flex flex-col gap-[3px] pr-0.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
            >
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className="flex gap-[3px]">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
