"use client";

import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PlusIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

import type { SetupStepId } from "../data/setup-steps";
import {
  setupContractKey,
  type SetupStep,
  useSetupSteps,
} from "../hooks/use-setup-steps";
import { startTour } from "@/features/onboarding/hooks/use-tour";
import { CerebraMark } from "@/features/onboarding-flow/components/guided/cerebra-mark";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

// Indexing is a dialog, so it opens in place rather than on another screen; it
// stays out of the home bundle until someone reaches for it.
const ImportContractsDialog = dynamic(
  () =>
    import("@/features/audience/components/import-contracts-dialog").then(
      (m) => m.ImportContractsDialog
    ),
  { ssr: false }
);

/**
 * How long each step takes, and the hand-off when it is usually someone else's
 * job (v2.7 reference `HomeFirstRun` EFFORT). Honest estimates read as help,
 * not nagging; the DNS and SDK steps say out loud that they are often passed on.
 */
const EFFORT: Record<SetupStepId, string> = {
  contacts: "A couple of minutes",
  domain: "Ten minutes at your DNS provider, or send it to whoever has access",
  push: "Twenty minutes for a frontend engineer",
  contract: "About a minute. Optional: adds on-chain data",
  sync: "Two minutes, once a contract is indexed",
  dashboard: "One click, once there are numbers",
};

/**
 * Home in a workspace that has just paid and has nothing indexed (v2.7
 * reference `HomeFirstRun`).
 *
 * It used to be one card that pointed at the sidebar and then sat empty. Home
 * now carries the whole way in: the next step is the hero with its action on
 * it, the rest of setup sits below with an honest estimate of how long each
 * takes and who usually does it, and the things that work before any data
 * arrives are offered, so there is something to do while an index runs.
 *
 * Every step's `done` is read from real workspace state (`useSetupSteps`),
 * never a "has seen" flag, so the count tells the operator something true and
 * un-ticks if they remove a contract.
 */
export function HomeFirstRun({
  greeting,
  name,
  workspaceName,
}: {
  greeting: string;
  name: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { steps, organizationId } = useSetupSteps();
  const [indexing, setIndexing] = useState(false);

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const next = steps.find((s) => !s.done);

  const go = (s: SetupStep) => {
    if (s.id === "contract") setIndexing(true);
    else router.push(s.href);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {`Good ${greeting}, ${name}.`}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Let&apos;s get{" "}
          <b className="font-medium text-foreground">{workspaceName}</b> live.{" "}
          {done} of {total} set up.
        </p>
        <div
          role="progressbar"
          aria-label="Setup"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="mt-4 flex gap-1.5"
        >
          {steps.map((s) => (
            <span
              key={s.id}
              className={cn(
                "h-1 flex-1 rounded-full",
                s.done ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
      </header>

      {next && (
        <section className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[1fr_1.05fr] md:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Next step
            </span>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
              {next.label}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {next.hint}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => go(next)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {next.id === "contract" ? (
                  <>
                    Index your contract
                    <PlusIcon className="size-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    {next.label}
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClockIcon className="size-3.5" aria-hidden="true" />
                {EFFORT[next.id]}
              </span>
            </div>
          </div>
          <HomePeek />
        </section>
      )}

      <section aria-label="Setup">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Setup
        </h2>
        <ol className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const isNext = next?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(s)}
                  disabled={s.done}
                  className={cn(
                    "flex h-full w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
                    s.done
                      ? "border-border/60 cursor-default"
                      : "border-border hover:border-border hover:bg-muted/40",
                    isNext && "border-primary/50 bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      s.done
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    )}
                  >
                    {s.done ? (
                      <CheckIcon
                        className="size-3.5"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        s.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {s.done ? "Done" : EFFORT[s.id]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Works today">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Works today, before any data
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Link
            href={PRIVATE_ROUTES.FORMS}
            className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-border hover:bg-muted/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardDocumentListIcon
                className="size-[18px]"
                aria-hidden="true"
              />
            </span>
            <b className="mt-3 block text-sm font-semibold text-foreground">
              Build a signup form
            </b>
            <span className="mt-1 block text-xs text-muted-foreground">
              Turn visitors into verified contacts. Needs no indexed data.
            </span>
          </Link>
          <Link
            href={`${PRIVATE_ROUTES.INTEGRATIONS}?tab=channels`}
            className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-border hover:bg-muted/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SignalIcon className="size-[18px]" aria-hidden="true" />
            </span>
            <b className="mt-3 block text-sm font-semibold text-foreground">
              Connect a channel
            </b>
            <span className="mt-1 block text-xs text-muted-foreground">
              Email, in-app push or X, so the first campaign has somewhere to
              go.
            </span>
          </Link>
          <button
            type="button"
            onClick={startTour}
            className="group block rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <CerebraMark face size={20} track={false} />
            </span>
            <b className="mt-3 block text-sm font-semibold text-foreground">
              Take the tour with Cerebra
            </b>
            <span className="mt-1 block text-xs text-muted-foreground">
              Two minutes on what each section does and where things live.
            </span>
          </button>
        </div>
      </section>

      {indexing ? (
        <ImportContractsDialog
          open={indexing}
          onOpenChange={setIndexing}
          onImported={() => {
            qc.invalidateQueries({
              queryKey: setupContractKey(organizationId),
            });
          }}
        />
      ) : null}
    </div>
  );
}

/** A faint peek at what Home looks like once data arrives. Decorative. */
function HomePeek() {
  return (
    <div
      className="rounded-xl border border-border bg-muted/20 p-4"
      aria-hidden="true"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Home, once it is live
      </span>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["Active wallets", "Messages sent", "On-chain conversions"].map(
          (t) => (
            <div
              key={t}
              className="rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span className="block truncate text-[11px] text-muted-foreground">
                {t}
              </span>
              <span className="mt-2 block h-3 w-3/5 rounded bg-border" />
            </div>
          )
        )}
      </div>
      <svg
        viewBox="0 0 300 70"
        preserveAspectRatio="none"
        className="mt-3 h-16 w-full rounded-lg border border-border bg-card p-2"
      >
        <path
          d="M0 58 C 50 54, 80 44, 120 46 S 190 30, 230 26 S 280 12, 300 8"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          opacity="0.45"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M0 64 C 60 62, 90 56, 140 58 S 210 46, 250 44 S 285 38, 300 36"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          opacity="0.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
