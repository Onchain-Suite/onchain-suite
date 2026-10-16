'use client';
// The two switches that change what every page shows, and the reset that undoes them.
//
// Scenario applies every lever the scenario defines, through one function in lib/store.ts. The
// single-file version had this logic in two places, they drifted, and for four days each button
// set utilisation to undefined and zeroed the document. One call site now, deliberately.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowCounterClockwiseIcon, FilePdfIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { applyScenario, reset, setCcy, type Ccy, type ScenarioName } from '@/lib/store';
import { useModel } from '@/lib/use-model';

const SCENARIOS: { id: ScenarioName; label: string; tip: string }[] = [
  { id: 'bear', label: 'Bear', tip: '8% churn, 3 new customers a month, slower growth and a weaker mix' },
  { id: 'base', label: 'Base', tip: 'The agreed plan: 5% churn, 5 new customers a month, full enrichment' },
  { id: 'bull', label: 'Bull', tip: '3% churn, 7 new customers a month, weighted further to the upper tiers' },
];

const CURRENCIES: { id: Ccy; label: string; tip: string }[] = [
  { id: 'usd', label: '$', tip: 'Dollars only. We charge and earn in dollars' },
  { id: 'gbp', label: '£', tip: 'Pounds only, converted at the rate on page 10. We file in pounds' },
  { id: 'both', label: '$ £', tip: 'Both, dollars first' },
];

export function SsotControls() {
  const { ccy, scenario, dirty } = useModel();
  const onPrintPage = usePathname() === '/print';
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {SCENARIOS.map((s) => (
          <Tooltip key={s.id}>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant={scenario === s.id ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => applyScenario(s.id)}
                  aria-pressed={scenario === s.id}
                >
                  {s.label}
                </Button>
              }
            />
            <TooltipContent>{s.tip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {CURRENCIES.map((c) => (
          <Tooltip key={c.id}>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant={ccy === c.id ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs tabular-nums"
                  onClick={() => setCcy(c.id)}
                  aria-label={c.tip}
                  aria-pressed={ccy === c.id}
                >
                  {c.label}
                </Button>
              }
            />
            <TooltipContent>{c.tip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={!dirty} onClick={reset}>
        <ArrowCounterClockwiseIcon />
        Reset to baseline
      </Button>
      {/* nativeButton={false} because this is genuinely a link, not a button: Base UI warns when a
          control that acts as a button renders something other than a native <button>. */}
      {onPrintPage ? null : (
        <Button size="sm" variant="outline" className="h-9 gap-1.5" nativeButton={false} render={<Link href="/print" />}>
          <FilePdfIcon />
          Whole document
        </Button>
      )}

      <span className="text-xs text-muted-foreground">
        {dirty ? 'Changed from the agreed baseline' : 'Showing the agreed baseline'}
      </span>
    </div>
  );
}
