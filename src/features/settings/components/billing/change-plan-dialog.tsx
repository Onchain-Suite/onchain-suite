"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PlanPicker } from "@/features/billing/components/plan-picker";
import { useCurrentPlanSize } from "@/features/billing/hooks/use-current-plan-size";

/**
 * Settings > Billing "Change plan" - renders the shared {@link PlanPicker}
 * (the same one used in onboarding) so there is a single plan/checkout surface.
 * Replaces the old bespoke upgrade dialog.
 */
export default function ChangePlanDialog({
  currentPlan,
  trigger,
}: {
  currentPlan?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const current = useCurrentPlanSize();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" className="rounded-xl">
            <SparklesIcon aria-hidden="true" className="h-4 w-4" />
            Change plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-6xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            Choose your plan
          </DialogTitle>
          <DialogDescription>
            Move the slider to the list size you need. Pay by card (Stripe) or
            crypto - your plan unlocks once payment confirms.
          </DialogDescription>
        </DialogHeader>
        <PlanPicker
          // Keyed on the size so the slider opens on it once it is known.
          key={current.units ?? "unknown"}
          currentPlan={currentPlan}
          current={current}
          submitLabel="Upgrade to"
          onCompleted={() => {
            queryClient.invalidateQueries({ queryKey: ["billing"] });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
