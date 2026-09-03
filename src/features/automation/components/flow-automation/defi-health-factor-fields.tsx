"use client";

import type { PropertySelectOption } from "./property-select";
import {
  PROPERTY_HINT_CLASS,
  PROPERTY_INPUT_CLASS,
  PROPERTY_LABEL_CLASS,
  PropertySelect,
} from "./property-select";
import { parseHealthFactorThreshold } from "@/features/automation/utils/builder-issues";

/**
 * The pool / threshold / chain fields of the DeFi Health Factor trigger.
 *
 * WHY THIS IS ITS OWN PANEL
 *
 * Every other on-chain trigger watches a contract for an event, so it shares
 * `OnchainTriggerFields` (contract + event picker). `defi_health_factor` does
 * not: it reads lending positions from a POOL on a schedule and fires when a
 * position's health factor drops below a LEVEL the user sets (1.0 is the
 * liquidation line, per the backend's `INVALID_DEFI_THRESHOLD`). Those are two
 * different inputs from the contract/event pair, so routing this trigger into
 * the shared panel asked for the wrong things - the reason it needs its own.
 */
export function DefiHealthFactorFields({
  nodeData,
  onChange,
  chainOptions,
}: {
  nodeData: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  chainOptions: PropertySelectOption[];
}) {
  const asString = (v: unknown): string => (typeof v === "string" ? v : "");
  const poolAddress = asString(nodeData.poolAddress);
  const thresholdText =
    typeof nodeData.threshold === "number"
      ? String(nodeData.threshold)
      : asString(nodeData.threshold);
  const threshold = parseHealthFactorThreshold(nodeData.threshold);

  return (
    <>
      <div className="space-y-2">
        <label className={PROPERTY_LABEL_CLASS}>Lending pool</label>
        <input
          type="text"
          className={PROPERTY_INPUT_CLASS}
          placeholder="Pool address (0x…)"
          spellCheck={false}
          value={poolAddress}
          onChange={(e) => {
            const address = e.target.value.trim();
            onChange({ poolAddress: address });
          }}
        />
        <p className={PROPERTY_HINT_CLASS}>
          The lending pool whose positions are read each run. A wrong pool reads
          nothing, so the trigger looks like a quiet market rather than a
          misconfiguration.
        </p>
      </div>

      <div className="space-y-2">
        <label className={PROPERTY_LABEL_CLASS}>Fire below</label>
        <input
          type="text"
          inputMode="decimal"
          className={PROPERTY_INPUT_CLASS}
          placeholder="1.0"
          value={thresholdText}
          onChange={(e) => {
            const next = e.target.value.trim();
            const parsed = parseHealthFactorThreshold(next);
            // Store the number when usable so the wire value is a real threshold,
            // never a half-typed string; clear it otherwise so an unusable entry
            // shows as unset (orange dot) rather than a silent zero.
            onChange({ threshold: parsed > 0 ? parsed : "" });
          }}
        />
        <p className={PROPERTY_HINT_CLASS}>
          {threshold > 0
            ? `Fires when a position's health factor drops below ${threshold}. 1.0 is the liquidation line - set higher to warn earlier.`
            : "The health-factor level a position must drop below to fire. 1.0 is the liquidation line - set higher (e.g. 1.2) to warn earlier."}
        </p>
      </div>

      <div className="space-y-2">
        <label className={PROPERTY_LABEL_CLASS}>Chain</label>
        <PropertySelect
          placeholder="All chains"
          value={asString(nodeData.chain)}
          options={chainOptions}
          onChange={(next) => onChange({ chain: next })}
        />
        <p className={PROPERTY_HINT_CLASS}>
          The network the pool is deployed on. Positions are read from this
          chain each run.
        </p>
      </div>
    </>
  );
}
