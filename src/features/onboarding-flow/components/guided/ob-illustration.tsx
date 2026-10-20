"use client";

import { type StepId } from "../../constants/guided";
import { StepperProvider } from "./illustrations/illustration-frame";
import { SceneContract } from "./illustrations/scene-contract";
import { SceneDns } from "./illustrations/scene-dns";
import { SceneProject } from "./illustrations/scene-project";
import { SceneTechnical } from "./illustrations/scene-technical";

/**
 * The product illustration beside the question, tailored to the current step and topped with a
 * setup stepper so it also shows which step you are on. The plan step renders outside the guided
 * shell, so it never reaches here; the project scene is the fallback.
 */
export function ObIllustration({
  flow,
  stepIndex,
}: {
  flow: StepId[];
  stepIndex: number;
}) {
  const step = flow[Math.min(stepIndex, flow.length - 1)];
  const scene =
    step === "technical" ? (
      <SceneTechnical />
    ) : step === "dns" ? (
      <SceneDns />
    ) : step === "contract" ? (
      <SceneContract />
    ) : (
      <SceneProject />
    );
  return (
    <StepperProvider flow={flow} stepIndex={stepIndex}>
      {scene}
    </StepperProvider>
  );
}
