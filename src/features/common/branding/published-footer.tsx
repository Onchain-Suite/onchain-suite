import Image from "next/image";
import Link from "next/link";

/**
 * Branded "Published with OnchainSuite" bar for public, unauthenticated pages -
 * hosted forms (`/f/[token]`) and published dashboards (`/d/[token]`), including
 * when they are served on a workspace subdomain. Links to the marketing site
 * (not the app), the way Dune and TypeForm badge their hosted pages. Server-safe
 * (static image + link, no org/theme state).
 *
 * `tone` lets it sit on either surface: "dark" for the forms page (a hardcoded
 * dark shell), "auto" (default) for the dashboard page (follows the app's
 * light/dark tokens).
 */
export function PublishedFooter({
  tone = "auto",
  className,
}: {
  tone?: "auto" | "dark";
  className?: string;
}) {
  const pill =
    tone === "dark"
      ? "border-white/10 bg-white/5 text-white/50 hover:text-white/90"
      : "border-zinc-200 bg-white/70 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:text-zinc-100";
  return (
    <footer
      className={`flex items-center justify-center py-6 ${className ?? ""}`}
    >
      <Link
        href="https://onchainsuite.com"
        target="_blank"
        rel="noreferrer noopener"
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur transition-colors ${pill}`}
      >
        <Image
          src="/icon-192.png"
          width={16}
          height={16}
          alt=""
          aria-hidden="true"
          className="rounded-sm"
        />
        <span>
          Published with{" "}
          <span
            className={
              tone === "dark"
                ? "font-semibold text-white"
                : "font-semibold text-zinc-900 dark:text-zinc-100"
            }
          >
            OnchainSuite
          </span>
        </span>
      </Link>
    </footer>
  );
}

export default PublishedFooter;
