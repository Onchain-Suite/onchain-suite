import { ArrowRightIcon } from "@heroicons/react/20/solid";

import {
  HERO,
  HERO_LOOP as LOOP,
  STAGES,
  UI,
} from "@/onchain-suite-website/data/retention-playbook";

/**
 * The hero picture, framed like the home page's product window: the six
 * stages with At risk lit, and the Slipping Loop that acts there. Built from
 * sections 3 and 4, so it shows the real mechanism rather than a mock metric.
 * One image to assistive tech, described by HERO.visual.label.
 */
export function HeroVisual() {
  const steps = [
    { label: UI.startsWhen, text: LOOP.startsWhen },
    { label: UI.sends, text: LOOP.sends },
    { label: UI.stopsWhen, text: LOOP.stopsWhen },
  ];

  return (
    <div
      className="stage rp-hero-stage load"
      style={{ animationDelay: ".26s" }}
    >
      <div className="win" role="img" aria-label={HERO.visual.label}>
        <div className="winbar">
          <i />
          <i />
          <i />
        </div>
        <div className="rp-win-body">
          <ol className="rp-mini-stages">
            {STAGES.map((s) => (
              <li
                key={s.name}
                className={`tone-${s.tone}${s.name === HERO.visual.stage ? " is-on" : ""}`}
              >
                <span className="rp-mini-dot" />
                <span className="rp-mini-name">{s.name}</span>
              </li>
            ))}
          </ol>
          <div className="rp-hero-loop">
            <p className="rp-hero-loop-name">
              <span className="tag">{HERO.visual.loopTag}</span>
              {LOOP.name}
            </p>
            <ol className="rp-flow">
              {steps.map((step, i) => (
                <li key={step.label} className="rp-flow-step">
                  <span className="rp-flow-k">{step.label}</span>
                  <span className="rp-flow-v">{step.text}</span>
                  {i < steps.length - 1 && (
                    <ArrowRightIcon className="rp-flow-arrow" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
