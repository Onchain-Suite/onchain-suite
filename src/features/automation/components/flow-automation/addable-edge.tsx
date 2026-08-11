"use client";

import { createContext, type ReactNode, useContext } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "reactflow";

export interface EdgeInsertTarget {
  edgeId: string;
  source: string;
  target: string;
}

/** One selectable action in the inline "Add step" grid. */
export interface EdgeInsertItem {
  type: string;
  label: string;
  icon: ReactNode;
}

/**
 * Drives the inline add-step menu that {@link AddableEdge} renders at its
 * midpoint. Opening sets the active edge; the grid then expands in place on the
 * spine (canvas-anchored, not a screen popup) and picking inserts the node.
 */
export interface EdgeInsertMenuApi {
  activeEdgeId: string | null;
  items: EdgeInsertItem[];
  open: (target: EdgeInsertTarget) => void;
  close: () => void;
  pick: (target: EdgeInsertTarget, type: string, label: string) => void;
}

export const EdgeInsertContext = createContext<EdgeInsertMenuApi>({
  activeEdgeId: null,
  items: [],
  open: () => {},
  close: () => {},
  pick: () => {},
});

/**
 * A smoothstep edge with a "+" at its midpoint. Clicking it expands an inline
 * grid of actions right on the spine; picking one splits this edge with the
 * chosen node - the reference's inline add-step interaction.
 */
export function AddableEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const menu = useContext(EdgeInsertContext);
  const active = menu.activeEdgeId === id;
  const targetRef: EdgeInsertTarget = { edgeId: id, source, target };

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {active ? (
          <div
            className="nodrag nopan pointer-events-auto absolute z-50 w-[264px] rounded-2xl border border-border bg-card p-2 shadow-2xl"
            style={{
              transform: `translate(-50%, 12px) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div className="mb-1.5 flex items-center justify-between px-1.5 pt-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Add step
              </span>
              <button
                type="button"
                aria-label="Close add step menu"
                onClick={() => menu.close()}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {menu.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => menu.pick(targetRef, item.type, item.label)}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted [&_svg]:text-muted-foreground"
                >
                  {item.icon}
                  <span className="line-clamp-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Insert a step here"
            onClick={(event) => {
              event.stopPropagation();
              menu.open(targetRef);
            }}
            className="nodrag nopan pointer-events-auto absolute flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default AddableEdge;
