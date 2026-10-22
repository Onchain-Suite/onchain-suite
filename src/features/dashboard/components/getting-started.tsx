"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlusIcon,
  ShareIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { SetupStepIcon } from "../data/setup-steps";
import { setupContractKey, useSetupSteps } from "../hooks/use-setup-steps";
import { setupNudge } from "../utils/setup";

// The contract dialog is only needed when someone indexes from the panel, so
// it stays out of the sidebar's bundle until then.
const ImportContractsDialog = dynamic(
  () =>
    import("@/features/audience/components/import-contracts-dialog").then(
      (m) => m.ImportContractsDialog
    ),
  { ssr: false }
);

const ICON: Record<SetupStepIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  users: UserGroupIcon,
  mail: EnvelopeIcon,
  phone: DevicePhoneMobileIcon,
  network: ShareIcon,
  globe: GlobeAltIcon,
};

/** Per-viewer collapsed state for the sidebar checklist. */
const COLLAPSED_KEY = "onchain.gettingStarted.collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The setup checklist, pinned to the sidebar (v2.7 reference
 * `GettingStarted`). Every step is something you do on another screen, so it
 * stays visible while you do the work.
 *
 * It removes itself at 6/6 rather than sitting there as a trophy, hides while
 * its reads are loading (so it never flashes a wrong count), collapses to its
 * header (per viewer), and is hidden on the icon rail where there is no room.
 * Done rows stay clickable: "take me back to it" is a real thing to want.
 */
export function GettingStarted() {
  const router = useRouter();
  const qc = useQueryClient();
  const { steps, isLoading, organizationId } = useSetupSteps();
  const [collapsed, setCollapsed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // per-viewer convenience only
      }
      return next;
    });
  };

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;

  if (isLoading || total === 0 || done >= total) return null;

  return (
    <section
      aria-label="Getting started"
      className="border-border bg-card flex flex-col gap-[9px] rounded-lg border p-3 pb-2.5 shadow-sm group-data-[collapsible=icon]:hidden"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-foreground text-[13px] font-semibold">
            Getting started
          </b>
          <span className="text-muted-foreground text-[11.5px]">
            {done}/{total} steps completed{" "}
            <i className="not-italic opacity-50">·</i> {setupNudge(done, total)}
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Expand getting started" : "Collapse getting started"
          }
          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex rounded-sm p-0.5 transition-colors"
        >
          {collapsed ? (
            <ChevronUpIcon className="size-[15px]" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="size-[15px]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* One segment per step: the segments are the count. */}
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} steps completed`}
        className="flex gap-[3px]"
      >
        {steps.map((s) => (
          <span
            key={s.id}
            className={cn(
              "h-[3px] flex-1 rounded-full",
              s.done ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>

      {!collapsed && (
        <ul className="mt-0.5 flex flex-col gap-px">
          {steps.map((s) => {
            const Icon = ICON[s.icon];
            const open = openId === s.id && !s.done;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() =>
                    s.done ? router.push(s.href) : setOpenId(open ? null : s.id)
                  }
                  aria-expanded={s.done ? undefined : open}
                  className="text-foreground hover:bg-accent flex w-full items-center gap-[9px] rounded-md px-1.5 py-1.5 text-left text-[12.5px] transition-colors"
                >
                  <span
                    className={cn(
                      "flex size-[22px] shrink-0 items-center justify-center rounded-sm border",
                      s.done
                        ? "text-muted-foreground/50 border-transparent"
                        : "text-muted-foreground border-border"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1",
                      s.done && "text-muted-foreground line-through"
                    )}
                  >
                    {s.label}
                  </span>
                  {s.done ? (
                    <span
                      aria-label="Done"
                      className="bg-primary text-primary-foreground flex size-4 shrink-0 items-center justify-center rounded-full"
                    >
                      <CheckIcon
                        className="size-[11px]"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <ChevronRightIcon
                      className={cn(
                        "text-muted-foreground size-3.5 shrink-0 transition-transform",
                        open && "rotate-90"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>
                {open && (
                  <div className="flex flex-col items-start gap-[7px] pt-0.5 pr-1.5 pb-2 pl-[37px]">
                    <p className="text-muted-foreground m-0 text-[11.5px] leading-normal">
                      {s.hint}
                    </p>
                    {/* Indexing is a dialog, so it opens here rather than on another page. */}
                    <button
                      type="button"
                      onClick={() =>
                        s.id === "contract"
                          ? setIndexing(true)
                          : router.push(s.href)
                      }
                      className="text-primary inline-flex items-center gap-[5px] text-[11.5px] font-medium"
                    >
                      {s.id === "contract" ? (
                        <>
                          Index your contract
                          <PlusIcon
                            className="size-[13px]"
                            aria-hidden="true"
                          />
                        </>
                      ) : (
                        <>
                          Take me there
                          <ArrowRightIcon
                            className="size-[13px]"
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
    </section>
  );
}
