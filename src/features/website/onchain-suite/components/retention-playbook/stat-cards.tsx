import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { Stat } from "@/onchain-suite-website/types/retention-playbook";

/** Headline figures, each with its source (linked when we have the URL). */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <ul className="rp-stats">
      {stats.map((s) => (
        <li key={s.figure} className="rp-stat">
          <p className="rp-stat-fig">{s.figure}</p>
          <p className="rp-stat-text">{s.text}</p>
          <p className="rp-stat-src">
            {UI.source}:{" "}
            {s.href ? (
              <a href={s.href} target="_blank" rel="noopener noreferrer">
                {s.source}
              </a>
            ) : (
              s.source
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
