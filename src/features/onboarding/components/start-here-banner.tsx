"use client";

import {
  ArrowUpTrayIcon,
  CubeTransparentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { useWorkspaceMode } from "../hooks/use-workspace-mode";
import { FIRST_MILE_SECTOR_KEY } from "../utils/onboarding-timing";
import { isWeb2Sector } from "../utils/sector";
import { SETTINGS_CONTRACTS_HREF } from "@/features/settings/components/contract-address-nudge";
import { Button } from "@/shared/components/ui/button";

const AUDIENCE_IMPORT_HREF = "/audience/import-export";

/** Per-viewer dismissal of the first-mile banner (optional, so it is dismissible). */
const DISMISSED_KEY = "onchain.onboarding.startHereDismissed";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The first-mile call to action, shown at the top of the dashboard while the
 * workspace is empty (v2.7 onboarding migration, step 3).
 *
 * Indexing a contract is the fastest way to fill a web3 workspace, but it is
 * OPTIONAL: the banner offers importing an audience as an equal path and can be
 * dismissed. For a web2 client (sector picked in onboarding) there is no
 * contract to index, so the contract nudge is skipped entirely and the banner
 * points straight at importing.
 *
 * Renders nothing unless the workspace is genuinely empty (waits out the
 * `useWorkspaceMode` load so it never flashes at a populated account) or once
 * dismissed. The web2 signal comes from the durable sector stamp the wizard
 * writes; absent/unknown falls back to the web3 copy, where indexing is merely
 * offered, not assumed.
 */
export function StartHereBanner({ className }: { className?: string }) {
  const { mode, isLoading } = useWorkspaceMode();
  const [dismissed, setDismissed] = useState(false);
  const [web2, setWeb2] = useState(false);

  useEffect(() => {
    setDismissed(readStorage(DISMISSED_KEY) === "1");
    setWeb2(isWeb2Sector(readStorage(FIRST_MILE_SECTOR_KEY)));
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // per-viewer convenience only
    }
  };

  if (isLoading || mode !== "empty" || dismissed) return null;

  const title = web2
    ? "Start here: import your audience"
    : "Start here: index your contract";
  const body = web2
    ? "Bring in your contacts to start sending across email and in-app push. Everything below fills in once your audience lands."
    : "Index a contract to turn holder wallets into an audience you can reach. Prefer to bring your own list? Import an audience instead. This is optional, you can do it anytime.";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
          {web2 ? (
            <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CubeTransparentIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end lg:flex-row">
        {web2 ? (
          <Button asChild size="sm">
            <Link href={AUDIENCE_IMPORT_HREF}>
              <ArrowUpTrayIcon className="mr-1 h-4 w-4" aria-hidden="true" />
              Import your audience
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size="sm">
              <Link href={SETTINGS_CONTRACTS_HREF}>
                <CubeTransparentIcon
                  className="mr-1 h-4 w-4"
                  aria-hidden="true"
                />
                Index a contract
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={AUDIENCE_IMPORT_HREF}>
                Import an audience instead
              </Link>
            </Button>
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Skip for now</span>
        </Button>
      </div>
    </div>
  );
}
