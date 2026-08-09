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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>
            Upgrade to unlock more contacts, channels, and intelligence. Pay by
            card (Stripe) or crypto - your plan unlocks once payment confirms.
          </DialogDescription>
        </DialogHeader>
        <PlanPicker
          currentPlan={currentPlan}
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
