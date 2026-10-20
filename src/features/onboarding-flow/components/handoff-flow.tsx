"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { useSession } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import {
  HANDOFF_FLOW,
  type ManualContractDraft,
  type OnboardingContract,
} from "../constants/guided";
import { chainByKey, DEFAULT_CHAIN } from "../data/chains";
import {
  onboardingService,
  type SuggestedContract,
} from "../onboarding.service";
import { GuidedShell, StepContract, StepDns } from "./guided";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The invited-developer handoff flow (`/onboarding?mode=handoff`).
 *
 * The account owner handed the technical setup over (step 2) and invited whoever holds the
 * credentials as an admin. That member already belongs to the org and the backend has marked their
 * onboarding complete, so they never run the owner's journey: no project to create, no plan to
 * choose. This is the scoped remainder - the two credential-bound steps they were brought in for,
 * the sending domain then the contract - run against the org that already exists.
 *
 * Kept separate from `OnboardingFlow` on purpose: it is a different journey (different flow, no org
 * creation, no billing, a different finish), and the orchestrator is already at its size budget.
 */
export function HandoffFlow() {
  const { push } = useRouter();
  const { data: session } = useSession();
  const activeOrg = useOrgSwitcherContextOptional()?.activeOrg;

  const orgId =
    getSelectedOrganizationId() ??
    session?.session?.activeOrganizationId ??
    undefined;

  const [idx, setIdx] = useState(0);
  const [contract, setContract] = useState("");
  const [picked, setPicked] = useState<SuggestedContract[]>([]);
  const [resolvedChain, setResolvedChain] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualContractDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const at = HANDOFF_FLOW[Math.min(idx, HANDOFF_FLOW.length - 1)];

  const pickedKey = (c: SuggestedContract) =>
    `${c.name}::${c.chainHint}::${c.address ?? ""}`;
  const acceptContract = useCallback((c: SuggestedContract) => {
    setPicked((prev) =>
      prev.some((x) => pickedKey(x) === pickedKey(c)) ? prev : [...prev, c]
    );
  }, []);
  const removeContract = useCallback((c: SuggestedContract) => {
    setPicked((prev) => prev.filter((x) => pickedKey(x) !== pickedKey(c)));
  }, []);

  // What the indexer is pointed at: the contract pasted here plus any accepted suggestions.
  const allContracts: OnboardingContract[] = useMemo(() => {
    const manualAddr = manual?.address.trim() ?? "";
    const typed = contract.trim();
    const manualChain =
      [manual?.chain, resolvedChain].find(
        (c): c is string => typeof c === "string" && c.trim().length > 0
      ) ?? DEFAULT_CHAIN;
    const manualName = manual?.name.trim() ? manual.name.trim() : undefined;
    const primary: OnboardingContract[] = manualAddr
      ? [{ address: manualAddr, chain: manualChain, name: manualName }]
      : typed
        ? [{ address: typed, chain: resolvedChain ?? DEFAULT_CHAIN }]
        : [];
    return [
      ...primary,
      ...picked
        .filter((p) => p.address)
        .map((p) => ({
          address: p.address as string,
          chain: chainByKey(p.chainHint)?.key ?? DEFAULT_CHAIN,
          name: p.name,
        })),
    ];
  }, [contract, picked, resolvedChain, manual]);

  const finish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    // Index-after-handoff: the owner has (or will have) chosen the plan, so kick off the initial
    // historical indexing for whatever the developer supplied. Best-effort: it must never block
    // the hop to the workspace.
    if (allContracts.length > 0) {
      await onboardingService
        .completeTask(
          "connect-chain",
          {
            contracts: allContracts.map((c) => ({
              address: c.address,
              chain: c.chain,
              name: c.name,
            })),
            lookbackDays: 90,
          },
          orgId
        )
        .catch(() => undefined);
    }
    push(PRIVATE_ROUTES.DASHBOARD);
  }, [allContracts, busy, orgId, push]);

  const back = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => {
    if (idx < HANDOFF_FLOW.length - 1) {
      setIdx((i) => i + 1);
      return;
    }
    finish().catch(() => undefined);
  };

  const onLastStep = idx === HANDOFF_FLOW.length - 1;
  // The last step (contract) is a skip when nothing has been given; the sending domain always is.
  const skipping =
    at === "dns" || (at === "contract" && allContracts.length === 0);

  return (
    <GuidedShell
      stepIndex={idx}
      flow={HANDOFF_FLOW}
      footer={
        <>
          {idx > 0 ? (
            <Button variant="secondary" onClick={back} disabled={busy}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant={skipping ? "secondary" : "default"}
            onClick={next}
            disabled={busy}
          >
            {busy
              ? "Finishing…"
              : skipping
                ? onLastStep
                  ? "Finish"
                  : "Skip for now"
                : onLastStep
                  ? "Finish"
                  : "Continue"}
            {!busy && !skipping ? (
              <ArrowRightIcon aria-hidden="true" className="ml-1.5 h-4 w-4" />
            ) : null}
          </Button>
        </>
      }
    >
      {at === "dns" && (
        <StepDns handingOver={false} handoffSent={false} website="" />
      )}
      {at === "contract" && (
        <StepContract
          value={contract}
          onChange={setContract}
          picked={picked}
          onAcceptSuggestion={acceptContract}
          onRemoveSuggestion={removeContract}
          chain={resolvedChain ?? DEFAULT_CHAIN}
          onChain={setResolvedChain}
          manual={manual}
          onManual={setManual}
          projectName={activeOrg?.name ?? ""}
          sector=""
          chains={[]}
        />
      )}
    </GuidedShell>
  );
}
