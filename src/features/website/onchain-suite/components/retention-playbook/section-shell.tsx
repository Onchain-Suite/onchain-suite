import type { ReactNode } from "react";

/**
 * One numbered proposal section. The heading takes focus after an in-page
 * jump (data-jump-focus), so keyboard and screen reader users land on it.
 */
export function SectionShell({
  id,
  number,
  title,
  aside,
  className = "",
  children,
}: {
  id: string;
  number?: number;
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-h`;
  return (
    <section
      id={id}
      className={`rp-sec ${className}`}
      aria-labelledby={headingId}
    >
      <div className="rp-sec-head">
        <h2 className="rp-h2" id={headingId} tabIndex={-1} data-jump-focus>
          {number !== undefined && <span className="rp-h2-n">{number}.</span>}{" "}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
