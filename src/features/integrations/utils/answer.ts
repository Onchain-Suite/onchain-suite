import type { ChannelReadinessStatus } from "@/features/channels/types/channel";

export interface IntegrationsAnswer {
  /** "3 contracts indexed", or "No contracts indexed yet". */
  contracts: string;
  /** How the sentence ends for email, after "Email ". */
  email: string;
  /** How the sentence ends for push, after "in-app push ". */
  push: string;
}

const EMAIL: Record<ChannelReadinessStatus, string> = {
  connected: "is ready to send",
  pending: "has a sending domain waiting to verify",
  none: "has no verified sending domain yet",
};

/**
 * The Integrations page's one sentence (2.7): what is connected, the way every
 * list page answers. Null for a workspace with nothing connected at all, where
 * the page says what it is for instead of listing three things that are off.
 */
export function integrationsAnswer(input: {
  contracts: number;
  email: ChannelReadinessStatus;
  push: ChannelReadinessStatus;
}): IntegrationsAnswer | null {
  const { contracts, email, push } = input;
  if (contracts === 0 && email === "none" && push === "none") return null;
  return {
    contracts:
      contracts === 0
        ? "No contracts indexed yet"
        : `${contracts.toLocaleString("en-US")} ${contracts === 1 ? "contract" : "contracts"} indexed`,
    email: EMAIL[email],
    push: push === "connected" ? "is installed" : "is not installed yet",
  };
}
