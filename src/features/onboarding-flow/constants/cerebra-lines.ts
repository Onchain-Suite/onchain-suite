/**
 * What Cerebra says during onboarding (v2.7).
 *
 * Scripted, not generated: every line is written for its step and the answers so far, so it is
 * instant, always right about what is on screen, and costs nothing per sign-up. Each line does
 * one job: it asks the next question, confirms what was just given, or says what happens next.
 * Ported from the 2.7 handoff (web/src/data/cerebraLines.ts) and adapted to the app's data model.
 *
 * Context the orchestrator cannot cheaply reach (the sending-domain verify state, the picked
 * contract, the chosen plan size) degrades to the role-aware default line for that step - the
 * form stays the source of truth; Cerebra only talks people through it.
 */
import { type ProjectProfile, type Role, type StepId } from "./guided";

export interface LineContext {
  step: StepId;
  profile: ProjectProfile;
  /** What the contract field was recognised as, e.g. "An address on Base", or null. */
  contractLabel: string | null;
  role: Role;
  /** Who the steps were sent to on the technical step, once they have been. */
  handoffTo: string | null;
  /** The name of the contract picked on the contract step, if any. */
  picked: string | null;
}

const looksLikeSite = (w: string) => /\S+\.\S+/.test(w.trim());

export function cerebraLine(c: LineContext): string {
  const first = (c.profile.firstName ?? "").trim();
  const name = c.profile.name.trim();
  const you = first ? `, ${first}` : "";

  if (c.step === "project") {
    // Required fields, in the order they are asked. Cerebra asks for the next one still missing.
    const missing: Array<[string, boolean]> = [
      ["ob-first", !first],
      ["ob-name", !name],
      ["ob-web", !looksLikeSite(c.profile.website)],
      ["ob-sector", !c.profile.sector],
    ];
    const next = missing.find(([, m]) => m)?.[0];
    switch (next) {
      case "ob-first":
        return "Hi, I'm Cerebra. I'll get you set up in about five minutes. First, what's your name?";
      case "ob-name":
        return first
          ? `Nice to meet you${you}! What's your project called?`
          : "What's your project called?";
      case "ob-web":
        return name
          ? `${name}, got it. What's the website?`
          : "What's the project's website?";
      case "ob-sector":
        return "Which sector are you in? It helps me suggest what to track.";
      default: {
        // The required answers are in. Nudge towards the two optional ones still empty.
        const hasContract = c.profile.contract.trim().length > 0;
        const hasDesc = c.profile.description.trim().length > 0;
        const proj = name || "the project";
        if (c.contractLabel && hasContract) {
          return `That looks like ${c.contractLabel
            .charAt(0)
            .toLowerCase()}${c.contractLabel.slice(1)}. I'll index it first.`;
        }
        if (!hasContract && !hasDesc)
          return `That's everything I need${you}. Two optional extras help me more: your contract address, so I can index it first, and a line on what ${proj} does. Or press Continue.`;
        if (!hasContract)
          return `Thanks. Got a contract address too? Paste it and I'll index it first. Or press Continue.`;
        if (!hasDesc)
          return `Nice. One line on what ${proj} does helps me suggest your first Loops. Or press Continue.`;
        return `That's everything${you}. Press Continue when you're ready.`;
      }
    }
  }

  if (c.step === "technical") {
    if (c.role === "builder")
      return `Who's setting up the technical side${you}? If it's you, keep "I am". If not, pick "Someone else is" and I'll email them the steps.`;
    if (c.handoffTo)
      return `Done. ${c.handoffTo} has every step, each with its instructions. Press Continue.`;
    return "Who should get the steps? Type their email and press Send steps. You don't have to wait for them.";
  }

  if (c.step === "dns") {
    if (c.role === "operator")
      return "If you can reach your DNS, add your domain now. If not, skip it: it's in the steps you sent.";
    return "Let's send email from your own domain. Press Generate DNS records and I'll walk you through the rest.";
  }

  if (c.step === "contract") {
    return c.picked
      ? `Found ${c.picked}. I'll start indexing it as soon as your plan is active.`
      : "Paste an address, an explorer link or your website, and I'll find the contract and its events. You can add it later too.";
  }

  // The plan step. PlanPicker owns the size/tier, so Cerebra stays general here.
  return `Pick the plan that fits your list${you}. You won't be charged here, and you can change it any time - you can start building retention campaigns straight away.`;
}
