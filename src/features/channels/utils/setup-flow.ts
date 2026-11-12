/**
 * Where a channel is in its setup, as three nodes: started, checked, live.
 *
 * Each channel reaches "live" by a different road (DNS records, an SDK
 * reporting in, a credential a platform accepts), but the person setting it up
 * asks the same question of all of them: what have I done, and what is next?
 * These functions answer it from the same facts the readiness list uses, so a
 * channel's page and its row in the list cannot disagree.
 *
 * Pure, no React.
 */
import { MOBILE_PUSH_FLOW, SETUP_GUIDES } from "../data/setup-guides";
import type { SocialChannelId } from "../types/channel";
import type { DomainStatus } from "./domain-status";
import type { ReadinessInputs, SocialConnectionState } from "./readiness";

export interface FlowStep {
  label: string;
  done: boolean;
}

const steps = (
  labels: readonly [string, string, string],
  done: readonly [boolean, boolean, boolean]
): FlowStep[] => labels.map((label, i) => ({ label, done: done[i] ?? false }));

/** Email: a domain exists, its records resolve, it is verified. */
export function emailFlow(statuses: readonly DomainStatus[]): FlowStep[] {
  const verified = statuses.includes("verified");
  return steps(SETUP_GUIDES.email.flow, [
    statuses.length > 0,
    verified,
    verified,
  ]);
}

/** Web push: a key exists (the SDK can be installed), then it reports a session. */
export function webPushFlow(web: ReadinessInputs["webPush"]): FlowStep[] {
  const live = web.hasKey && (web.sessionCount ?? 0) > 0;
  return steps(SETUP_GUIDES.push.flow, [web.hasKey, live, live]);
}

/** Mobile push: a store credential is added, then Apple or Google accepts it. */
export function mobilePushFlow(
  mobile: ReadinessInputs["mobilePush"]
): FlowStep[] {
  return steps(MOBILE_PUSH_FLOW, [
    mobile.hasCredential || mobile.hasVerified,
    mobile.hasVerified,
    mobile.hasVerified,
  ]);
}

/**
 * A social channel: something was saved, and the platform accepted it. A
 * credential the platform rejected has been pasted but is not connected, so
 * the line stops one short of the end.
 */
export function socialFlow(
  id: SocialChannelId,
  state: SocialConnectionState = "none"
): FlowStep[] {
  const saved = state !== "none";
  return steps(SETUP_GUIDES[id].flow, [saved, saved, state === "connected"]);
}

/** The step to do next: the first one not done. Null when all are. */
export function nextStep(flow: readonly FlowStep[]): number | null {
  const index = flow.findIndex((s) => !s.done);
  return index === -1 ? null : index;
}
