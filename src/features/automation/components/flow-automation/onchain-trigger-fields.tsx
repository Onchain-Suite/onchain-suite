"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { PropertySelectOption } from "./property-select";
import {
  PROPERTY_HINT_CLASS,
  PROPERTY_INPUT_CLASS,
  PROPERTY_LABEL_CLASS,
  PropertySelect,
} from "./property-select";
import type { OnchainCatalogDefinition } from "@/features/automation/automation.service";
import { automationService } from "@/features/automation/automation.service";
import { buildTriggerContractPatch } from "@/features/automation/utils/contracts";

/**
 * The contract / event / chain fields of an ON-CHAIN trigger's property panel.
 *
 * Extracted from `create-automations.tsx` because this is the one part of that
 * panel that OWNS STATE rather than just rendering the node's data: it runs its
 * own event-resolution query, derives the preset match from it, and now holds
 * the interface-submission dialog. All of that was loose in a 5,700-line
 * component where none of it was findable, and every piece of it is keyed on
 * the same two values — the address and the chain — which is what makes this a
 * module rather than a slice of markup.
 */

type ContractCatalogEntry = { address: string; name: string; chain: string };

export function OnchainTriggerFields({
  nodeData,
  onChange,
  schemaType,
  hasImpliedEvent,
  contractCatalog,
  chainOptions,
  eventOptions,
  eventDefinitionByValue,
}: {
  nodeData: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  schemaType: string;
  /**
   * True for business presets, which imply their event rather than asking for
   * one. The implication is exactly what has to be shown and confirmed.
   */
  hasImpliedEvent: boolean;
  contractCatalog: ContractCatalogEntry[];
  chainOptions: PropertySelectOption[];
  eventOptions: PropertySelectOption[];
  eventDefinitionByValue: Map<string, OnchainCatalogDefinition>;
}) {
  const asString = (v: unknown): string => (typeof v === "string" ? v : "");
  const contractAddress =
    asString(nodeData.contractAddress).trim() ||
    asString(nodeData.contract).trim();
  const resolvedChain = asString(nodeData.chain).trim() || "eth-mainnet";

  // Selected contract → its own events. Fetched lazily (only when a contract is
  // picked) and cached; the backend falls back to the well-known catalog, so
  // this is always safe and the dropdown always has options.
  const contractEventsQuery = useQuery({
    queryKey: [
      "automations",
      "builder",
      "contract-events",
      resolvedChain,
      contractAddress,
      // Presets are keyed too: the answer depends on which preset is asking.
      hasImpliedEvent ? schemaType : "",
    ],
    queryFn: () =>
      automationService.getContractEvents(
        resolvedChain,
        contractAddress,
        undefined,
        hasImpliedEvent ? schemaType : undefined
      ),
    // Fetched for PRESETS as well now. It used to be skipped for them, on the
    // reasoning that a preset implies its event — which is true right up until
    // the contract does not emit that event, at which point the trigger is
    // silently dead and the panel says it is ready.
    enabled: contractAddress.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  });

  const presetMatch = contractEventsQuery.data?.presetMatch;
  // Only `confirmed` justifies telling the user this trigger is ready. The
  // other two states must show the picker instead of a promise.
  const presetConfirmed = presetMatch?.status === "confirmed";
  const source = contractEventsQuery.data?.source;

  const contractEventOptions = useMemo(
    () =>
      (contractEventsQuery.data?.events ?? []).map((e) => ({
        value: e.value,
        label: e.label,
      })),
    [contractEventsQuery.data]
  );

  // Real events carry their own topic0 (from the ABI, or the sampled log for an
  // unverified contract). Keep it so selecting one wires the runtime match key
  // even when the event isn't in the well-known catalog.
  const contractEventByValue = useMemo(() => {
    const map = new Map<string, { topic0?: string }>();
    for (const e of contractEventsQuery.data?.events ?? []) {
      if (!map.has(e.value)) map.set(e.value, { topic0: e.topic0 });
    }
    return map;
  }, [contractEventsQuery.data]);

  return (
    <>
      {/* Contract — only on-chain triggers watch a contract. Off-chain
          triggers (segment/list/form/email) need nothing here. */}
      <div className="space-y-2">
        <label className={PROPERTY_LABEL_CLASS}>Token or contract</label>
        <PropertySelect
          placeholder="Select contract"
          value={
            asString(nodeData.contractAddress) || asString(nodeData.contract)
          }
          options={contractCatalog.map((c) => ({
            value: c.address,
            label: c.name,
            hint: `(${c.chain})`,
          }))}
          onChange={(next) => {
            onChange(buildTriggerContractPatch(next, contractCatalog));
          }}
        />
        {/* Escape hatch: the select only lists saved contracts. Pasting any
            deployed address here drives the same live event resolution, so a
            contract that isn't in project settings yet (a fresh testnet
            deploy) still works. */}
        <input
          type="text"
          className={PROPERTY_INPUT_CLASS}
          placeholder="…or paste a contract address (0x…)"
          spellCheck={false}
          value={asString(nodeData.contractAddress)}
          onChange={(e) => {
            const address = e.target.value.trim();
            onChange({ contractAddress: address, contract: address });
          }}
        />
        {hasImpliedEvent ? (
          // The old copy promised this fires, always. It is only true when the
          // contract actually emits the preset's event — so the promise is now
          // conditional on the backend confirming it, and the other two
          // answers say what to do instead.
          !contractAddress ? (
            <p className={PROPERTY_HINT_CLASS}>
              Pick a contract to check this trigger can fire on it.
            </p>
          ) : contractEventsQuery.isFetching ? (
            <p className={PROPERTY_HINT_CLASS}>
              Checking which events this contract emits&hellip;
            </p>
          ) : presetConfirmed && presetMatch ? (
            <p className={PROPERTY_HINT_CLASS}>
              Fires on{" "}
              <span className="font-medium text-emerald-400">
                {presetMatch.resolvedEvent?.name}
              </span>
              , which this contract emits. Change it below if that is the wrong
              event.
            </p>
          ) : presetMatch?.status === "mismatch" ? (
            <p className="text-xs leading-relaxed text-red-400">
              {presetMatch.message}
            </p>
          ) : presetMatch?.status === "unconfirmed" ? (
            <p className="text-xs leading-relaxed text-amber-400">
              {presetMatch.message}
            </p>
          ) : (
            <p className={PROPERTY_HINT_CLASS}>
              That&rsquo;s all this trigger needs — it fires automatically on
              the matching on-chain activity for this contract.
            </p>
          )
        ) : (
          <p className={PROPERTY_HINT_CLASS}>
            Pick a saved contract or paste an address, then choose its chain
            below to load that contract&rsquo;s events.
          </p>
        )}
      </div>

      {/* Event. Shown for presets too once a contract is chosen: the preset
          only IMPLIES an event, and the user has to be able to see which one
          was picked and choose a different one when it is wrong. A hidden
          implication that silently matches nothing is the failure this panel
          exists to prevent. */}
      {(!hasImpliedEvent ||
        (contractAddress.length > 0 && !contractEventsQuery.isFetching)) && (
        <div className="space-y-2">
          <label className={PROPERTY_LABEL_CLASS}>Event</label>
          <PropertySelect
            placeholder={
              !contractAddress
                ? "Select a contract first"
                : contractEventsQuery.isFetching
                  ? "Loading events…"
                  : "Select event"
            }
            disabled={!contractAddress}
            // Falls back to the event the preset RESOLVED to, so a confirmed
            // preset shows which event it picked rather than an empty box.
            // Applying the node writes it, so what publishes is a concrete
            // event with a real topic0 — not a preset name re-matched later
            // against whatever the contract exposes then.
            value={
              asString(nodeData.event) ||
              (presetConfirmed ? (presetMatch?.resolvedEvent?.name ?? "") : "")
            }
            // A chosen contract shows ONLY its real events (empty when none
            // resolve — never generic catalog events). The catalog/app-event
            // list is only for the no-contract case, where the picker is
            // disabled anyway.
            options={contractAddress ? contractEventOptions : eventOptions}
            onChange={(next) => {
              const def = eventDefinitionByValue.get(next);
              const real = contractEventByValue.get(next);
              onChange({
                event: next,
                ...(def
                  ? {
                      // Wire key the runtime matches on; internal, never shown
                      // in the UI.
                      goldrushEventId: def.id,
                      eventStandard: def.standard,
                      chainFamily: def.chainFamily,
                      topic0: def.topic0,
                      programId: def.programIds?.[0],
                      instructionName: def.instructionNames?.[0],
                    }
                  : {}),
                // Prefer the contract's own topic0 so a real event that isn't
                // in the catalog still matches at runtime.
                ...(real?.topic0 ? { topic0: real.topic0 } : {}),
              });
            }}
          />
          {contractAddress && !contractEventsQuery.isFetching ? (
            <>
              {source === "live" && contractEventOptions.length > 0 ? (
                <p className={PROPERTY_HINT_CLASS}>
                  Real events read from this contract.
                </p>
              ) : null}
              {source === "empty" ? (
                <p className={PROPERTY_HINT_CLASS}>
                  No events found. A verified contract lists its full ABI here;
                  an unverified one only shows events emitted in the last ~2,000
                  blocks.
                </p>
              ) : null}
              {source === "unavailable" ? (
                <p className={PROPERTY_HINT_CLASS}>
                  Couldn&rsquo;t read this contract&rsquo;s events right now —
                  check the chain is right and try again.
                </p>
              ) : null}
              {source === "unsupported" ? (
                <p className={PROPERTY_HINT_CLASS}>
                  Event resolution isn&rsquo;t available for this chain yet.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <label className={PROPERTY_LABEL_CLASS}>Chain</label>
        <PropertySelect
          placeholder="All chains"
          value={asString(nodeData.chain)}
          options={chainOptions}
          onChange={(next) => onChange({ chain: next })}
        />
        <p className={PROPERTY_HINT_CLASS}>
          Restrict this trigger to one network, or leave on all chains.
        </p>
      </div>
    </>
  );
}
