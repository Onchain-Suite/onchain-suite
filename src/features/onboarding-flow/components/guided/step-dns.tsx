"use client";

import dynamic from "next/dynamic";

// The real sending-domain flow (input -> generate DNS records -> check -> verified) lives in
// Settings and is self-contained (no props, no routing, no role gating). It is below the fold of
// onboarding and pulls in React Query + the settings records table, so it is code-split and only
// loads when the step is reached.
const SenderVerificationCard = dynamic(
  () =>
    import("@/features/settings/components/account/sender-verification-card").then(
      (m) => m.SenderVerificationCard
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 h-40 animate-pulse rounded-xl border" />
    ),
  }
);

/**
 * The sending domain. The real generate-and-verify card from Settings, dropped into the step so
 * the records can be set up here and now. Nothing blocks: the records resolve on their own
 * schedule and can be added whenever the account owner can reach their DNS, so Continue is a skip.
 */
export function StepDns({
  handingOver,
  handoffSent,
  website,
}: {
  handingOver: boolean;
  handoffSent: boolean;
  website: string;
}) {
  const domain = website
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Set up your sending domain
      </h1>
      <p className="text-muted-foreground mt-3">
        {handingOver
          ? handoffSent
            ? `A few DNS records so email leaves as ${domain || "you"}. If you can reach your DNS you can add them now; if not, skip, they are in the steps your developer was just invited to.`
            : `A few DNS records so email leaves as ${domain || "you"}. If you can reach your DNS you can add them now; if not, skip and invite your developer from Settings later.`
          : `A few DNS records so email leaves as ${domain || "you"} rather than as us. Generate them now and add them whenever you can reach your DNS.`}
      </p>

      <div className="mt-8">
        <SenderVerificationCard />
      </div>

      <p className="text-muted-foreground mt-4 text-sm">
        You do not have to finish this here. Verification runs on its own, and
        you can come back to it from Settings → Integrations → Channels.
      </p>
    </>
  );
}
