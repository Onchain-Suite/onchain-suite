import type { OnboardingContract } from "../constants/guided";

/*
 * Onboarding starts indexing as soon as the contract is known, instead of
 * after the plan is chosen, so the workspace has holders and activity in it by
 * the time setup ends. That means the same contract passes several points that
 * could each start it (the workspace being created, leaving the contract step,
 * finishing), and a reload in between. These rules make it start once.
 */

const STORAGE_KEY = "onchain.onboarding.indexingStarted";

/**
 * One identity for a set of contracts in a workspace, whatever order or case
 * they came in. The workspace is part of it: the same contract set up in a
 * second workspace from the same tab is a different job.
 */
export function contractsKey(
  contracts: OnboardingContract[],
  orgId: string | null = null
): string {
  const list = contracts
    .map(
      (c) => `${c.chain.trim().toLowerCase()}:${c.address.trim().toLowerCase()}`
    )
    .sort()
    .join("|");
  return `${orgId ?? ""}#${list}`;
}

/**
 * Whether indexing still has to be started for these contracts: there are
 * some, and they are not the ones it was last started for. A changed contract
 * (a different address, or the same one found on another chain) starts again.
 */
export function shouldStartIndexing(
  contracts: OnboardingContract[],
  startedKey: string | null,
  orgId: string | null = null
): boolean {
  return contracts.length > 0 && contractsKey(contracts, orgId) !== startedKey;
}

/** The contracts indexing was last started for in this browser session. */
export function readStartedKey(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Remember (or, with null, forget) what indexing was started for. */
export function writeStartedKey(key: string | null): void {
  try {
    if (key === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage blocked: at worst indexing is asked for twice.
  }
}

/**
 * How long a step waits for indexing to be asked for before moving on. Asking
 * and tracking the step both write the same onboarding record, so the step is
 * tracked after the ask has settled; but a slow request must not hold the
 * Continue button, so past this the step carries on regardless.
 */
export const INDEXING_START_WAIT_MS = 2500;

/** Resolves when `work` settles or `ms` has passed, whichever is first. */
export function settleWithin(
  work: Promise<unknown>,
  ms: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    work.then(done, done);
  });
}
