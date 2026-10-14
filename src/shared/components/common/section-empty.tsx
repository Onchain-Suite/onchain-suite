import { ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

/**
 * The one empty-state a section renders while the workspace is empty (v2.7
 * onboarding migration, step 2). Ported from the reference `SectionEmpty`, but
 * presentational and prop-driven so every surface reads the same way.
 *
 * Every empty section says three things: what it is for (`title`), why it is
 * empty (`body`), and the one action that fills it (`action`). Most sections
 * fill in from an indexed contract, so they also say what they are waiting on
 * (`waits`) and, while an index is running, that it is on its way (`indexing`).
 *
 * This component owns no state and no data reads: the caller decides when to
 * show it (when `useWorkspaceMode()` is "empty") and passes the indexing label
 * it knows about. That keeps it decoupled from the indexing signal, which is
 * backend-gated (step 4), and keeps it isomorphic.
 *
 * Icons are passed as heroicon components, never looked up from a string
 * registry (CLAUDE.md section 5), so the set stays tree-shaken.
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

export interface SectionEmptyProps {
  /** Heroicon for the section (a component, e.g. `UsersIcon`). */
  icon: IconType;
  title: string;
  body: string;
  action?: SectionEmptyAction;
  /**
   * Whether this section fills in from indexed data. True by default; pass
   * false for sections that work on day one (e.g. Forms) so no waiting hint
   * shows.
   */
  waits?: boolean;
  /**
   * The contract whose index is in progress, if any. When set, the waiting hint
   * reads "on its way" instead of "nothing here yet". Leave undefined/null until
   * the indexing signal ships (step 4).
   */
  indexing?: string | null;
  className?: string;
}

export function SectionEmpty({
  icon: Icon,
  title,
  body,
  action,
  waits = true,
  indexing = null,
  className,
}: SectionEmptyProps) {
  const ActionIcon =
    action?.icon ?? (action?.href ? ArrowRightIcon : undefined);

  return (
    <Card className={className}>
      <CardContent
        className="flex flex-col items-center gap-3 py-12 text-center"
        aria-label={title}
      >
        <div className="rounded-full border border-border bg-muted/40 p-3">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>

        {waits && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              indexing ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {indexing ? (
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {indexing
              ? `Indexing ${indexing}. This fills in when it finishes.`
              : "Waiting on your first indexed contract."}
          </p>
        )}

        {action &&
          (action.href ? (
            <Button asChild size="sm">
              <Link href={action.href}>
                {ActionIcon && (
                  <ActionIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                )}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} size="sm">
              {ActionIcon && (
                <ActionIcon className="mr-1 h-4 w-4" aria-hidden="true" />
              )}
              {action.label}
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
