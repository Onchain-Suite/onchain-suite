import type { Metadata } from "next";

import { generateMetadata as rootMetadata } from "./metadata";
import { SITE_CONFIG_META } from "./site";

type Title = Metadata["title"];

/** The title as the browser tab shows it, for og:title / twitter:title, which
 * the layout's "%s · OnchainSuite" template does not reach. */
function socialTitle(title: Title): string | undefined {
  if (!title) return undefined;
  if (typeof title === "string") return `${title} · ${SITE_CONFIG_META.name}`;
  if ("absolute" in title && title.absolute) return title.absolute;
  if ("default" in title && title.default) return title.default;
  return undefined;
}

/**
 * Page metadata with this page's own canonical and og:url.
 *
 * Next.js replaces a parent's `openGraph` and `twitter` objects rather than
 * merging them, so a page that sets either would otherwise lose the site name
 * and share image from the root layout. This re-merges the root values, then
 * fills og/twitter title and description from the page's own, then applies any
 * `openGraph` / `twitter` the page passes, and finally pins `url` to `path`.
 *
 * `path` is relative ("/pricing"); `metadataBase` in the root layout turns it
 * into https://www.onchainsuite.com/pricing.
 */
export function pageMeta(path: string, m: Metadata = {}): Metadata {
  const root = rootMetadata();
  const title = socialTitle(m.title);
  const description = m.description ?? undefined;
  const fromPage = {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
  return {
    ...m,
    alternates: { ...m.alternates, canonical: path },
    openGraph: {
      ...root.openGraph,
      ...fromPage,
      ...m.openGraph,
      url: path,
    } as Metadata["openGraph"],
    twitter: {
      ...root.twitter,
      ...fromPage,
      ...m.twitter,
    } as Metadata["twitter"],
  };
}
