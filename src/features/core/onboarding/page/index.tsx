"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import {
  completeOnboarding,
  updateOnboardingProgress,
} from "@/onboarding/actions";
import {
  BusinessAddressStep,
  BusinessGoalStep,
  ContactCountStep,
  ImportantFeaturesStep,
  OnboardingLayout,
  OrganizationTypeStep,
  PersonalInfoStep,
  PlanSelectionStep,
} from "@/onboarding/components";
import { useOnboardingPersistence } from "@/onboarding/hooks";
import { type OnboardingData } from "@/onboarding/types";
import { getStepFromNumber } from "@/onboarding/utils";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

export function OnboardingFlow() {
  const { push } = useRouter();

  const {
    step: currentStep,
    data: formData,
    setStep,
    setData,
  } = useOnboardingPersistence<OnboardingData>();

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    setData(stepData);
    const nextStep = currentStep + 1;
    setStep(nextStep);

    // Save progress to Supabase if user is authenticated

    const stepName = getStepFromNumber(nextStep);
    await updateOnboardingProgress({
      step: stepName,
      stepData,
    });
  };

  const handleBack = () => {
    setStep(Math.max(1, currentStep - 1));
  };

  const handleOnboardingComplete = async (
    stepData: Partial<OnboardingData>
  ) => {
    const finalData = { ...formData, ...stepData };

    try {
      // Mark onboarding as completed in the database

      await completeOnboarding(finalData);
      posthog.capture("onboarding_completed");

      push(PRIVATE_ROUTES.DASHBOARD);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Still redirect to dashboard but show a warning
      push(PRIVATE_ROUTES.DASHBOARD);
    }
  };

  const renderStep = () => {
    const commonProps = {
      initialData: formData,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            initialData={formData}
            onNext={handleStepComplete}
          />
        );
      case 2:
        return (
          <BusinessAddressStep {...commonProps} onNext={handleStepComplete} />
        );
      case 3:
        return (
          <OrganizationTypeStep {...commonProps} onNext={handleStepComplete} />
        );
      case 4:
        return (
          <BusinessGoalStep {...commonProps} onNext={handleStepComplete} />
        );
      case 5:
        return (
          <ImportantFeaturesStep {...commonProps} onNext={handleStepComplete} />
        );
      case 6:
        return (
          <ContactCountStep {...commonProps} onNext={handleStepComplete} />
        );
      case 7:
        return (
          <PlanSelectionStep
            {...commonProps}
            onNext={handleOnboardingComplete}
          />
        );
      default:
        return (
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground">
              Welcome to Onchain Suite!
            </h1>
            <p className="text-muted-foreground">
              Your account has been set up successfully.
            </p>
          </div>
        );
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={7}>
      {renderStep()}
    </OnboardingLayout>
  );
}
