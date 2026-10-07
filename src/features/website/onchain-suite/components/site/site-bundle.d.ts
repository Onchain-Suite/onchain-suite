import type { FC, ReactNode } from "react";

/* Types for the vendored redesign bundle (site-bundle.jsx). The .jsx is compiled
   by SWC and excluded from tsc + eslint; this shim types the exports we wire. */
export const Home: FC;
export const SiteChrome: FC<{ children?: ReactNode }>;
declare const App: FC;
export default App;
