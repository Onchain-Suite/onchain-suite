"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
}

interface OnboardingStepProps {
  onNext: () => void;
  onPrevious?: () => void;
  onComplete: (stepData?: Record<string, boolean>) => void;
  stepStartTime: number;
}

interface OnboardingProgress {
  onboardingId: string;
  totalTimeSeconds: number;
  totalTimeFormatted: string;
  completionPercentage: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt: Date | null;
  stepsCompleted: number;
  totalSteps: number;
}

// Sample onboarding steps
const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Onchain Suite",
    description: "Let's get you started with the basics",
    component: WelcomeStep,
  },
  {
    id: "profile",
    title: "Complete Your Profile",
    description: "Tell us a bit about yourself",
    component: ProfileStep,
  },
  {
    id: "project-setup",
    title: "Create Your First Project",
    description: "Set up your first marketing project",
    component: ProjectSetupStep,
  },
  {
    id: "integrations",
    title: "Connect Your Tools",
    description: "Integrate with your existing marketing stack",
    component: IntegrationsStep,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Welcome to the future of marketing automation",
    component: CompleteStep,
  },
];

export function OnboardingFlow() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      loadOnboardingProgress();
    }
  }, [user]);

  const loadOnboardingProgress = async () => {
    try {
      const res = await apiClient.get("/onboarding/progress");
      const payload: unknown = res.data;
      const data =
        isJsonObject(payload) && "data" in payload ? payload.data : payload;
      const dataObj = isJsonObject(data) ? data : undefined;
      const progressCandidate = dataObj?.progress;

      if (isJsonObject(progressCandidate)) {
        setProgress(progressCandidate as unknown as OnboardingProgress);
        // Find the current step based on completed steps
        const completedSteps =
          typeof progressCandidate.stepsCompleted === "number"
            ? progressCandidate.stepsCompleted
            : 0;
        const nextStepIndex = Math.min(
          completedSteps,
          onboardingSteps.length - 1
        );
        setCurrentStepIndex(nextStepIndex);
      }
    } catch (error) {
      console.error("Failed to load onboarding progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackStep = async (
    action: string,
    stepData?: Record<string, boolean>
  ) => {
    if (!user?.id) return;

    const timeSpent = Math.floor((Date.now() - stepStartTime) / 1000);
    const currentStep = onboardingSteps[currentStepIndex];

    try {
      await apiClient.post("/onboarding/track", {
        stepName: currentStep.id,
        action,
        timeSpentSeconds: timeSpent,
        stepData,
        flowVersion: "onboarding-v1",
        metadata: { userAgent: navigator.userAgent },
      });
    } catch (error) {
      console.error("Failed to track onboarding step:", error);
    }
  };

  const handleStepComplete = async (stepData?: Record<string, boolean>) => {
    await trackStep("completed", stepData);

    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setStepStartTime(Date.now());
      await trackStep("started");
    } else {
      // Onboarding completed
      toast.success("Onboarding completed! Welcome to Onchain Suite!");
      router.push("/dashboard");
    }
  };

  const handleNext = async () => {
    await trackStep("skipped");
    handleStepComplete();
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setStepStartTime(Date.now());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentStep = onboardingSteps[currentStepIndex];
  const StepComponent = currentStep.component;
  const completionPercentage =
    ((currentStepIndex + 1) / onboardingSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Getting Started</h1>
              <p className="text-muted-foreground">
                Step {currentStepIndex + 1} of {onboardingSteps.length}
              </p>
            </div>
            {progress && (
              <div className="flex items-center gap-2">
                <ClockIcon
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">
                  {progress.totalTimeFormatted} spent
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={completionPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(completionPercentage)}% complete</span>
              <span>
                {onboardingSteps.length - currentStepIndex - 1} steps remaining
              </span>
            </div>
          </div>
        </div>

        {/* Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {onboardingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                index < currentStepIndex
                  ? "bg-primary/10 border-primary/20"
                  : index === currentStepIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-muted"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : index === currentStepIndex
                      ? "bg-primary-foreground text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckIcon aria-hidden="true" className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-xs font-medium truncate">{step.title}</div>
            </div>
          ))}
        </div>

        {/* Current Step */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step {currentStepIndex + 1}</Badge>
              <CardTitle>{currentStep.title}</CardTitle>
            </div>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepComponent
                  onNext={handleNext}
                  onPrevious={currentStepIndex > 0 ? handlePrevious : undefined}
                  onComplete={handleStepComplete}
                  stepStartTime={stepStartTime}
                />
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sample step components
function WelcomeStep({ onComplete }: OnboardingStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center mx-auto">
        <TrophyIcon aria-hidden="true" className="h-12 w-12 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">Welcome to OnchainSuite!</h3>
        <p className="text-muted-foreground">
          You&apos;re about to discover the future of marketing automation.
          Let&apos;s get you set up in just a few minutes.
        </p>
      </div>
      <Button onClick={() => onComplete()} className="w-full">
        Let&apos;s Get Started
        <ArrowRightIcon aria-hidden="true" className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function ProfileStep({ onComplete, onNext }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Complete Your Profile</h3>
      <p className="text-muted-foreground">
        Help us personalize your experience by completing your profile.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onComplete({ profileCompleted: true })}>
          Complete Profile
        </Button>
        <Button variant="outline" onClick={onNext}>
          Skip for Now
        </Button>
      </div>
    </div>
  );
}

function ProjectSetupStep({ onComplete, onNext }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Create Your First Project</h3>
      <p className="text-muted-foreground">
        Projects help you organize your marketing campaigns and track
        performance.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onComplete({ projectCreated: true })}>
          Create Project
        </Button>
        <Button variant="outline" onClick={onNext}>
          Skip for Now
        </Button>
      </div>
    </div>
  );
}

function IntegrationsStep({ onComplete, onNext }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Connect Your Tools</h3>
      <p className="text-muted-foreground">
        Connect your existing marketing tools to get the most out of Onchain
        Suite.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onComplete({ integrationsSetup: true })}>
          Connect Tools
        </Button>
        <Button variant="outline" onClick={onNext}>
          Skip for Now
        </Button>
      </div>
    </div>
  );
}

function CompleteStep({ onComplete }: OnboardingStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center mx-auto">
        <CheckIcon aria-hidden="true" className="h-12 w-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">You&apos;re All Set!</h3>
        <p className="text-muted-foreground">
          Congratulations! You&apos;ve completed the onboarding process.
          You&apos;re ready to start building amazing marketing campaigns.
        </p>
      </div>
      <Button onClick={() => onComplete()} className="w-full">
        Go to Dashboard
        <ArrowRightIcon aria-hidden="true" className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
