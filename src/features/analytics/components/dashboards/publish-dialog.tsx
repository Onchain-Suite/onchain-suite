"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Dashboard } from "../../contracts/dashboards";
import {
  useDashboardActions,
  useDashboardLinks,
} from "../../hooks/use-dashboards";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/** Publish a read-only link to a dashboard, and turn existing links off. */
export function PublishDialog({
  open,
  dashboard,
  onClose,
}: {
  open: boolean;
  dashboard: Dashboard;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(dashboard.name);
  useEffect(() => {
    if (open) setTitle(dashboard.name);
  }, [open, dashboard.name]);
  const links = useDashboardLinks(dashboard.id, open);
  const { publish, revoke, local } = useDashboardActions();
  const added = dashboard.charts.length;
  const what = dashboard.builtIn
    ? `The ${dashboard.name} tab's charts${added ? ` and ${added} you added` : ""}`
    : `${added} chart${added === 1 ? "" : "s"}`;
  const nothing = !dashboard.builtIn && added === 0;

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish this dashboard</DialogTitle>
          <DialogDescription>
            {what}, recomputed live every time the link opens.
          </DialogDescription>
        </DialogHeader>
        <input
          aria-label="Name on the public page"
          className="an-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="an-pub__warn">
          <ExclamationTriangleIcon aria-hidden="true" />
          {local
            ? "Sharing needs the backend, which isn't live yet. Links you make now open only in this browser, for people signed in to this workspace."
            : "Anyone with the link can read it without signing in. It shows live totals, never individual contacts."}
        </p>
        {links.data && links.data.length > 0 ? (
          <ul className="an-pub__links" aria-label="Live links">
            {links.data.map((l) => (
              <li key={l.token}>
                <code>{l.url}</code>
                <button type="button" onClick={() => copy(l.url)}>
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    revoke.mutate(l.token, {
                      onSuccess: () =>
                        toast.success(
                          "Link turned off. It stops working at once"
                        ),
                    })
                  }
                >
                  Turn off
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button
            disabled={publish.isPending || nothing}
            title={nothing ? "Add a chart first" : undefined}
            onClick={() =>
              publish.mutate(
                { dashboard, title },
                {
                  onSuccess: (link) => {
                    copy(link.url);
                  },
                  onError: (e) =>
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "Couldn't create the link"
                    ),
                }
              )
            }
          >
            {publish.isPending ? "Creating…" : "Create a link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
