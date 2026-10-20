"use client";

import { type StepId } from "../../constants/guided";
import { SceneContract } from "./illustrations/scene-contract";
import { SceneDns } from "./illustrations/scene-dns";
import { SceneProject } from "./illustrations/scene-project";
import { SceneTechnical } from "./illustrations/scene-technical";

/**
 * The product illustration beside the question, tailored to the current step. The plan step renders
 * outside the guided shell, so it never reaches here; the project scene is the fallback.
 */
export function ObIllustration({ step }: { step: StepId }) {
  switch (step) {
    case "technical":
      return <SceneTechnical />;
    case "dns":
      return <SceneDns />;
    case "contract":
      return <SceneContract />;
    default:
      return <SceneProject />;
  }
}
