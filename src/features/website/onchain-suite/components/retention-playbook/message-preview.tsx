"use client";

import { useState } from "react";

import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { ExampleMessage } from "@/onchain-suite-website/types/retention-playbook";

type View = "email" | "in-app";

/**
 * An example message as a realistic inbox preview. Messages sent "in-app and
 * email" get a toggle between the email view and a phone-sized in-app view.
 * The call to action is a mock button, so it is not focusable.
 */
export function MessagePreview({ example }: { example: ExampleMessage }) {
  const [view, setView] = useState<View>("email");
  const hasInApp = example.channels === "in-app-and-email";

  return (
    <figure className="rp-msg">
      <div className="rp-msg-top">
        <figcaption className="rp-msg-type">{example.type}</figcaption>
        {hasInApp && (
          <div className="seg sm" role="group" aria-label={UI.messageView}>
            {(["email", "in-app"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v === "email" ? UI.email : UI.inApp}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "email" ? (
        <div className="rp-mail">
          <div className="rp-mail-bar" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <dl className="rp-mail-head">
            <div>
              <dt>{UI.subject}</dt>
              <dd className="rp-mail-subject">{example.subject}</dd>
            </div>
            <div>
              <dt>{UI.preview}</dt>
              <dd className="rp-mail-preview">{example.preview}</dd>
            </div>
          </dl>
          <div className="rp-mail-body">
            {example.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <span className="rp-mock-btn">{example.action}</span>
          </div>
        </div>
      ) : (
        <div className="rp-phone">
          <div className="rp-phone-screen">
            <span className="rp-phone-notch" aria-hidden="true" />
            <span className="rp-phone-app" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <div className="rp-inapp">
              <p className="rp-inapp-title">{example.subject}</p>
              {example.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <span className="rp-mock-btn">{example.action}</span>
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
