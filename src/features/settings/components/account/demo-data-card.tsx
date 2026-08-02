"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/**
 * Demo data reset. There is no browser-persisted demo store on this build, so
 * "reset" clears the client-side query cache and reloads to re-pull seeded
 * server state — a safe no-destructive-writes action. Left as a stub until a
 * real demo-persistence layer exists.
 */
export function DemoDataCard() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reset = () => {
    queryClient.clear();
    setConfirmOpen(false);
    toast.success("Demo data reset — restoring seeded state…");
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.location.reload(), 400);
    }
  };

  return (
    <SettingsCard
      title="Demo data"
      description="Reset everything created in this session"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <ArrowPathIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Reset demo data
        </Button>
      }
    >
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Lists, tags, forms, segments and settings you create are saved in this
        browser so they survive a reload. Resetting clears them and restores the
        seeded demo state.
      </p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>
              This clears locally cached data and restores the seeded demo
              state. Your account and saved server data are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={reset}>Reset demo data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}

export default DemoDataCard;
