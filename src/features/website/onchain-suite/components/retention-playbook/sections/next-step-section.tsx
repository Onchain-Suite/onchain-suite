import { SectionShell } from "@/onchain-suite-website/components/retention-playbook/section-shell";
import { WalkthroughButton } from "@/onchain-suite-website/components/retention-playbook/walkthrough-button";
import { NEXT_STEP } from "@/onchain-suite-website/data/retention-playbook";

/** Closing call to action. */
export function NextStepSection() {
  return (
    <SectionShell id={NEXT_STEP.id} title={NEXT_STEP.title} className="rp-next">
      <p className="rp-p rp-next-text">{NEXT_STEP.text}</p>
      <WalkthroughButton section="next-step" size="large" />
    </SectionShell>
  );
}
