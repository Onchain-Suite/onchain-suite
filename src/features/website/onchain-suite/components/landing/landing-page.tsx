import { LandingV2 } from "./v2/landing-v2";

/**
 * OnchainSuite marketing landing - v2 "paper + electric blue" design.
 * Faithful adaptation of the reference site (light theme, accent #1727E0,
 * Instrument Sans + JetBrains Mono) with scroll-reveal, marquee, count-up,
 * tilt, and accordion animations. Everything is scoped under `.ocs2`.
 *
 * Section order: Hero (+ product window) → Networks marquee → Problem →
 * Monitor/normalize → Automations → Intelligence → Metrics → Channels →
 * Why (comparison) → Developer SDK → Integrations → Testimonials → FAQ → CTA.
 */
export function LandingPage() {
  return <LandingV2 />;
}

export default LandingPage;
