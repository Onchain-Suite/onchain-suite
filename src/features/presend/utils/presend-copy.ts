import { channelSetupHref } from "@/features/channels/data/channels";
import {
  SETTINGS_ACCOUNT_HREF,
  SETTINGS_SENDER_HREF,
} from "@/features/templates/variable-sources";

/**
 * Short titles and "where to fix it" links per code. The explanation and the
 * fix text come from the backend (`message`, `fix`) and are shown verbatim;
 * this only names the check and points at the page that fixes it.
 */
interface CodeCopy {
  title: string;
  href?: string;
  linkLabel?: string;
}

const DOMAIN_SETUP = channelSetupHref("email");

const COPY: Record<string, CodeCopy> = {
  SENDER_NOT_VERIFIED: {
    title: "Sender not verified",
    href: SETTINGS_SENDER_HREF,
    linkLabel: "Sender addresses",
  },
  DKIM_NOT_PASSING: {
    title: "DKIM is not passing",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  DMARC_MULTIPLE_RECORDS: {
    title: "More than one DMARC record",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  DMARC_MISSING: {
    title: "No DMARC record",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  DMARC_NOT_ENFORCED: {
    title: "DMARC is not enforced",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  SPF_TOO_MANY_LOOKUPS: {
    title: "SPF needs too many lookups",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  MAIL_FROM_NOT_SET: {
    title: "Custom MAIL FROM not set up",
    href: DOMAIN_SETUP,
    linkLabel: "Domain settings",
  },
  UNSUBSCRIBE_HEADERS_UNAVAILABLE: { title: "Unsubscribe headers unavailable" },
  POSTAL_ADDRESS_REQUIRED: {
    title: "Postal address missing",
    href: SETTINGS_ACCOUNT_HREF,
    linkLabel: "Organization settings",
  },
  GMAIL_CLIP: { title: "Gmail will clip this email" },
  URL_SHORTENER: { title: "Link shortener in the email" },
  SEED_PHRASE_REQUEST: { title: "Email asks for a seed phrase or key" },
  CRYPTO_PHISHING_PHRASE: { title: "Phrasing that looks like phishing" },
  NEW_LINK_DOMAIN: { title: "Links to a newly registered domain" },
  NEVER_MAILED_SHARE: { title: "Many recipients never mailed before" },
};

/** "NEW_LINK_DOMAIN" -> "New link domain" for a code this build doesn't know. */
const humanize = (code: string): string => {
  const words = code.toLowerCase().split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const presendCopy = (code: string): CodeCopy =>
  COPY[code] ?? { title: humanize(code) };
