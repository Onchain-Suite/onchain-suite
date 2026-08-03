"use client";

import { createContext, useContext } from "react";
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
  /** Screen coordinates of the "+" click, for positioning the insert menu. */
  x: number;
  y: number;
}

/**
 * Provides the "insert a step on this edge" handler to {@link AddableEdge}
 * instances, which ReactFlow renders inside the provider tree.
 */
export const EdgeInsertContext = createContext<
  (target: EdgeInsertTarget) => void
>(() => {});

/**
 * A smoothstep edge with a "+" button at its midpoint. Clicking it asks the
 * builder to open the action palette and insert a node that splits this edge —
 * the reference's inline add-step interaction.
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
  const onInsert = useContext(EdgeInsertContext);

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label="Insert a step here"
          onClick={(event) => {
            event.stopPropagation();
            onInsert({
              edgeId: id,
              source,
              target,
              x: event.clientX,
              y: event.clientY,
            });
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
      </EdgeLabelRenderer>
    </>
  );
}

export default AddableEdge;
