import { HeroActions } from "@/onchain-suite-website/components/retention-playbook/hero-actions";
import { HeroVisual } from "@/onchain-suite-website/components/retention-playbook/hero-visual";
import { HERO, UI } from "@/onchain-suite-website/data/retention-playbook";

/** Label, headline, subheadline, the two buttons and the Slipping window. */
export function PlaybookHero({ client }: { client: string | null }) {
  return (
    <section className="rp-hero" aria-labelledby="rp-title">
      <p className="pill rp-eyebrow load">
        {HERO.eyebrow}
        {client && (
          <span>
            {UI.preparedFor} {client}
          </span>
        )}
      </p>
      <h1 className="h1 load" id="rp-title" style={{ animationDelay: ".06s" }}>
        {HERO.title}
      </h1>
      <p className="sub load" style={{ animationDelay: ".12s" }}>
        {HERO.subtitle}
      </p>
      <HeroActions />
      <HeroVisual />
    </section>
  );
}
