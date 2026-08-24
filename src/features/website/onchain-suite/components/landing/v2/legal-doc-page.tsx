"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";

import "./landing-v2.css";
import type { LegalDoc, LegalTable } from "./legal-content";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";

/** Cross-links shown under every legal document (only the pages we host). */
const OTHER_DOCS: [string, string][] = [
  ["Overview", "/legal"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
  ["Data Processing Agreement", "/dpa"],
  ["Sub-processors", "/subprocessors"],
  ["Security", "/security"],
];

function LegalTableBlock({ table }: { table: LegalTable }) {
  return (
    <div
      className="mt-6 overflow-x-auto rounded-xl border"
      style={{ borderColor: "var(--line)" }}
    >
      <table className="w-full min-w-[560px] border-collapse text-[14px]">
        <thead>
          <tr style={{ background: "var(--acc-soft)" }}>
            {table.cols.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-[13px] font-semibold t-ink"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr
              key={row[0]}
              className="border-t"
              style={{ borderColor: "var(--line)" }}
            >
              {row.map((cell, ci) => (
                <td
                  key={table.cols[ci]}
                  className={`px-4 py-3 align-top ${
                    ci === 0 ? "font-medium t-ink2" : "t-muted"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders a single legal document (Privacy / Terms / DPA / Sub-processors). */
export function LegalDocPage({ doc }: { doc: LegalDoc }) {
  const body: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    const block = doc.blocks[i];
    if (block.t === "li") {
      const items: string[] = [];
      while (i < doc.blocks.length && doc.blocks[i].t === "li") {
        items.push(doc.blocks[i].x ?? "");
        i += 1;
      }
      body.push(
        <ul key={`ul-${i}`} className="mt-3 list-disc space-y-2 pl-5">
          {items.map((x) => (
            <li
              key={x.slice(0, 40)}
              className="text-[15px] leading-relaxed t-muted"
            >
              {x}
            </li>
          ))}
        </ul>
      );
    } else if (block.t === "table" && block.table) {
      body.push(<LegalTableBlock key={`t-${i}`} table={block.table} />);
      i += 1;
    } else if (block.t === "h") {
      body.push(
        <h2
          key={`h-${i}`}
          className="mt-9 text-[18px] font-semibold tracking-tight t-ink"
        >
          {block.x}
        </h2>
      );
      i += 1;
    } else {
      body.push(
        <p key={`p-${i}`} className="mt-3 text-[15px] leading-relaxed t-muted">
          {block.x}
        </p>
      );
      i += 1;
    }
  }

  const others = OTHER_DOCS.filter(([, href]) => href !== `/${doc.slug}`);

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
                Legal
              </div>
              <h1 className="mt-3 text-[34px] font-semibold tracking-tight t-ink sm:text-[44px]">
                {doc.title}
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed t-muted">
                {doc.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-[13.5px] t-muted2">
                  {doc.lastUpdated} ·{" "}
                  <Link
                    href="/legal"
                    className="font-semibold"
                    style={{ color: "var(--acc)" }}
                  >
                    All legal documents
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[13.5px] font-medium t-ink transition-colors hover:border-[color:var(--acc)] hover:text-[color:var(--acc)]"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface)",
                  }}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  Download PDF
                </button>
              </div>
            </Reveal>
            <div className="mt-10">{body}</div>

            {/* Cross-links to the other legal documents. */}
            <div
              className="no-print mt-14 border-t pt-8"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="mono mb-4 text-[11px] uppercase tracking-[0.16em] t-muted2">
                Other documents
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-3">
                {others.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-[14px] font-medium t-acc transition-opacity hover:opacity-80"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default LegalDocPage;
