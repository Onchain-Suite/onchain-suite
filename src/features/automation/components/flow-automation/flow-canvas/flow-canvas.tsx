"use client";

import {
  ArrowsPointingInIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import "./flow-canvas.css";
import type { FlowPath, FlowTree, Slot } from "../../../utils/flow-tree";
import { FlowCard, type FlowCardNode } from "./flow-card";
import { StepMenu, type StepMenuGroup } from "./step-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

/*
 * The canvas lays the automation out from its structure, the way the
 * reference Loop builder does. Nothing is placed or wired by hand: a "+" on
 * every line inserts a step exactly there, a step dragged onto a "+" moves
 * there, and an If / else draws its two paths and joins them back up.
 */

export interface FlowCanvasProps {
  tree: FlowTree;
  nodes: Map<string, FlowCardNode>;
  selected: string | null;
  severity: Map<string, "error" | "warning">;
  stepGroups: StepMenuGroup[];
  triggerGroups: StepMenuGroup[];
  showStats: boolean;
  /** Something floated top right on the canvas, e.g. the analytics toggle. */
  overlay?: ReactNode;
  onSelect: (id: string | null) => void;
  onInsert: (slots: Slot[], type: string) => void;
  onMove: (id: string, slots: Slot[]) => void;
  onAddTrigger: (type: string) => void;
}

interface Ctx extends FlowCanvasProps {
  menuAt: string | null;
  setMenuAt: (key: string | null) => void;
}

const slotKey = (slots: Slot[]) =>
  slots.map((s) => `${s.source}:${s.handle ?? ""}>${s.target ?? ""}`).join("|");

/** A line between two steps: the "+" to insert there, and a drop target while dragging. */
function SlotLine({
  slots,
  ctx,
  end,
}: {
  slots: Slot[];
  ctx: Ctx;
  end?: boolean;
}) {
  const key = slotKey(slots);
  const open = ctx.menuAt === key;
  return (
    <div className="ab-slot">
      <span className="ab-line" aria-hidden="true" />
      <Popover open={open} onOpenChange={(o) => ctx.setMenuAt(o ? key : null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ab-plus"
            aria-label={end ? "Add a step at the end" : "Add a step here"}
          >
            <PlusIcon aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          className="ab-menu w-[min(620px,calc(100vw-32px))]"
        >
          <StepMenu
            title="Add a step"
            placeholder="Search steps"
            groups={ctx.stepGroups}
            onPick={(type) => {
              ctx.setMenuAt(null);
              ctx.onInsert(slots, type);
            }}
          />
        </PopoverContent>
      </Popover>
      <span className="ab-line" aria-hidden="true" />
    </div>
  );
}

function Card({
  id,
  ctx,
  trigger,
}: {
  id: string;
  ctx: Ctx;
  trigger?: boolean;
}) {
  const node = ctx.nodes.get(id);
  if (!node) return null;
  return (
    <FlowCard
      node={node}
      trigger={trigger}
      selected={ctx.selected === id}
      severity={ctx.severity.get(id)}
      showStats={ctx.showStats}
      onSelect={ctx.onSelect}
    />
  );
}

/** Do a branch's paths meet again? If not, each simply ends. */
const forkOpen = (paths: { path: FlowPath }[]) =>
  !paths.some((p) => p.path.tails.some((t) => t.target));

function EndMark() {
  return (
    <>
      <span className="ab-line" aria-hidden="true" />
      <span className="ab-end">
        <CheckIcon aria-hidden="true" />
        Finishes the automation
      </span>
    </>
  );
}

function Path({ path, ctx }: { path: FlowPath; ctx: Ctx }) {
  const last = path.steps[path.steps.length - 1]?.item;
  // After paths that never meet, each path ends on its own, with its own "+".
  const endsInOpenFork = last?.kind === "branch" && forkOpen(last.paths);
  const trailing = path.tails.length > 0 && !endsInOpenFork;
  // Nothing follows here: the automation finishes for whoever gets this far.
  const finishes = !endsInOpenFork && !path.tails.some((t) => t.target);
  return (
    <>
      {path.steps.map((step) => (
        <Fragment key={step.item.id}>
          <SlotLine slots={step.slots} ctx={ctx} />
          {step.item.kind === "branch" ? (
            <div className="ab-branch">
              <Card id={step.item.id} ctx={ctx} />
              <div
                className={`ab-fork${forkOpen(step.item.paths) ? " ab-fork--open" : ""}`}
              >
                {step.item.paths.map((p) => (
                  <div className="ab-col" key={p.handle}>
                    <span className={`ab-pathlbl ab-pathlbl--${p.handle}`}>
                      {p.handle === "yes" ? "Yes" : "No"}
                    </span>
                    <Path path={p.path} ctx={ctx} />
                    <span className="ab-grow" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card id={step.item.id} ctx={ctx} />
          )}
        </Fragment>
      ))}
      {trailing && (
        <SlotLine slots={path.tails} ctx={ctx} end={path.steps.length > 0} />
      )}
      {finishes && <EndMark />}
    </>
  );
}

const clampZoom = (z: number) => Math.min(1.25, Math.max(0.4, +z.toFixed(2)));

export function FlowCanvas(props: FlowCanvasProps) {
  const { tree, triggerGroups, onAddTrigger, onSelect } = props;
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pan = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const ctx: Ctx = { ...props, menuAt, setMenuAt };

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  /* Fit takes the smaller of the two ratios, so the whole flow shows, across and down. */
  const fit = (floor = 0.4) => {
    const s = scroller.current;
    const st = stage.current;
    if (!s || !st) return;
    const box = st.getBoundingClientRect();
    const across = (s.clientWidth - 24) / (box.width / zoomRef.current);
    const down = (s.clientHeight - 24) / (box.height / zoomRef.current);
    setZoom(Math.max(floor, clampZoom(Math.min(1, across, down))));
    s.scrollTo({
      top: 0,
      left: Math.max(0, (s.scrollWidth - s.clientWidth) / 2),
    });
  };

  /* Opens zoomed so as much shows as can still be read: all of it when it fits
     at 70% or more, otherwise 70% with the rest a drag away. Once; after that
     the zoom is the person's. */
  const fitted = useRef(false);
  const hasSteps = tree.path.steps.length > 0;
  useEffect(() => {
    if (fitted.current || !hasSteps) return;
    fitted.current = true;
    requestAnimationFrame(() => {
      const s = scroller.current;
      const st = stage.current;
      if (
        st &&
        s &&
        (st.scrollWidth > s.clientWidth || st.scrollHeight > s.clientHeight)
      )
        fit(0.7);
    });
    // Runs once, after the first layout with steps.
  }, [hasSteps]);

  const triggerMenu = (big: boolean) => (
    <Popover
      open={menuAt === "trigger"}
      onOpenChange={(o) => setMenuAt(o ? "trigger" : null)}
    >
      <PopoverTrigger asChild>
        <button type="button" className="ab-addentry">
          <PlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
          {big ? "Add a trigger" : "Add trigger"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="ab-menu w-[min(680px,calc(100vw-32px))]"
      >
        <StepMenu
          title="Add a trigger"
          placeholder="Search triggers"
          groups={triggerGroups}
          onPick={(type) => {
            setMenuAt(null);
            onAddTrigger(type);
          }}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="ab-canvaswrap">
      {/* The canvas takes focus so it pans with the arrow keys and zooms with
          + and -, as well as by dragging and by ctrl or cmd and the wheel.
          Every step inside is a real button. */}
      {}
      <div
        className="ab-canvas"
        ref={scroller}
        role="region"
        aria-label="Automation canvas. Arrow keys pan, plus and minus zoom."
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || !scroller.current) return;
          const by: Record<string, [number, number]> = {
            ArrowUp: [0, -60],
            ArrowDown: [0, 60],
            ArrowLeft: [-60, 0],
            ArrowRight: [60, 0],
          };
          if (by[e.key]) {
            e.preventDefault();
            scroller.current.scrollBy(by[e.key][0], by[e.key][1]);
          }
          if (e.key === "+" || e.key === "=")
            setZoom((z) => clampZoom(z + 0.1));
          if (e.key === "-") setZoom((z) => clampZoom(z - 0.1));
          if (e.key === "0") setZoom(1);
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => clampZoom(z - e.deltaY * 0.002));
          }
        }}
        onPointerDown={(e) => {
          if (
            (e.target as Element).closest("button, input, select, textarea, a")
          )
            return;
          const s = scroller.current;
          if (s)
            pan.current = {
              x: e.clientX,
              y: e.clientY,
              left: s.scrollLeft,
              top: s.scrollTop,
            };
        }}
        onPointerMove={(e) => {
          const s = scroller.current;
          if (!pan.current || !s) return;
          s.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
          s.scrollTop = pan.current.top - (e.clientY - pan.current.y);
        }}
        onPointerUp={() => {
          pan.current = null;
        }}
        onPointerLeave={() => {
          pan.current = null;
        }}
        onClick={(e) => {
          const t = e.target as Element;
          if (t === e.currentTarget || t.classList?.contains("ab-stage"))
            onSelect(null);
        }}
      >
        <div className="ab-stage" ref={stage} style={{ zoom }}>
          {!tree.root ? (
            <div className="ab-start">
              <b>What starts this automation?</b>
              <span>
                Pick a trigger: an on-chain event, a form, a list or a tag. Then
                add what happens next with the +.
              </span>
              {triggerMenu(true)}
            </div>
          ) : (
            <>
              <span className="ab-caption">People start when</span>
              <Card id={tree.root} ctx={ctx} trigger />
              <Path path={tree.path} ctx={ctx} />
            </>
          )}
          {tree.detached.length > 0 && (
            <div className="ab-detached">
              <span>
                Not connected to the flow. Open its settings to remove it, or
                add it back with a + on the line where it belongs.
              </span>
              {tree.detached.map((id) => {
                const node = ctx.nodes.get(id);
                const trigger = node?.type === "trigger";
                return <Card key={id} id={id} ctx={ctx} trigger={trigger} />;
              })}
            </div>
          )}
        </div>
      </div>
      {props.overlay && <div className="ab-overlay">{props.overlay}</div>}
      <div className="ab-zoom" role="group" aria-label="Zoom">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => clampZoom(z - 0.1))}
        >
          <MinusIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => clampZoom(z + 0.1))}
        >
          <PlusIcon aria-hidden="true" />
        </button>
        <button type="button" aria-label="Fit to screen" onClick={() => fit()}>
          <ArrowsPointingInIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
