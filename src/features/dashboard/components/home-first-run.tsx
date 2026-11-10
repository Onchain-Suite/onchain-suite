"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  SETUP_DEADLINE_MS,
  setupContractKey,
  type SetupStep,
  useElapsed,
  useSetupSteps,
} from "../hooks/use-setup-steps";
import { nonEmpty } from "../utils/text";
import { FirstRunQuestion } from "./home/first-run-question";
import { FirstRunSetup } from "./home/first-run-setup";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import type { StartPath } from "@/features/onboarding/utils/start-path";
import { Skeleton } from "@/shared/components/ui/skeleton";

// Indexing is a dialog, so it opens in place rather than on another screen; it
// stays out of the home bundle until someone reaches for it.
const ImportContractsDialog = dynamic(
  () =>
    import("@/features/audience/components/import-contracts-dialog").then(
      (m) => m.ImportContractsDialog
    ),
  { ssr: false }
);

/**
 * Home in a workspace with nothing in it yet (v2.7 reference `HomeFirstRun`,
 * 7 Nov 2026).
 *
 * It opens on one question, what do you have today, unless onboarding already
 * asked it. The answer orders the same six setup steps so the first one is
 * that team's quickest win, and is saved on the workspace (server-side), so it
 * is the same for the whole team and can be analysed. Once answered, Home
 * carries the whole way in and is the only place the checklist lives.
 *
 * Every step's `done` is read from real workspace state (`useSetupSteps`),
 * never a "has seen" flag, and the workspace named is the real active one.
 */
export function HomeFirstRun({
  greeting,
  name,
}: {
  greeting: string;
  name: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { steps, organizationId, startPath, startPathResolved, setStartPath } =
    useSetupSteps();
  const [indexing, setIndexing] = useState(false);
  // "Change" asks again; the saved answer stands until a new one is picked.
  const [asking, setAsking] = useState(false);
  const pastDeadline = useElapsed(SETUP_DEADLINE_MS);
  // The real active workspace; a neutral phrase until its name has loaded.
  const workspaceName =
    nonEmpty(useOrgSwitcherContextOptional()?.activeOrg?.name) ??
    "your workspace";
  const heading = `Good ${greeting}, ${name}.`;

  // The sidebar's Setup line lands here, on the steps.
  useEffect(() => {
    if (startPath && window.location.hash === "#setup") {
      document.getElementById("setup")?.scrollIntoView({ block: "start" });
    }
  }, [startPath]);

  const answer = (path: StartPath) => {
    setStartPath(path);
    setAsking(false);
  };

  const go = (step: SetupStep) => {
    if (step.id === "contract") setIndexing(true);
    else router.push(step.href);
  };

  // The answer may be on the server (given in the wizard, or on another
  // device). Wait for it, briefly, rather than flash the question.
  if (!startPath && !startPathResolved && !pastDeadline) {
    return (
      <div className="mx-auto w-full max-w-7xl" aria-busy="true">
        <header className="mb-[22px]">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
            {heading}
          </h1>
          <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
        </header>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      {startPath && !asking ? (
        <FirstRunSetup
          heading={heading}
          workspaceName={workspaceName}
          steps={steps}
          startPath={startPath}
          onChangeStart={() => setAsking(true)}
          onStep={go}
        />
      ) : (
        <FirstRunQuestion
          heading={heading}
          workspaceName={workspaceName}
          onAnswer={answer}
        />
      )}

      {indexing ? (
        <ImportContractsDialog
          open={indexing}
          onOpenChange={setIndexing}
          onImported={() => {
            qc.invalidateQueries({
              queryKey: setupContractKey(organizationId),
            });
          }}
        />
      ) : null}
    </>
  );
}
