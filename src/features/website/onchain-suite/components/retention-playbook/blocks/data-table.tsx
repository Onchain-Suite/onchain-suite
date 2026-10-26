import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

/**
 * A plain data table. The first cell of each row is its row header. On phones
 * each row becomes a card and every cell shows its column name (data-label).
 */
export function DataTable({
  head,
  rows,
}: {
  head: string[];
  rows: RichSegment[][][];
}) {
  return (
    <div className="rp-table-wrap">
      <table className="rp-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = row[0].map((s) => s.text).join("");
            return (
              <tr key={rowKey}>
                {row.map((cell, ci) =>
                  ci === 0 ? (
                    <th key={head[ci]} scope="row" data-label={head[ci]}>
                      <RichText segments={cell} />
                    </th>
                  ) : (
                    <td key={head[ci]} data-label={head[ci]}>
                      <RichText segments={cell} />
                    </td>
                  )
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
