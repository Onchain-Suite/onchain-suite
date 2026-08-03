"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CommandBar } from "../components/command-bar";
import { GetStartedSection } from "@/features/dashboard/components/get-started";

interface UserData {
  projectName: string;
  userType: "DeFi" | "Gaming" | "DAO";
  trialDaysLeft?: number;
  isNewUser: boolean;
  subscriptionTier:
    "free_trial" | "limited_free" | "full_paid" | "onchain_suite_only";
  fullName?: string;
  timezone?: string;
}

interface MainDashboardProps {
  userData: UserData;
}

export function MainDashboard({ userData }: MainDashboardProps) {
  const [_setupComplete, setSetupComplete] = useState(false);
  const [_showWalkthrough, setShowWalkthrough] = useState(false);
  const [_walkthroughComplete, setWalkthroughComplete] = useState(false);
  const [_showSetup, setShowSetup] = useState(false);

  const getGreeting = (tz?: string) => {
    let hour = new Date().getHours();
    try {
      if (tz) {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "numeric",
          hour12: false,
        }).formatToParts(new Date());
        const hourPart = parts.find((p) => p.type === "hour");
        if (hourPart) {
          hour = parseInt(hourPart.value, 10);
        }
      }
    } catch {
      hour = new Date().getHours();
    }
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  useEffect(() => {
    const setupCompleted = localStorage.getItem("setup_complete");
    const walkthroughCompleted = localStorage.getItem("walkthrough_complete");

    if (setupCompleted === "true") {
      setSetupComplete(true);
      if (walkthroughCompleted !== "true") {
        setShowWalkthrough(true);
      } else {
        setWalkthroughComplete(true);
      }
    } else {
      setShowSetup(true);
    }

    if (userData.isNewUser && walkthroughCompleted === "true") {
      toast.info(
        `Suite Live—Your ${userData.userType} Engine is Purring!,
        Welcome to OnchainSuite. Your retention platform is ready.`
      );
    }
  }, [userData.isNewUser, userData.userType]);

  return (
    <div className="min-h-screen rounded-2xl bg-background">
      <div className="space-y-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card px-4 py-8 text-center md:px-6">
          <div className="text-2xl font-semibold">
            {`Good ${getGreeting(userData.timezone)}, ${userData.fullName ?? "there"}!`}
          </div>
          <div className="my-2 text-sm text-muted-foreground">
            Time to focus on what matters most
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-6xl px-3 py-6 md:px-6 md:py-8">
          {/* Command Bar */}
          <CommandBar />

          {/* Get Started Section */}
          <GetStartedSection />
        </div>
      </div>
    </div>
  );
}
