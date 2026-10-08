/**
 * Constants for the real marketing navbar (ported from the onchainsuite-marketing
 * repo's lib/data). Kept local so the ported <SiteHeader/> has no cross-feature
 * import. Docs point at our canonical docs host (matches the rest of our site).
 */
export const ACCENT = "#1727E0"; // Electric Blue (brand.md primary)
export const ACCENT_HOVER = "#1320B8";
export const APP_URL = "https://app.onchainsuite.com";

const DOCS_URL = "https://docs.onchainsuite.com";

export const DOCS = {
  home: DOCS_URL,
  gettingStarted: `${DOCS_URL}/getting-started/overview`,
  firstCampaign: `${DOCS_URL}/getting-started/send-your-first-campaign`,
  audience: `${DOCS_URL}/audience/overview`,
  campaigns: `${DOCS_URL}/campaigns/overview`,
  automation: `${DOCS_URL}/automation/overview`,
  intelligence: `${DOCS_URL}/intelligence/overview`,
  api: `${DOCS_URL}/api/overview`,
  webhooks: `${DOCS_URL}/api/webhooks`,
  integrations: `${DOCS_URL}/integrations/overview`,
  inAppPush: `${DOCS_URL}/integrations/in-app-notifications`,
  walletData: `${DOCS_URL}/integrations/wallet-and-contract-data`,
  thirdParty: `${DOCS_URL}/integrations/third-party-connections`,
  webhookEvents: `${DOCS_URL}/integrations/webhook-events`,
} as const;
