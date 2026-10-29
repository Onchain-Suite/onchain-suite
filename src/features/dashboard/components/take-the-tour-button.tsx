"use client";

import { startTour } from "@/features/onboarding/hooks/use-tour";
import { CerebraMark } from "@/features/onboarding-flow/components/guided/cerebra-mark";

/**
 * Empty-workspace home CTA: the way back into Cerebra's tour once it is
 * dismissed (and the first nudge toward it). Mirrors the 2.7 `.home__tour`
 * button. The CerebraMark glyph ties the CTA to the guide the tour uses.
 */
export function TakeTheTourButton() {
  return (
    <button
      type="button"
      onClick={startTour}
      className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CerebraMark face size={18} track={false} className="text-primary" />
      Take the tour with Cerebra
    </button>
  );
}
