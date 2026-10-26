"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

import { UI } from "@/onchain-suite-website/data/retention-playbook";
import { trackPlaybookEvent } from "@/onchain-suite-website/utils/playbook-analytics";

/**
 * The button under a strategy's title: download this page as a PDF. The file
 * is static, exported by scripts/export-playbook-pdfs.sh, so this is a plain
 * link with the download attribute, counted when pressed.
 */
export function PdfButton({
  href,
  strategy,
}: {
  href: string;
  /** The chapter id, for the download count. */
  strategy: string;
}) {
  return (
    <a
      href={href}
      download
      className="btn lg rp-pdf-btn"
      onClick={() =>
        trackPlaybookEvent({
          name: "retention_playbook_pdf_download",
          strategy,
        })
      }
    >
      <ArrowDownTrayIcon className="rp-icon-sm" aria-hidden="true" />
      {UI.downloadPdf}
    </a>
  );
}
