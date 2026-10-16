import { NsShell } from "./ns-shell";
import { ComparePage } from "./site-bundle";

/** Redesigned per-competitor compare page ("ns") under the retained legacy
 *  navbar. The slug is resolved by the route; the bundle renders the content. */
export function NsComparePage({ slug }: { slug: string }) {
  return (
    <NsShell>
      <ComparePage params={{ slug }} />
    </NsShell>
  );
}

export default NsComparePage;
