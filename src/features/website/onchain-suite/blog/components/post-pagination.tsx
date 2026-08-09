import Link from "next/link";

/**
 * Prev/next pagination. Uses real links (not buttons) so pages are crawlable
 * and work without JS — which is also why this stays a Server Component.
 */
export function PostPagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  // Page 1 is the canonical bare path; ?page=1 would be a duplicate URL.
  const href = (target: number) =>
    target <= 1 ? basePath : `${basePath}?page=${target}`;

  return (
    <nav
      className="mt-10 flex items-center justify-between"
      aria-label="Blog pagination"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost" rel="prev">
          ← Newer
        </Link>
      ) : (
        <span />
      )}

      <span className="text-[13px] t-muted2">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn btn-ghost" rel="next">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
