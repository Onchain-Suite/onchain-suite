import Link from "next/link";

import type { Crumb } from "../utils/breadcrumbs";

/**
 * Where you are, starting from Home (2.7). The sidebar arrow collapses the
 * nav, it does not navigate, so "Home" here is a real link on every page. The
 * page you are on is the last word and is not a link to itself.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-sm text-(--text-secondary)">
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex min-w-0 items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="shrink-0 rounded-sm hover:text-(--text-primary) hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                {crumb.label}
              </Link>
            ) : (
              <b
                aria-current="page"
                className="truncate font-medium text-(--text-primary)"
              >
                {crumb.label}
              </b>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
