"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  AmountThresholdField,
  fromBaseUnits,
  toBaseUnits,
} from "./amount-threshold-field";
import type { PropertySelectOption } from "./property-select";
import {
  PROPERTY_HINT_CLASS,
  PROPERTY_INPUT_CLASS,
  PROPERTY_LABEL_CLASS,
  PropertySelect,
} from "./property-select";
import type { OnchainCatalogDefinition } from "@/features/automation/automation.service";
import { automationService } from "@/features/automation/automation.service";
import { ContractInterfaceDialog } from "@/features/automation/components/contract-interface-dialog";
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
  const queryClient = useQueryClient();
  const [interfaceDialogOpen, setInterfaceDialogOpen] = useState(false);

  const asString = (v: unknown): string => (typeof v === "string" ? v : "");

  /**
   * Large Transfer is the one preset whose whole meaning is a NUMBER the user
   * picks. Business presets otherwise hide every field but the contract, which
   * left this one advertising "at or above an amount you set" with nowhere to
   * set it — so it silently used a default nobody chose.
   */
  const isAmountThreshold = schemaType === "large_transfer";
  const amountFilter = Array.isArray(nodeData.filters)
    ? (nodeData.filters as Array<Record<string, unknown>>).find(
        (f) => f?.path === "value" && String(f?.operator ?? "").startsWith("g")
      )
    : undefined;
  const storedBase = asString(amountFilter?.value);
  // Decimals are the user's declaration about the token, not something the
  // chain tells us, so they are kept on the node rather than inferred.
  const decimals = Number(nodeData.amountDecimals ?? 18) || 0;
  const [amountText, setAmountText] = useState(() =>
    fromBaseUnits(storedBase, decimals)
  );

  const setThreshold = (nextAmount: string, nextDecimals: number) => {
    setAmountText(nextAmount);
    const base = toBaseUnits(nextAmount, nextDecimals);
    onChange({
      amountDecimals: nextDecimals,
      // Written as `gte` on the decoded `value` — the operator backend #460
      // added. Cleared when the amount is unusable, so a half-typed number
      // never becomes a threshold of zero that matches everything.
      filters: base
        ? [{ path: "value", operator: "gte", value: base }]
        : [{ path: "value", operator: "exists" }],
    });
  };
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
  /**
   * The backend returns these ONLY when the preset cannot fire here. They are
   * the org's other saved contracts that CAN fire it — the common case being a
   * protocol contract chosen when the event actually lives on its token.
   */
  const suggestions = contractEventsQuery.data?.suggestions ?? [];
  /**
   * Contracts found ON CHAIN that the user has not saved. Offered only when no
   * saved contract fits, which is the common case — people save the contract
   * they think of as their protocol, and that is the one that does not emit the
   * event.
   */
  const discovered = contractEventsQuery.data?.discovered ?? [];
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

  /**
   * WHEN PASTING AN INTERFACE IS THE ACTUAL FIX.
   *
   * Every one of these states means the same thing underneath: we could not
   * read this contract's events, so we cannot tell the user which one their
   * trigger will fire on. Sourcify has no ABI, the explorer has none, and the
   * bytecode scan only sees events that happened to be emitted in the last
   * ~2,000 blocks — so a quiet contract, or any Solana program (which has no
   * ABI at all, only an IDL nobody publishes to a registry), lands here.
   *
   * Telling someone "no events found" and stopping is a dead end. They have the
   * ABI — it is in their repo, or one click away in their explorer. So offer
   * the paste box at the exact moment the gap appears, rather than making them
   * discover the settings page on their own.
   */
  const interfaceWouldHelp =
    contractAddress.length > 0 &&
    !contractEventsQuery.isFetching &&
    (presetMatch?.status === "unconfirmed" ||
      presetMatch?.status === "mismatch" ||
      source === "empty" ||
      contractEventOptions.length === 0);

  const isSolana = resolvedChain.toLowerCase().startsWith("solana");

  return (
    <>
      {isAmountThreshold ? (
        <AmountThresholdField
          amount={amountText}
          decimals={decimals}
          onChange={setThreshold}
          labelClass={PROPERTY_LABEL_CLASS}
          inputClass={PROPERTY_INPUT_CLASS}
          hintClass={PROPERTY_HINT_CLASS}
        />
      ) : null}

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

          {suggestions.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <p className="text-[11px] leading-5 text-muted-foreground">
                This contract doesn&rsquo;t emit the event this trigger needs.
                One of your saved contracts does:
              </p>
              {suggestions.map((s) => (
                <button
                  key={`${s.chain ?? ""}:${s.address}`}
                  type="button"
                  onClick={() =>
                    // Set the chain too. A suggestion on another chain is
                    // useless without it, and leaving the old chain behind
                    // fails exactly as silently as the wrong contract did.
                    onChange({
                      contractAddress: s.address,
                      contract: s.address,
                      ...(s.chain ? { chain: s.chain } : {}),
                      event: s.event,
                    })
                  }
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {s.label?.trim() ? s.label : s.address}
                    </span>
                    <span className="block text-[11px] leading-5 text-muted-foreground">
                      {s.reason}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-primary">
                    Use this
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {suggestions.length === 0 && discovered.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] leading-5 text-muted-foreground">
                Nothing you&rsquo;ve saved emits this event, but transactions
                involving this contract do emit it elsewhere:
              </p>
              {discovered.map((d) => {
                const every = d.transactions >= d.sampled;
                return (
                  <button
                    key={d.address}
                    type="button"
                    onClick={() =>
                      onChange({
                        contractAddress: d.address,
                        contract: d.address,
                      })
                    }
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-foreground">
                        {d.address}
                      </span>
                      <span className="block text-[11px] leading-5 text-muted-foreground">
                        {/* The count IS the confidence, so it is stated rather
                            than converted into a label. Co-occurrence is not
                            causation: one transaction is a coincidence, all of
                            them is a real relationship, and the user is the one
                            who can tell which. */}
                        {every
                          ? `Emitted it in all ${d.sampled} recent transactions checked.`
                          : `Emitted it in ${d.transactions} of ${d.sampled} recent transactions checked.`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-primary">
                      Use this
                    </span>
                  </button>
                );
              })}
              <p className="text-[11px] leading-5 text-muted-foreground">
                Found on chain, not from your saved contracts — worth adding it
                in Settings if it&rsquo;s the one you want.
              </p>
            </div>
          ) : null}

          {interfaceWouldHelp ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] leading-5 text-muted-foreground">
                {contractEventOptions.length === 0 ? (
                  isSolana ? (
                    <>
                      Solana programs don&rsquo;t publish an ABI, so there is
                      nothing to read here automatically.
                    </>
                  ) : (
                    <>
                      No events could be read from this contract. A verified
                      contract lists its full ABI; an unverified one only shows
                      events emitted in the last ~2,000 blocks.
                    </>
                  )
                ) : (
                  <>
                    Paste the {isSolana ? "IDL" : "ABI"} to name every event
                    this contract can emit, not just the ones seen recently.
                  </>
                )}{" "}
                <span className="text-foreground">
                  Paste the {isSolana ? "IDL" : "ABI"} and the full list appears
                  here.
                </span>
              </p>
              <button
                type="button"
                onClick={() => setInterfaceDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Paste {isSolana ? "IDL" : "ABI"}
              </button>
            </div>
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

      <ContractInterfaceDialog
        open={interfaceDialogOpen}
        onOpenChange={setInterfaceDialogOpen}
        chain={resolvedChain}
        address={contractAddress}
        // The dialog invalidates its own lookup, but the event list is keyed on
        // the trigger as well as the address. Without this the picker would
        // still say "no events" straight after a good paste — which is the
        // exact confusion the paste box exists to remove.
        onSubmitted={() => {
          queryClient
            .invalidateQueries({
              queryKey: ["automations", "builder", "contract-events"],
            })
            .catch(() => undefined);
        }}
      />
    </>
  );
}
