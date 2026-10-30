import {
  type ProtocolTemplate,
  protocolTemplateFamilies,
  type ProtocolTemplateFamilyMeta,
} from "../data/protocol-templates";

/**
 * Whether a Play can be forked and run as-is, or still needs the user to fill
 * in trigger details first.
 */
export type PlayReadiness = "ready" | "needs-setup";

/**
 * A Play needs setup when its trigger leaves required fields (contract, chain,
 * segment, amount) blank for the user to pick; otherwise it is ready to fork
 * and run straight away. Mirrors the 2.7 gallery's "Ready to fork" vs "Needs
 * setup" state, derived from the template itself (no separate flag to drift).
 */
export function templateReadiness(template: ProtocolTemplate): PlayReadiness {
  const needsSetup = template.steps.some(
    (step) => step.kind === "trigger" && (step.requires?.length ?? 0) > 0
  );
  return needsSetup ? "needs-setup" : "ready";
}

export interface PlayFamilyGroup {
  family: ProtocolTemplateFamilyMeta;
  plays: ProtocolTemplate[];
}

/**
 * Group Plays by family, in the families' declared order, dropping families
 * that have no plays. Keeps the gallery sections stable and catalog-driven.
 */
export function groupPlaysByFamily(
  templates: ProtocolTemplate[]
): PlayFamilyGroup[] {
  return protocolTemplateFamilies
    .map((family) => ({
      family,
      plays: templates.filter((t) => t.family === family.id),
    }))
    .filter((group) => group.plays.length > 0);
}
