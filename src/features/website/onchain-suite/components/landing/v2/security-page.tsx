"use client";

import {
  ChatBubbleLeftRightIcon,
  FingerPrintIcon,
  KeyIcon,
  NoSymbolIcon,
  ShieldExclamationIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";

const SUPPORT_EMAIL = "info@onchainsuite.com";

/**
 * Target of the "Learn more about security" link in the onboarding security
 * banner. Keep the anti-phishing promise here identical to the banner copy —
 * this page is what people check when they are trying to decide whether a
 * message claiming to be us is real.
 */
const SECTIONS = [
  {
    id: "never-ask",
    icon: NoSymbolIcon,
    title: "What we will never ask for",
    body: "OnchainSuite will never call, email, or text you asking for your password, a one-time passcode, a 2FA code, or a wallet seed phrase or private key. No one from our team needs any of these to help you, and we will never ask you to share your screen while you enter them. Any message that asks for one is not from us — no matter what the sender name, logo, or reply address looks like.",
  },
  {
    id: "how-we-contact-you",
    icon: ChatBubbleLeftRightIcon,
    title: "How we actually contact you",
    body: "Product and account email from us is sent from an onchainsuite.com address. We will never ask you to move the conversation to a personal phone number, a DM, or a chat app to resolve an account issue. If a message pressures you to act immediately, threatens to suspend your account within minutes, or sends you to a login page over a shortened link, treat it as a phishing attempt and check with us first.",
  },
  {
    id: "wallets",
    icon: WalletIcon,
    title: "Wallets stay non-custodial",
    body: "OnchainSuite monitors on-chain activity read-only and is non-custodial: we never take custody of funds and never need your seed phrase or private key. We will never ask you to approve a transaction, sign a message, or connect a hardware wallet in order to 'verify', 'restore', or 'unlock' your account. A request like that is always fraudulent, even if it appears inside a page that otherwise looks like ours.",
  },
  {
    id: "secure-your-account",
    icon: KeyIcon,
    title: "Securing your account",
    body: "Use a long, unique password that you do not reuse anywhere else, and add a passkey from Settings → Profile → Security. A passkey is bound to this site, so a lookalike domain cannot phish it even if the page looks identical. Change your password straight away if you think anyone else has seen it. If you share an organisation with teammates, review member access periodically and remove people who no longer need it.",
  },
  {
    id: "identity-linking",
    icon: FingerPrintIcon,
    title: "How contact data is handled",
    body: "Personal channels such as email are linked to a wallet only when that wallet opts in through a zero-knowledge identity bridge, so we never hold data a wallet has not chosen to share. Contact identifiers are encrypted and blind-indexed on our side. See the legal page for the full privacy, terms, and compliance picture.",
  },
  {
    id: "report",
    icon: ShieldExclamationIcon,
    title: "Report something suspicious",
    body: `If you receive a message you think is impersonating OnchainSuite, or you believe your account has been accessed by someone else, email ${SUPPORT_EMAIL} and change your password straight away. Forward the suspicious message rather than acting on it, and include the sender address and any links exactly as you received them.`,
  },
];

export function SecurityPage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden pb-8 pt-16 md:pt-20">
        <div className="grid-bg" />
        <div className="wrap relative max-w-3xl">
          <Reveal>
            <span className="eyebrow">Security</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1
              className="mt-5 font-semibold tracking-tight"
              style={{
                fontSize: "clamp(2.1rem, 4.4vw, 3rem)",
                lineHeight: 1.08,
              }}
            >
              Staying <span className="grad">safe.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed t-muted">
              How to tell a real message from us apart from a phishing attempt,
              and how to keep your account and wallet secure. Something look
              wrong? Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium t-acc hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-20">
        <div className="wrap max-w-3xl space-y-5">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.id} delay={i * 0.08}>
                <article id={s.id} className="card scroll-mt-28 p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: "var(--acc-soft)",
                        color: "var(--acc)",
                      }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="text-[19px] font-semibold t-ink">
                      {s.title}
                    </h2>
                  </div>
                  <p className="mt-4 text-[14.5px] leading-relaxed t-muted">
                    {s.body}
                  </p>
                </article>
              </Reveal>
            );
          })}
          <Reveal delay={0.1}>
            <p className="pt-2 text-center text-[12.5px] t-muted2">
              Read the{" "}
              <a href="/legal" className="font-medium t-acc hover:underline">
                legal &amp; compliance
              </a>{" "}
              page for privacy, terms, and compliance · ©{" "}
              {new Date().getFullYear()} OnchainSuite Incorporated
            </p>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default SecurityPage;
