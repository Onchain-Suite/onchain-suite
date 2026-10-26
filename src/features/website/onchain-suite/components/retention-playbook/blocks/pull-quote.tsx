import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

/**
 * A pull quote: one sentence from the section, set large, so a reader who
 * only skims still meets the claim. The ==underline== markup draws by hand.
 */
export function PullQuote({ segments }: { segments: RichSegment[] }) {
  return (
    <p className="rp-pull">
      <RichText segments={segments} />
    </p>
  );
}
