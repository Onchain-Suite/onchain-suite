'use client';
// The whole document on one page, for printing or saving as a PDF.
//
// The single-file version had a "print all" button because a reader needs the document as one
// artefact - to send to an accountant, to take into a meeting, to attach to an application. Split
// across twelve routes that is lost, so this route puts it back: every page in reading order, no
// shell, page breaks between sections, and the controls hidden from the print itself.
//
// It sits outside the (app) group so it gets the root layout and no sidebar.
import * as React from 'react';
import { PrinterIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { SsotControls } from '@/components/ssot-controls';
import { BASELINE } from '@/lib/model';
import { useModel } from '@/lib/use-model';

import { OverviewContent } from '@/components/pages/overview';
import { MarketContent } from '@/components/pages/market';
import { CatalogueContent } from '@/components/pages/catalogue';
import { CostModelContent } from '@/components/pages/cost-model';
import { CostPerUserContent } from '@/components/pages/cost-per-user';
import { UnitEconomicsContent } from '@/components/pages/unit-economics';
import { FinancialModelContent } from '@/components/pages/financial-model';
import { GrowthContent } from '@/components/pages/growth';
import { RunwayContent } from '@/components/pages/runway';
import { AssumptionsContent } from '@/components/pages/assumptions';
import { GovernanceContent } from '@/components/pages/governance';
import { DecisionsContent } from '@/components/pages/decisions';
import { WorkingsContent } from '@/components/pages/workings';
import { SensitivityContent } from '@/components/pages/sensitivity';

const PAGES = [
  OverviewContent, MarketContent, CatalogueContent, CostModelContent, CostPerUserContent,
  UnitEconomicsContent, FinancialModelContent, GrowthContent, RunwayContent,
  AssumptionsContent, GovernanceContent, DecisionsContent, WorkingsContent, SensitivityContent,
];

export default function Print() {
  const { s, ccy, scenario } = useModel();
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div data-print-root className="mx-auto max-w-[1100px] @container/main">
      {/* Screen only: the controls, so the reader chooses currency and scenario before printing. */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 print:hidden lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-medium">The whole document, for printing</h1>
            <p className="text-sm text-muted-foreground">
              All twelve pages in reading order. Choose the currency and scenario first: the print shows
              whatever is set here.
            </p>
          </div>
          <Button onClick={() => window.print()} className="gap-1.5">
            <PrinterIcon />
            Print or save as PDF
          </Button>
        </div>
        <SsotControls />
      </div>

      {/* Print only: a cover line, so a printout says what it is and what it was set to. */}
      <div className="hidden print:block print:pb-6">
        <h1 className="font-serif text-3xl font-medium">OnchainSuite Finance SSOT</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Printed {today} &middot; baseline {BASELINE} &middot; {scenario} case &middot; figures in{' '}
          {ccy === 'usd' ? 'dollars' : ccy === 'gbp' ? 'pounds' : 'dollars with pounds'} &middot; utilisation{' '}
          {Math.round(s.util * 100)}%
        </p>
      </div>

      {PAGES.map((Page, i) => (
        <section
          key={i}
          className="flex flex-col gap-4 py-6 md:gap-6 print:gap-4 print:py-0 print:[break-before:page] print:first:[break-before:auto]"
        >
          <Page />
        </section>
      ))}
    </div>
  );
}
