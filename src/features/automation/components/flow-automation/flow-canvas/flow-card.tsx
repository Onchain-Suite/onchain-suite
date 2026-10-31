"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { memo } from "react";

import { isJsonObject } from "@/lib/utils";

import {
  stepKindLabel,
  stepSummary,
  stepType,
} from "../../../utils/step-summary";
import { LibraryIcon } from "../node-icons";

export interface FlowCardNode {
  id: string;
  type?: string;
  data?: unknown;
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * One step on the canvas: what kind it is, what it does, and what it still
 * needs. A real button, so the flow works from the keyboard and reads top to
 * bottom to a screen reader, and is clicked (never dragged) to select it.
 */
export const FlowCard = memo(function FlowCard({
  node,
  trigger = false,
  selected,
  severity,
  showStats,
  onSelect,
}: {
  node: FlowCardNode;
  trigger?: boolean;
  selected: boolean;
  severity?: "error" | "warning";
  showStats: boolean;
  onSelect: (id: string | null) => void;
}) {
  const data = isJsonObject(node.data) ? node.data : {};
  const type = stepType(node.type, data);
  const kind = trigger
    ? "Trigger"
    : stepKindLabel(type === "branch" ? "branch" : type);
  const label = typeof data.label === "string" ? data.label.trim() : "";
  const summary = stepSummary(node.type, data);
  const title = trigger
    ? label || stepKindLabel(type)
    : summary || label || kind;
  const detail = trigger
    ? summary
    : summary && label && label !== kind
      ? label
      : "";
  const todo =
    data.needsSetup === true
      ? (typeof data.setupHint === "string" && data.setupHint.trim()) ||
        "Needs setup"
      : "";
  const stats = isJsonObject(data.stats) ? data.stats : null;
  const reached = num(stats?.reached);
  const dropped = num(stats?.dropped);
  const live = typeof data.watchLive === "boolean" ? data.watchLive : undefined;

  return (
    <button
      type="button"
      data-node={node.id}
      className={[
        "ab-card",
        trigger ? "ab-card--entry" : "",
        selected ? "is-on" : "",
        todo ? "is-todo" : "",
        severity === "error" ? "is-error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      aria-label={`${kind}: ${title}${todo ? `. To finish: ${todo}` : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected ? null : node.id);
      }}
    >
      <span className={`ab-card__ic${trigger ? " ab-card__ic--entry" : ""}`}>
        <LibraryIcon type={type} className="h-[15px] w-[15px]" />
      </span>
      <span className="ab-card__tx">
        <i>{kind}</i>
        <b title={title}>{title}</b>
        {detail && <span title={detail}>{detail}</span>}
        {todo && (
          <em>
            <ExclamationCircleIcon aria-hidden="true" />
            {todo}
          </em>
        )}
        {showStats && reached !== null && (
          <span className="ab-card__m">
            {fmt(reached)} reached{dropped ? ` · ${fmt(dropped)} dropped` : ""}
          </span>
        )}
      </span>
      {trigger && live !== undefined && (
        <span
          className={`ab-card__live ${live ? "ab-card__live--on" : "ab-card__live--off"}`}
          title={
            live
              ? "Receiving events"
              : "Published, but not receiving events yet"
          }
        >
          {live ? "Live" : "Not receiving"}
        </span>
      )}
    </button>
  );
});
