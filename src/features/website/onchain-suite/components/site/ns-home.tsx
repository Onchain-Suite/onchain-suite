import { NsShell } from "./ns-shell";
import { HomeBody, HomeMotion } from "./site-bundle";

/**
 * Redesigned marketing home ("ns" design) under the retained legacy navbar.
 * Phase 1 of the site redesign.
 */
export function NsHome() {
  return (
    <NsShell>
      <HomeBody />
      <HomeMotion />
    </NsShell>
  );
}

export default NsHome;
