"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { TocList } from "./toc-list";
import { useRailCurrent } from "./use-rail-current";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { MapEntry } from "@/onchain-suite-website/utils/playbook-toc";

const LIST_ID = "rp-mbar-list";

/**
 * Mobile and tablet: a slim sticky bar naming the current entry. Tapping it
 * opens the same list as the rail; picking one or pressing Escape closes it.
 */
export function PlaybookMobileBar({
  entries,
  currentId,
  backHref,
  pdfHref,
}: {
  entries: MapEntry[];
  currentId?: string;
  backHref?: string;
  pdfHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = useRailCurrent(entries, currentId);
  const label = entries.find((e) => e.id === current)?.label;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="rp-mbar" ref={barRef}>
      <button
        ref={buttonRef}
        type="button"
        className="rp-mbar-btn"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-label={`${UI.contentsLabel}: ${label ?? ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rp-mbar-v">{label}</span>
        <ChevronDownIcon
          className={`rp-mbar-chev${open ? " is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      <nav
        id={LIST_ID}
        className="rp-mbar-panel"
        aria-label={UI.contentsLabel}
        hidden={!open}
      >
        {backHref && (
          <Link href={backHref} className="rp-rail-back">
            <ArrowLeftIcon className="rp-icon-sm" aria-hidden="true" />
            {UI.allStrategies}
          </Link>
        )}
        <TocList
          entries={entries}
          currentId={current}
          onPick={() => setOpen(false)}
        />
        {pdfHref && (
          <a href={pdfHref} download className="rp-rail-pdf">
            <ArrowDownTrayIcon className="rp-icon-sm" aria-hidden="true" />
            {UI.downloadPdf}
          </a>
        )}
      </nav>
    </div>
  );
}
