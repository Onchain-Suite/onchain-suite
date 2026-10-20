"use client";

import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type ManualContractDraft } from "../../constants/guided";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "../../data/chains";
import {
  onboardingService,
  type ResolvedContractFound,
  type SuggestedContract,
} from "../../onboarding.service";
import { classify } from "../../utils/contract-input";
import { ContractSuggestionsPanel } from "../contract-suggestions";

const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/i;

const STANDARD_LABEL: Record<string, string> = {
  erc20: "ERC-20 token",
  erc721: "ERC-721 NFT",
  erc1155: "ERC-1155 NFT",
  unknown: "Contract",
};

/** Contract types offered in the by-hand form (maps loosely to the resolver's standards). */
const CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "erc20", label: "ERC-20 token" },
  { value: "erc721", label: "ERC-721 NFT" },
  { value: "erc1155", label: "ERC-1155 NFT" },
  { value: "other", label: "Other contract" },
];

const EMPTY_MANUAL: ManualContractDraft = {
  name: "",
  address: "",
  chain: "",
  type: "erc20",
};

/** Debounce a value (~400ms) so the resolver never fires per keystroke. */
function useDebounced<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Step 4 - the contract. Two ways in: the zip's "paste anything" box (an address, explorer link,
 * website or ABI) which we classify locally and, for an address, resolve for real against the chain
 * (Alchemy) so the user sees what it is and which chain to index; and, when we can't auto-find it,
 * an "enter the details by hand" form (name, address, chain, type). Nothing is indexed here;
 * indexing starts once the plan is active, so Continue is a skip when nothing is given.
 */
export function StepContract({
  value,
  onChange,
  picked,
  onAcceptSuggestion,
  onRemoveSuggestion,
  onResolvedChain,
  manual,
  onManual,
  projectName,
  sector,
  chains,
}: {
  value: string;
  onChange: (v: string) => void;
  picked: SuggestedContract[];
  onAcceptSuggestion: (c: SuggestedContract) => void;
  onRemoveSuggestion: (c: SuggestedContract) => void;
  /** The chain the pasted address actually resolved on, so indexing uses it. */
  onResolvedChain?: (chain: string) => void;
  /** The by-hand contract (orchestrator-owned so it survives step navigation). */
  manual: ManualContractDraft | null;
  onManual: (m: ManualContractDraft | null) => void;
  projectName: string;
  sector: string;
  chains: string[];
}) {
  // Start in the by-hand form only if one was already entered; otherwise paste first.
  const [byHand, setByHand] = useState(manual !== null);

  if (byHand) {
    return (
      <ManualEntry
        draft={manual ?? EMPTY_MANUAL}
        onChange={onManual}
        chains={chains}
        onBack={() => {
          onManual(null);
          setByHand(false);
        }}
      />
    );
  }

  return (
    <PasteEntry
      value={value}
      onChange={onChange}
      picked={picked}
      onAcceptSuggestion={onAcceptSuggestion}
      onRemoveSuggestion={onRemoveSuggestion}
      onResolvedChain={onResolvedChain}
      projectName={projectName}
      sector={sector}
      chains={chains}
      onEnterByHand={() => {
        // Seed the form with whatever was already pasted so nothing is retyped.
        const pasted = classify(value);
        onManual({
          ...EMPTY_MANUAL,
          address: EVM_ADDRESS_RE.test(pasted.value) ? pasted.value : "",
          chain: chains[0] ?? "",
        });
        setByHand(true);
      }}
    />
  );
}

/** The default "paste anything" box, its live resolution, and the suggestion panel. */
function PasteEntry({
  value,
  onChange,
  picked,
  onAcceptSuggestion,
  onRemoveSuggestion,
  onResolvedChain,
  projectName,
  sector,
  chains,
  onEnterByHand,
}: {
  value: string;
  onChange: (v: string) => void;
  picked: SuggestedContract[];
  onAcceptSuggestion: (c: SuggestedContract) => void;
  onRemoveSuggestion: (c: SuggestedContract) => void;
  onResolvedChain?: (chain: string) => void;
  projectName: string;
  sector: string;
  chains: string[];
  onEnterByHand: () => void;
}) {
  const guess = classify(value);
  const recognised = guess.form !== "empty" && guess.form !== "unknown";

  // We can only resolve a bare 0x address (from a pasted address or an explorer link).
  const address = EVM_ADDRESS_RE.test(guess.value)
    ? guess.value.toLowerCase()
    : null;
  const debouncedAddress = useDebounced(address);

  const resolveQuery = useQuery({
    queryKey: [
      "onboarding",
      "resolve-contract",
      { address: debouncedAddress, chain: guess.chain ?? null, chains },
    ],
    queryFn: ({ signal }) =>
      onboardingService.resolveContract(
        {
          address: debouncedAddress as string,
          chain: guess.chain,
          chains: chains.length > 0 ? chains : undefined,
        },
        { signal }
      ),
    enabled: Boolean(debouncedAddress),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const resolved = resolveQuery.data;
  const resolvedChain = resolved?.found ? resolved.chain : undefined;
  useEffect(() => {
    if (resolvedChain) onResolvedChain?.(resolvedChain);
  }, [resolvedChain, onResolvedChain]);

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        An address, an explorer link, your website or the ABI. We find the
        contract and its events, and you confirm which to track. Indexing starts
        once your plan is active.
      </p>

      <div className="mt-8 space-y-2">
        <Label htmlFor="ob-resolve">Paste anything</Label>
        <div className="flex items-start gap-2">
          <Input
            id="ob-resolve"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0x… · basescan.org/address/… · yourproject.xyz · ABI"
            className="flex-1 font-mono"
            aria-describedby="ob-resolve-hint"
          />
          <Button
            type="button"
            onClick={() => resolveQuery.refetch()}
            disabled={!recognised}
          >
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="mr-1.5 h-4 w-4"
            />
            Look it up
          </Button>
        </div>
        <p
          id="ob-resolve-hint"
          className={`text-sm ${recognised ? "text-foreground" : "text-muted-foreground"}`}
        >
          {guess.form === "empty" ? (
            "We work out what it is as you paste. Nothing is fetched until your plan is active."
          ) : guess.form === "unknown" ? (
            guess.next
          ) : (
            <>
              <b>{guess.label}</b>
              {guess.chain ? ` on ${guess.chain}` : ""}. {guess.next}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onEnterByHand}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <PencilSquareIcon aria-hidden="true" className="h-4 w-4" />
          Enter the details by hand
        </button>
      </div>

      {/* Live, real resolution of a pasted address against the chain. */}
      {address ? (
        <div className="mt-4">
          {resolveQuery.isPending ? (
            <p className="text-muted-foreground text-sm">
              Checking the chain for this address…
            </p>
          ) : resolved?.found ? (
            <ResolvedCard contract={resolved} />
          ) : resolved && !resolved.found && resolved.reason === "no-code" ? (
            <NotFound chainsTried={resolved.chainsTried} />
          ) : null}
        </div>
      ) : null}

      {/* Or let us find them from the project name + chains. The panel self-hides until there is
          something to show, and prompts for manual input when it finds nothing. */}
      <div className="mt-6">
        <ContractSuggestionsPanel
          protocolName={projectName}
          sector={sector}
          chains={chains}
          accepted={picked}
          onAccept={onAcceptSuggestion}
          onRemove={onRemoveSuggestion}
          showEmptyPrompt={value.trim().length === 0}
        />
      </div>
    </>
  );
}

/** The by-hand fallback: name, address, chain and type, for when we can't auto-find the contract. */
function ManualEntry({
  draft,
  onChange,
  chains,
  onBack,
}: {
  draft: ManualContractDraft;
  onChange: (m: ManualContractDraft) => void;
  chains: string[];
  onBack: () => void;
}) {
  const set = (patch: Partial<ManualContractDraft>) =>
    onChange({ ...draft, ...patch });
  const addressValid =
    draft.address.trim() === "" || EVM_ADDRESS_RE.test(draft.address.trim());

  // Offer the project's chosen chains first, then the rest, so the common pick is at the top.
  const chainOptions = [
    ...SUPPORTED_CHAINS.filter((c) => chains.includes(c.key)),
    ...SUPPORTED_CHAINS.filter((c) => !chains.includes(c.key)),
  ];

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        An address, an explorer link, your website or the ABI. We find the
        contract and its events, and you confirm which to track. Indexing starts
        once your plan is active.
      </p>

      <div className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ob-name">Contract name</Label>
          <Input
            id="ob-name"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Acme Packs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-address">Contract address</Label>
          <Input
            id="ob-address"
            value={draft.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!addressValid}
            aria-describedby="ob-address-hint"
          />
          <p
            id="ob-address-hint"
            className={`text-xs ${addressValid ? "text-muted-foreground" : "text-destructive"}`}
          >
            {addressValid
              ? "We index holders and activity from this address."
              : "Enter a valid address (0x followed by 40 hex characters)."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ob-chain">Chain</Label>
            <select
              id="ob-chain"
              value={draft.chain || (chainOptions[0]?.key ?? DEFAULT_CHAIN)}
              onChange={(e) => set({ chain: e.target.value })}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {chainOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-type">Type</Label>
            <select
              id="ob-type"
              value={draft.type}
              onChange={(e) => set({ type: e.target.value })}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Back to pasting a link or an address
        </button>
      </div>
    </>
  );
}

/** A confirmed, on-chain contract: the honest result the user pasted, verified against the chain. */
function ResolvedCard({ contract }: { contract: ResolvedContractFound }) {
  const title =
    contract.name ??
    (contract.symbol ? `$${contract.symbol}` : "Verified contract");
  const where = contract.chainLabel
    ? `Verified on ${contract.chainLabel}`
    : "Verified on-chain";
  return (
    <div className="border-primary/40 bg-primary/5 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-background border-border flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {contract.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contract.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <CheckBadgeIcon
              aria-hidden="true"
              className="text-primary h-5 w-5"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-foreground text-sm font-semibold">
              {title}
            </span>
            {contract.symbol && contract.name ? (
              <span className="text-muted-foreground font-mono text-xs">
                {contract.symbol}
              </span>
            ) : null}
            <span className="border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
              <CheckBadgeIcon aria-hidden="true" className="h-3 w-3" />
              {where}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {STANDARD_LABEL[contract.standard] ?? "Contract"}
            {" · "}
            <span className="font-mono">
              {`${contract.address.slice(0, 8)}…${contract.address.slice(-6)}`}
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            We will index this contract and its events once your plan is active.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Nothing resolved: the address held no code on any chain we checked. */
function NotFound({ chainsTried }: { chainsTried?: string[] }) {
  const where =
    chainsTried && chainsTried.length > 0
      ? chainsTried.join(", ")
      : "the chains you selected";
  return (
    <div className="border-border bg-muted/30 flex items-start gap-2 rounded-xl border p-3">
      <ExclamationTriangleIcon
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
      />
      <p className="text-muted-foreground text-xs">
        No contract found at this address on {where}. Double-check the address
        and that the right chain is selected in step 1, paste an explorer link
        so we know the chain, or enter the details by hand.
      </p>
    </div>
  );
}
