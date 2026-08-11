"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
          <ExclamationTriangleIcon
            className="h-7 w-7 text-destructive"
            aria-hidden="true"
          />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          500 - Server error
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          An unexpected error occurred while loading this page. It has been
          logged - try again, or head back to your dashboard.
        </p>

        {error?.digest ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {reset ? (
            <Button onClick={reset} className="rounded-xl">
              <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={PRIVATE_ROUTES.DASHBOARD}>Go to dashboard</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Still stuck?{" "}
          <a
            href="mailto:support@onchainsuite.com"
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
