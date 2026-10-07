import type { FC, ReactNode } from "react";

/* Types for the vendored redesign bundle (site-bundle.jsx). The .jsx is compiled
   by SWC and excluded from tsc + eslint; this shim types the exports we wire.
   `*Body` exports are the page contents WITHOUT the bundle's own chrome, so we
   can render them inside the retained legacy PageShell (old nav + footer). */
export const Home: FC;
export const HomeBody: FC;
export const HomeMotion: FC;
export const SiteChrome: FC<{ children?: ReactNode }>;
export const PricingPage: FC;
export const PricingBody: FC;
export const CompareHub: FC;
export const ComparePage: FC<{ params: { slug: string } }>;
declare const App: FC;
export default App;
