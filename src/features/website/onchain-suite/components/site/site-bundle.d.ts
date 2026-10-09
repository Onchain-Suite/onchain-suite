import type { FC, ReactNode } from "react";

/* Types for the vendored redesign bundle (site-bundle.jsx). The .jsx is compiled
   by SWC and excluded from tsc + eslint; this shim types the exports we wire.
   Pages render their body inside SiteChrome (the redesign's own navbar + footer
   + motion) via NsShell; the `*Body` exports are the page contents without the
   bundle's App-level routing wrapper. */
export const Home: FC;
export const HomeBody: FC;
export const HomeMotion: FC;
export const SiteChrome: FC<{ children?: ReactNode }>;
export const PricingPage: FC;
export const PricingBody: FC;
export const CompareHub: FC;
export const ComparePage: FC<{ params: { slug: string } }>;
// Platform pages: each is a full ProductPage that brings its own SiteChrome.
export const AudiencePage: FC;
export const SegmentsPage: FC;
export const LoopsPage: FC;
export const McpPage: FC;
export const DataPage: FC;
// Legal pages: each is a full LegalShell that brings its own SiteChrome.
export const LegalPage: FC;
export const PrivacyPage: FC;
export const TermsPage: FC;
export const DpaPage: FC;
export const CookiesPage: FC;
export const SubprocessorsPage: FC;
export const DataTransfersPage: FC;
declare const App: FC;
export default App;
