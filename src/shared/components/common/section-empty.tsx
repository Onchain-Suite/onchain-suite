import {
  ArrowRightIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The one empty-state a section renders while the workspace is empty (v2.7
 * onboarding migration). Ported from the reference `SectionEmpty`, but
 * presentational and prop-driven so every surface reads the same way.
 *
 * Each empty section says what it is for (`title`), why it is empty (`body`),
 * and the one action that fills it (`action`); it may offer a second way in
 * (`secondary`), show a faded preview of what will be here (`preview`), and,
 * for sections that gain extra from on-chain data, offer indexing as an
 * optional extra (`onChain`) rather than a gate.
 *
 * This component owns no state and no data reads: the caller decides when to
 * show it (when the list is empty, or `useWorkspaceMode()` is "empty") and
 * passes the indexing label it knows about. Icons are passed as heroicon
 * components, never a string registry (CLAUDE.md section 5).
 */

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export interface SectionEmptyAction {
  label: string;
  /** Internal route. Renders a `next/link`. Takes precedence over `onClick`. */
  href?: string;
  /** Click handler when the action is not a navigation. */
  onClick?: () => void;
  /** Optional leading icon for the action; defaults to an arrow for links. */
  icon?: IconType;
}

/** A faded preview of what the section will hold once it has data. */
export type SectionPreview =
  | { kind: "table"; columns: string[] }
  | { kind: "chart"; tiles: string[] }
  | { kind: "flow"; steps: { icon: IconType; label: string }[] }
  | { kind: "ask"; questions: string[] };

export interface SectionEmptyProps {
  /** Heroicon for the section (a component, e.g. `UsersIcon`). */
  icon: IconType;
  title: string;
  body: string;
  action?: SectionEmptyAction;
  /** A second, quieter way in beside the primary action. */
  secondary?: SectionEmptyAction;
  /**
   * What on-chain data adds here, offered as an optional extra with an "Index a
   * contract" link. Use for sections that work on day one but gain from holders
   * and events.
   */
  onChain?: string;
  /**
   * Whether this section fills in from indexed data. True by default; pass
   * false for sections that work on day one (e.g. Forms) so no waiting hint
   * shows.
   */
  waits?: boolean;
  /** The contract whose index is in progress, if any; switches hints to "on its way". */
  indexing?: string | null;
  /** A faded preview of the section; splits the layout text-left, preview-right. */
  preview?: SectionPreview;
  className?: string;
}

function ActionButton({
  action,
  variant = "default",
}: {
  action: SectionEmptyAction;
  variant?: "default" | "outline";
}) {
  const Icon = action.icon ?? (action.href ? ArrowRightIcon : undefined);
  const inner = (
    <>
      {Icon && <Icon className="mr-1 h-4 w-4" aria-hidden="true" />}
      {action.label}
    </>
  );
  if (action.href) {
    return (
      <Button asChild size="sm" variant={variant}>
        <Link href={action.href}>{inner}</Link>
      </Button>
    );
  }
  return (
    <Button onClick={action.onClick} size="sm" variant={variant}>
      {inner}
    </Button>
  );
}

export function SectionEmpty({
  icon: Icon,
  title,
  body,
  action,
  secondary,
  onChain,
  waits = true,
  indexing = null,
  preview,
  className,
}: SectionEmptyProps) {
  return (
    <Card className={className}>
      <CardContent
        className={cn(
          "gap-4 py-10",
          preview
            ? "grid items-center gap-8 px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
            : "flex flex-col items-center px-6 text-center"
        )}
        aria-label={title}
      >
        <div
          className={cn(
            "flex flex-col gap-3",
            preview ? "items-start text-left" : "items-center text-center"
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>

          {waits && indexing ? (
            <p className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
              Indexing {indexing}. This fills in when it finishes.
            </p>
          ) : (
            <div
              className={cn(
                "mt-1 flex flex-wrap items-center gap-3",
                !preview && "justify-center"
              )}
            >
              {action && <ActionButton action={action} />}
              {secondary && (
                <ActionButton action={secondary} variant="outline" />
              )}
            </div>
          )}

          {waits && !indexing && (
            <p className="text-xs text-muted-foreground">
              Waiting on your first indexed contract. An address, an explorer
              link or your website is enough.
            </p>
          )}

          {!waits &&
            onChain &&
            (indexing ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ArrowPathIcon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin"
                  aria-hidden="true"
                />
                Indexing {indexing}. On-chain data joins in when it finishes.
              </p>
            ) : (
              <p className="flex max-w-prose items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Square3Stack3DIcon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {onChain}{" "}
                  <Link
                    href={`${PRIVATE_ROUTES.INTEGRATIONS}?tab=events`}
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Index a contract
                  </Link>
                </span>
              </p>
            ))}
        </div>

        {preview && <Preview preview={preview} />}
      </CardContent>
    </Card>
  );
}

/** What the section will look like, drawn faintly with its real labels. */
function Preview({ preview: p }: { preview: SectionPreview }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-muted/20 p-4 [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]"
      aria-hidden="true"
    >
      <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        What you will see here
      </span>

      {p.kind === "table" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div
            className="grid gap-3 border-b border-border bg-muted/40 px-3.5 py-2.5"
            style={{ gridTemplateColumns: `repeat(${p.columns.length}, 1fr)` }}
          >
            {p.columns.map((c) => (
              <span
                key={c}
                className="truncate text-[11px] font-semibold text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
          {[0.82, 0.64, 0.74, 0.52, 0.68].map((w, r) => (
            <div
              key={r}
              className="grid items-center gap-3 border-b border-border px-3.5 py-3 last:border-b-0"
              style={{
                gridTemplateColumns: `repeat(${p.columns.length}, 1fr)`,
              }}
            >
              {p.columns.map((c, i) => (
                <i
                  key={c}
                  className="block h-2 rounded-full bg-border"
                  style={{
                    width: `${Math.round((i === 0 ? w : 0.35 + ((r + i) % 3) * 0.15) * 100)}%`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {p.kind === "chart" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {p.tiles.map((t) => (
              <div
                key={t}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <span className="truncate text-[11px] text-muted-foreground">
                  {t}
                </span>
                <i className="block h-3 w-[56%] rounded bg-border" />
              </div>
            ))}
          </div>
          <svg
            viewBox="0 0 300 90"
            preserveAspectRatio="none"
            className="h-24 w-full rounded-lg border border-border bg-card p-2.5"
          >
            <path
              d="M0 70 C 40 66, 60 52, 100 54 S 160 38, 200 34 S 260 18, 300 12"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              opacity="0.45"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 80 C 50 78, 80 70, 120 72 S 190 60, 230 58 S 270 50, 300 46"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              opacity="0.25"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}

      {p.kind === "flow" && (
        <div className="flex flex-col items-center gap-5 py-1.5">
          {p.steps.map((s, i) => {
            const StepIcon = s.icon;
            return (
              <div key={s.label} className="relative">
                {i > 0 && (
                  <span
                    className="absolute -top-5 left-1/2 h-5 w-px -translate-x-1/2 bg-border"
                    aria-hidden="true"
                  />
                )}
                <div className="flex min-w-[200px] items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                  <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                    <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {p.kind === "ask" && (
        <div className="flex flex-col items-start gap-2">
          {p.questions.map((q) => (
            <span
              key={q}
              className="inline-flex items-center gap-2 rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
            >
              <ArrowRightIcon
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              {q}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
