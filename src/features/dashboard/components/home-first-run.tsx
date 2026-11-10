"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  setupContractKey,
  type SetupStep,
  useSetupSteps,
} from "../hooks/use-setup-steps";
import { nonEmpty } from "../utils/text";
import { FirstRunQuestion } from "./home/first-run-question";
import { FirstRunSetup } from "./home/first-run-setup";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import {
  saveStartPath,
  type StartPath,
} from "@/features/onboarding/utils/start-path";

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
 * that team's quickest win. Once answered, Home carries the whole way in and
 * is the only place the checklist lives.
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
  const { steps, organizationId, startPath } = useSetupSteps();
  const [indexing, setIndexing] = useState(false);
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

  const answer = (path: StartPath | null) =>
    saveStartPath(organizationId, path);

  const go = (step: SetupStep) => {
    if (step.id === "contract") setIndexing(true);
    else router.push(step.href);
  };

  return (
    <>
      {startPath ? (
        <FirstRunSetup
          heading={heading}
          workspaceName={workspaceName}
          steps={steps}
          startPath={startPath}
          onChangeStart={() => answer(null)}
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
