import { WalkthroughButton } from "./walkthrough-button";

/** The hero's one button: book a walkthrough. */
export function HeroActions() {
  return (
    <div className="ctas rp-hero-ctas load" style={{ animationDelay: ".18s" }}>
      <WalkthroughButton section="hero" size="hero" />
    </div>
  );
}
