import type { SuggestedContract } from "../onboarding.service";

export interface OnboardingData {
  // Organization Setup
  organizationName: string;
  websiteUrl: string;
  logoUrl?: string;
  description?: string;
  /** Sector label driving `POST /onboarding/suggest-contracts`. */
  sector?: string;
  /** Contracts the user accepted from the suggestion panel (reviewed). */
  contracts?: SuggestedContract[];

  // Legacy/Optional
  firstName?: string;
  lastName?: string;
  protocolName?: string;
  phoneNumber?: string;
  marketingEmails?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  organizationTypes?: string[];
  /** The workspace's goal: a `GoalOption.id` from data/goals.ts. */
  businessGoal?: string;
  /** What the team had at signup: "people", "site" or "chain". */
  startPath?: string;
  importantFeatures?: string[];
  contactCount?: string;
  selectedPlan?: string;
}

export interface PersonalInfoStepProps {
  initialData: Partial<OnboardingData>;
  onNext: (data: Partial<OnboardingData>) => void | Promise<void>;
}

export interface OnboardingStepsProps extends PersonalInfoStepProps {
  onBack: () => void;
}
