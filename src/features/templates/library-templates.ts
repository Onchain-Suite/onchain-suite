import {
  ONCHAIN_VARIABLES,
  type OnchainVariable,
  withMergeTagDefaults,
} from "./onchain-variables";

/**
 * Built-in, production-grade email templates for the Email Library.
 *
 * Design language: OnchainSuite brand - electric blue on a light "paper"
 * canvas. HTML is table-based, 600px, inline-styled, and responsive so it
 * renders across Gmail, Apple Mail, and Outlook. All copy uses onchain merge
 * variables ({{ ens_name }}, {{ wallet_short }}, …) so protocols can send
 * personalized messages off wallet data.
 *
 * These are the source of truth for both the seed-to-backend action in the
 * Email Library and the fallback options in the automation Send-email action.
 */

export interface LibraryEmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  /** Short human blurb shown in the library. */
  description: string;
  /** Full, self-contained HTML document. */
  html: string;
  /** Plain-text fallback. */
  text: string;
  /** Variable keys referenced by this template. */
  variables: string[];
}

/* ------------------------------------------------------------------ */
/* Brand tokens (kept in one place so every template stays consistent) */
/* ------------------------------------------------------------------ */

const BRAND = {
  ink: "#0E1120",
  body: "#4A5169",
  muted: "#8A91A8",
  primary: "#4F63FF",
  primaryDark: "#3B4CE0",
  accent: "#22D3EE",
  paper: "#F4F5FB",
  card: "#FFFFFF",
  border: "#E7E9F4",
  soft: "#F0F2FB",
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Bulletproof rounded CTA button. */
function button(label: string, url = "#", opts: { subtle?: boolean } = {}) {
  const bg = opts.subtle ? BRAND.soft : BRAND.primary;
  const color = opts.subtle ? BRAND.primary : "#FFFFFF";
  const border = opts.subtle ? BRAND.border : BRAND.primary;
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:12px;">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;letter-spacing:0.01em;color:${color};text-decoration:none;border:1px solid ${border};border-radius:12px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

/** A labelled onchain "chip" (used for wallet / chain badges). */
function chip(label: string) {
  return `<span style="display:inline-block;padding:6px 12px;margin:0 4px 6px 0;font-family:${FONT};font-size:12px;font-weight:600;color:${BRAND.primary};background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:999px;">${label}</span>`;
}

/**
 * Wrap body content in the shared OnchainSuite chrome (preheader, header
 * wordmark, card, footer with unsubscribe).
 */
function shell(opts: { preheader: string; eyebrow: string; bodyHtml: string }) {
  const { preheader, eyebrow, bodyHtml } = opts;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>{{ protocol }}</title>
  <style>
    body { margin:0; padding:0; width:100% !important; background:${BRAND.paper}; }
    a { color:${BRAND.primary}; }
    .wrapper { width:100%; background:${BRAND.paper}; }
    .container { width:600px; max-width:600px; }
    .px { padding-left:40px; padding-right:40px; }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .px { padding-left:24px !important; padding-right:24px !important; }
      .h1 { font-size:26px !important; line-height:32px !important; }
      .stack { display:block !important; width:100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${preheader}</div>
  <table role="presentation" class="wrapper" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;">
          <!-- Header -->
          <tr>
            <td class="px" style="padding:8px 40px 20px 40px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="font-family:${FONT};">
                    <span style="display:inline-block;width:26px;height:26px;vertical-align:middle;margin-right:10px;border-radius:8px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});"></span>
                    <span style="vertical-align:middle;font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Onchain</span><span style="vertical-align:middle;font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.primary};">Suite</span>
                  </td>
                  <td align="right" style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted};">
                    ${eyebrow}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="padding:0 0 8px 0;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;">
                ${bodyHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="px" style="padding:22px 40px 8px 40px;font-family:${FONT};">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:20px;color:${BRAND.muted};">
                You're receiving this because your wallet
                <span style="color:${BRAND.body};font-weight:600;">{{ wallet_short }}</span>
                interacted with {{ protocol }} on {{ chain }}.
              </p>
              <p style="margin:0 0 14px 0;font-size:12px;line-height:20px;color:${BRAND.muted};">
                <a href="{{ unsubscribe_url }}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="#" style="color:${BRAND.muted};text-decoration:underline;">Manage preferences</a>
                &nbsp;·&nbsp;
                <a href="#" style="color:${BRAND.muted};text-decoration:underline;">View onchain</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:18px;color:${BRAND.muted};">
                {{ protocol }} · Sent with Onchain Suite
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Standard card padding row. */
function pad(inner: string, top = 36) {
  return `<tr><td class="px" style="padding:${top}px 40px 36px 40px;font-family:${FONT};">${inner}</td></tr>`;
}

/** Accent banner strip at the top of a card. */
function banner(text: string) {
  return `<tr><td style="padding:0;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});padding:14px 24px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#EAF0FF;">${text}</td></tr>
    </table>
  </td></tr>`;
}

const h1 = (t: string) =>
  `<h1 class="h1" style="margin:0 0 14px 0;font-size:30px;line-height:36px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">${t}</h1>`;
const p = (t: string) =>
  `<p style="margin:0 0 18px 0;font-size:16px;line-height:26px;color:${BRAND.body};">${t}</p>`;
const small = (t: string) =>
  `<p style="margin:0 0 8px 0;font-size:13px;line-height:20px;color:${BRAND.muted};">${t}</p>`;

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const productUpdate: LibraryEmailTemplate = {
  id: "lib-product-update",
  name: "Product Update",
  category: "Product",
  subject: "New in {{ protocol }}: features built for {{ ens_name }}",
  previewText: "Faster onchain flows, smarter alerts, and more.",
  description:
    "Announce a release with a hero headline, three feature highlights, and a primary CTA.",
  variables: ["protocol", "ens_name", "chain"],
  html: shell({
    preheader: "Faster onchain flows, smarter alerts, and more.",
    eyebrow: "Product update",
    bodyHtml: [
      banner("What's new"),
      pad(
        [
          h1("Big upgrades just shipped, {{ ens_name }}"),
          p(
            "We've been building. Here's what's new in {{ protocol }} this cycle - designed to make your onchain workflow faster and clearer."
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:6px 0 24px 0;">
            ${[
              "Real-time alerts",
              "Wallet-level insights",
              "1-click automations",
            ]
              .map(
                (title, i) => `
              <tr>
                <td style="padding:14px 0;border-top:1px solid ${BRAND.border};font-family:${FONT};">
                  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:${BRAND.soft};color:${BRAND.primary};font-weight:800;font-size:13px;vertical-align:middle;margin-right:12px;">${i + 1}</span>
                  <span style="vertical-align:middle;font-size:15px;font-weight:700;color:${BRAND.ink};">${title}</span>
                </td>
              </tr>`
              )
              .join("")}
          </table>`,
          button("See what's new", "#"),
        ].join("")
      ),
    ].join(""),
  }),
  text: "Big upgrades just shipped, {{ ens_name }}. Here's what's new in {{ protocol }}: real-time alerts, wallet-level insights, and 1-click automations. See what's new: #",
};

const winback: LibraryEmailTemplate = {
  id: "lib-winback",
  name: "Winback Campaign",
  category: "Re-engagement",
  subject: "We saved your spot, {{ ens_name }}",
  previewText: "Your wallet's been quiet - here's a reason to come back.",
  description:
    "Re-engage dormant wallets with a warm headline, a personalized nudge, and an incentive.",
  variables: ["ens_name", "wallet_short", "protocol", "token_symbol", "amount"],
  html: shell({
    preheader: "Your wallet's been quiet - here's a reason to come back.",
    eyebrow: "We miss you",
    bodyHtml: [
      pad(
        [
          h1("It's been a while, {{ ens_name }}"),
          p(
            `Your wallet <strong style="color:${
              BRAND.ink
            }">{{ wallet_short }}</strong> hasn't interacted with {{ protocol }} recently. A lot has changed - and we'd love to have you back.`
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:6px 0 22px 0;background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:16px;">
            <tr><td style="padding:22px 24px;font-family:${FONT};text-align:center;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">A welcome-back reward</div>
              <div style="margin-top:6px;font-size:30px;font-weight:800;color:${BRAND.primary};">{{ amount }} {{ token_symbol }}</div>
              <div style="margin-top:4px;font-size:13px;color:${BRAND.body};">Claimable when you return this week.</div>
            </td></tr>
          </table>`,
          button("Claim &amp; come back", "#"),
          `<div style="margin-top:14px;">${small("No pressure - this offer is tied to your wallet and waiting whenever you're ready.")}</div>`,
        ].join("")
      ),
    ].join(""),
  }),
  text: "It's been a while, {{ ens_name }}. Your wallet {{ wallet_short }} hasn't interacted with {{ protocol }} recently. Come back this week and claim {{ amount }} {{ token_symbol }}.",
};

const newsletter: LibraryEmailTemplate = {
  id: "lib-weekly-newsletter",
  name: "Weekly Newsletter",
  category: "Newsletter",
  subject: "This week onchain, {{ ens_name }}",
  previewText: "The 3 things worth your attention in {{ protocol }} this week.",
  description:
    "A clean digest layout: intro, three linked stories, and a stat callout.",
  variables: ["ens_name", "protocol", "chain"],
  html: shell({
    preheader: "The 3 things worth your attention this week.",
    eyebrow: "Weekly digest",
    bodyHtml: [
      pad(
        [
          h1("This week onchain"),
          p(
            "Hey {{ ens_name }} - here's your weekly digest from {{ protocol }}, distilled to what actually matters."
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            ${[
              {
                t: "Governance vote closes Friday",
                d: "Proposal OCS-42 is live. Your voting power is tied to your {{ chain }} balance.",
              },
              {
                t: "New integrations shipped",
                d: "Three protocols joined the network this week - bridging just got cheaper.",
              },
              {
                t: "Onchain metric of the week",
                d: "Active wallets are up 18% week-over-week across supported chains.",
              },
            ]
              .map(
                (s, i) => `
              <tr><td style="padding:18px 0;${i === 0 ? "" : `border-top:1px solid ${BRAND.border};`}font-family:${FONT};">
                <div style="font-size:12px;font-weight:700;color:${BRAND.primary};letter-spacing:0.08em;text-transform:uppercase;">0${i + 1}</div>
                <a href="#" style="display:block;margin-top:6px;font-size:17px;font-weight:700;color:${BRAND.ink};text-decoration:none;">${s.t}</a>
                <div style="margin-top:6px;font-size:14px;line-height:22px;color:${BRAND.body};">${s.d}</div>
              </td></tr>`
              )
              .join("")}
          </table>
          <div style="margin-top:24px;">${button("Read the full digest", "#", { subtle: true })}</div>`,
        ].join("")
      ),
    ].join(""),
  }),
  text: "This week onchain, {{ ens_name }}. Your weekly digest from {{ protocol }}: governance vote closes Friday, new integrations shipped, and active wallets up 18%. Read the full digest: #",
};

const airdrop: LibraryEmailTemplate = {
  id: "lib-airdrop-alert",
  name: "Airdrop Alert",
  category: "Promotional",
  subject:
    "You're eligible, {{ ens_name }} - claim {{ amount }} {{ token_symbol }}",
  previewText: "Your wallet qualified. Claim before the window closes.",
  description:
    "High-urgency claim email with an allocation callout, wallet badges, and a countdown line.",
  variables: [
    "ens_name",
    "wallet_short",
    "protocol",
    "chain",
    "token_symbol",
    "amount",
  ],
  html: shell({
    preheader: "Your wallet qualified. Claim before the window closes.",
    eyebrow: "Airdrop",
    bodyHtml: [
      banner("You're eligible"),
      pad(
        [
          h1("Your allocation is ready, {{ ens_name }}"),
          p(
            "Based on your onchain activity, your wallet qualified for the {{ protocol }} distribution."
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 20px 0;background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});border-radius:18px;">
            <tr><td style="padding:26px 24px;text-align:center;font-family:${FONT};">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C9D4FF;">Your allocation</div>
              <div style="margin-top:8px;font-size:40px;line-height:44px;font-weight:800;color:#FFFFFF;">{{ amount }} {{ token_symbol }}</div>
            </td></tr>
          </table>`,
          `<div style="text-align:center;margin-bottom:20px;">${chip("Wallet: {{ wallet_short }}")}${chip("Network: {{ chain }}")}</div>`,
          button("Claim your airdrop", "#"),
          `<div style="margin-top:16px;text-align:center;">${small("⏳ The claim window closes in 72 hours. Unclaimed tokens are returned to the treasury.")}</div>`,
        ].join("")
      ),
    ].join(""),
  }),
  text: "You're eligible, {{ ens_name }}. Your wallet {{ wallet_short }} qualified for the {{ protocol }} distribution: {{ amount }} {{ token_symbol }} on {{ chain }}. Claim within 72 hours: #",
};

const vip: LibraryEmailTemplate = {
  id: "lib-vip-announcement",
  name: "VIP Announcement",
  category: "VIP",
  subject: "A private invite for {{ ens_name }}",
  previewText: "You're in the top tier. Here's something exclusive.",
  description:
    "An elevated, invite-only announcement with a refined header and a single decisive CTA.",
  variables: ["ens_name", "protocol", "wallet_short"],
  html: shell({
    preheader: "You're in the top tier. Here's something exclusive.",
    eyebrow: "Invitation",
    bodyHtml: [
      pad(
        [
          `<div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:10px;">Members only</div>`,
          h1("You're invited, {{ ens_name }}"),
          p(
            "As one of {{ protocol }}'s most active members, you're getting first access - before this goes out to anyone else."
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:6px 0 22px 0;border:1px solid ${BRAND.border};border-radius:16px;">
            <tr><td style="padding:22px 24px;font-family:${FONT};">
              <div style="font-size:15px;font-weight:700;color:${BRAND.ink};">Onchain VIP access</div>
              <ul style="margin:12px 0 0 0;padding-left:18px;color:${BRAND.body};font-size:14px;line-height:24px;">
                <li>Early feature drops &amp; private betas</li>
                <li>Priority allocation on new launches</li>
                <li>A direct line to the core team</li>
              </ul>
            </td></tr>
          </table>`,
          button("Accept your invitation", "#"),
          `<div style="margin-top:14px;">${small("Reserved for {{ wallet_short }}. This invite is non-transferable.")}</div>`,
        ].join("")
      ),
    ].join(""),
  }),
  text: "You're invited, {{ ens_name }}. As one of {{ protocol }}'s most active members you're getting first access to Onchain VIP: early drops, priority allocation, and a direct line to the team. Accept: #",
};

const welcome: LibraryEmailTemplate = {
  id: "lib-welcome-series",
  name: "Welcome Series",
  category: "Onboarding",
  subject: "Welcome to {{ protocol }}, {{ ens_name }} 👋",
  previewText: "Three quick steps to get the most out of your wallet.",
  description:
    "Onboarding email #1: warm welcome, a 3-step getting-started checklist, and a CTA.",
  variables: ["ens_name", "protocol", "wallet_short", "chain"],
  html: shell({
    preheader: "Three quick steps to get the most out of your wallet.",
    eyebrow: "Welcome",
    bodyHtml: [
      banner("Welcome aboard"),
      pad(
        [
          h1("Welcome to {{ protocol }}, {{ ens_name }}"),
          p(
            `Your wallet <strong style="color:${
              BRAND.ink
            }">{{ wallet_short }}</strong> is connected on {{ chain }}. Here are three quick things to get you started.`
          ),
          `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 22px 0;">
            ${[
              {
                t: "Set your alerts",
                d: "Tell us which onchain events matter and we'll ping you the moment they happen.",
              },
              {
                t: "Explore your dashboard",
                d: "See your activity, holdings, and eligibility in one place.",
              },
              {
                t: "Join the community",
                d: "Governance, updates, and early drops all start in the community.",
              },
            ]
              .map(
                (s, i) => `
              <tr><td style="padding:16px 0;${i === 0 ? "" : `border-top:1px solid ${BRAND.border};`}font-family:${FONT};">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
                  <td valign="top" style="width:42px;">
                    <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});color:#fff;font-weight:800;font-size:14px;">${i + 1}</span>
                  </td>
                  <td valign="top" style="font-family:${FONT};">
                    <div style="font-size:15px;font-weight:700;color:${BRAND.ink};">${s.t}</div>
                    <div style="margin-top:4px;font-size:14px;line-height:22px;color:${BRAND.body};">${s.d}</div>
                  </td>
                </tr></table>
              </td></tr>`
              )
              .join("")}
          </table>`,
          button("Open my dashboard", "#"),
        ].join("")
      ),
    ].join(""),
  }),
  text: "Welcome to {{ protocol }}, {{ ens_name }}. Your wallet {{ wallet_short }} is connected on {{ chain }}. Get started: set your alerts, explore your dashboard, and join the community. Open my dashboard: #",
};

export const LIBRARY_EMAIL_TEMPLATES: LibraryEmailTemplate[] = [
  productUpdate,
  winback,
  newsletter,
  airdrop,
  vip,
  welcome,
];

export const LIBRARY_TEMPLATE_VARIABLES: OnchainVariable[] = ONCHAIN_VARIABLES;

/**
 * Build the POST body used to seed a library template into the backend.
 * The `content` container mirrors the shape `extractEmailContent` reads back,
 * so a seeded template round-trips (html + preview + subject all recoverable).
 */
export function buildTemplateSeedPayload(template: LibraryEmailTemplate): {
  name: string;
  folder?: string;
  content: Record<string, unknown>;
} {
  return {
    name: template.name,
    content: {
      // Bake safe defaults into every merge tag so the template can be sent
      // to any audience - unresolved variables without a default block the
      // send at validation.
      html: withMergeTagDefaults(template.html),
      text: withMergeTagDefaults(template.text),
      subject: template.subject,
      previewText: template.previewText,
      category: template.category,
      description: template.description,
      variables: template.variables,
      source: "onchain-suite-library",
      access: "public",
      isPublic: true,
    },
  };
}
