"use client";

import { type OnboardingStepsProps } from "../types";
import { PlanPicker } from "@/features/billing/components/plan-picker";

/**
 * Onboarding step 2 - pick a billing plan. PAYG starts the metered plan; paid
 * plans open a hosted checkout (Stripe card by default, crypto fallback). The
 * shared {@link PlanPicker} is the single source of truth, also used in
 * Settings > Billing. Billing failures never block finishing onboarding.
 */
export function PlanSelectionStep({
  initialData,
  onNext,
  onBack,
}: OnboardingStepsProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Choose the plan that fits your protocol
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Start pay-as-you-go with a $5 trial credit and upgrade whenever you
          need more reach - you can change your plan anytime in Settings -
          Billing.
        </p>
      </div>

      <PlanPicker
        initialPlan={initialData.selectedPlan ?? ""}
        submitLabel="Continue with"
        onBack={onBack}
        onCompleted={(planSlug) => {
          // Record the choice and advance; checkout (if any) opens in a new tab.
          Promise.resolve(onNext({ selectedPlan: planSlug })).catch(
            () => undefined
          );
        }}
      />
    </div>
  );
}
