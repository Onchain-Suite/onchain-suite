"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";
import { trackPlaybookEvent } from "@/onchain-suite-website/utils/playbook-analytics";
import { playbookPdfPath } from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * The button under a strategy's title: download this page as a PDF. The file
 * is static, exported by scripts/export-playbook-pdfs.sh, so this is a plain
 * link with the download attribute, counted when pressed.
 */
export function PdfButton({ category }: { category: CategoryId }) {
  return (
    <a
      href={playbookPdfPath(category)}
      download
      className="btn lg rp-pdf-btn"
      onClick={() =>
        trackPlaybookEvent({
          name: "retention_playbook_pdf_download",
          category,
        })
      }
    >
      <ArrowDownTrayIcon className="rp-icon-sm" aria-hidden="true" />
      {UI.downloadPdf}
    </a>
  );
}
