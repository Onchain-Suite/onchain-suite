"use client";

import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type ManualContractDraft } from "../../constants/guided";
import {
  DEFAULT_CHAIN,
  SUPPORTED_CHAINS,
  type SupportedChain,
} from "../../data/chains";
import {
  onboardingService,
  type ResolvedContractFound,
} from "../../onboarding.service";
import { ObSelect, type ObSelectOption } from "./ob-select";

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

/** Order the chain list with the project's chosen chains first. */
const toOptions = (chains: SupportedChain[]): ObSelectOption[] =>
  chains.map((c) => ({ value: c.key, label: c.label, logo: c.logo }));

function useChainOptions(chains: string[]) {
  return useMemo(
    () => [
      ...SUPPORTED_CHAINS.filter((c) => chains.includes(c.key)),
      ...SUPPORTED_CHAINS.filter((c) => !chains.includes(c.key)),
    ],
    [chains]
  );
}

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
 * Step 4 - the contract. The primary input is just an address and its chain: we read the contract
 * off the chain for real (Alchemy) and show what it is. When that is not enough (no address to
 * hand, or extra detail to add) the "enter the details by hand" form takes a name and type too.
 * Nothing is indexed here; indexing starts once the plan is active, so Continue is a skip.
 */
export function StepContract({
  value,
  onChange,
  chain,
  onChain,
  manual,
  onManual,
  chains,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The chain to read the address on (backend key), chosen by the user. */
  chain: string;
  onChain: (c: string) => void;
  /** The by-hand contract (orchestrator-owned so it survives step navigation). */
  manual: ManualContractDraft | null;
  onManual: (m: ManualContractDraft | null) => void;
  chains: string[];
}) {
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
    <AddressEntry
      value={value}
      onChange={onChange}
      chain={chain}
      onChain={onChain}
      chains={chains}
      onEnterByHand={() => {
        onManual({
          ...EMPTY_MANUAL,
          address: EVM_ADDRESS_RE.test(value.trim()) ? value.trim() : "",
          chain,
        });
        setByHand(true);
      }}
    />
  );
}

/** The default input: a contract address and its chain, resolved live against the chain. */
function AddressEntry({
  value,
  onChange,
  chain,
  onChain,
  chains,
  onEnterByHand,
}: {
  value: string;
  onChange: (v: string) => void;
  chain: string;
  onChain: (c: string) => void;
  chains: string[];
  onEnterByHand: () => void;
}) {
  const chainOptions = useChainOptions(chains);
  const trimmed = value.trim();
  const address = EVM_ADDRESS_RE.test(trimmed) ? trimmed.toLowerCase() : null;
  const invalid = trimmed.length > 0 && address === null;
  const debouncedAddress = useDebounced(address);

  const resolveQuery = useQuery({
    queryKey: ["onboarding", "resolve-contract", debouncedAddress, chain],
    queryFn: ({ signal }) =>
      onboardingService.resolveContract(
        { address: debouncedAddress as string, chain },
        { signal }
      ),
    enabled: Boolean(debouncedAddress),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const resolved = resolveQuery.data;

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        Enter your contract address and pick its chain. We read it off the chain
        and index its events once your plan is active.
      </p>

      <div className="mt-8 space-y-4">
        {/* Address fills the row; the chain picker is only as wide as it needs. */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="ob-address">Contract address</Label>
            <Input
              id="ob-address"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="0x…"
              className="font-mono"
              aria-invalid={invalid}
              aria-describedby={invalid ? "ob-address-err" : undefined}
            />
          </div>
          <div className="shrink-0 space-y-2">
            <Label htmlFor="ob-chain">Chain</Label>
            <ObSelect
              id="ob-chain"
              value={chain}
              onChange={onChain}
              options={toOptions(chainOptions)}
            />
          </div>
        </div>
        {invalid ? (
          <p id="ob-address-err" className="text-destructive text-xs">
            Enter a valid address (0x followed by 40 hex characters).
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => resolveQuery.refetch()}
            disabled={!address}
          >
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="mr-1.5 h-4 w-4"
            />
            Look it up
          </Button>
        </div>

        {/* Live resolution of the address on the chosen chain. */}
        {address ? (
          resolveQuery.isPending ? (
            <p className="text-muted-foreground text-sm">
              Checking the chain for this address…
            </p>
          ) : resolved?.found ? (
            <ResolvedCard contract={resolved} />
          ) : resolved && !resolved.found && resolved.reason === "no-code" ? (
            <NotFound />
          ) : null
        ) : null}

        {/* A clear alternative, not a buried link. */}
        <button
          type="button"
          onClick={onEnterByHand}
          className="border-border hover:border-primary/50 hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors"
        >
          <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <PencilSquareIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block text-sm font-medium">
              Enter the details by hand
            </span>
            <span className="text-muted-foreground block text-xs">
              Add the name, address, chain and type yourself.
            </span>
          </span>
        </button>
      </div>
    </>
  );
}

/** The by-hand fallback: name, address, chain and type, for full control over the contract. */
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
  const chainOptions = useChainOptions(chains);
  const set = (patch: Partial<ManualContractDraft>) =>
    onChange({ ...draft, ...patch });
  const addressValid =
    draft.address.trim() === "" || EVM_ADDRESS_RE.test(draft.address.trim());

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        Enter the contract details yourself. We index holders and activity from
        this address once your plan is active.
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
          <Label htmlFor="ob-m-address">Contract address</Label>
          <Input
            id="ob-m-address"
            value={draft.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!addressValid}
            aria-describedby="ob-m-address-hint"
          />
          {!addressValid ? (
            <p id="ob-m-address-hint" className="text-destructive text-xs">
              Enter a valid address (0x followed by 40 hex characters).
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-2">
            <Label htmlFor="ob-m-chain">Chain</Label>
            <ObSelect
              id="ob-m-chain"
              value={draft.chain || (chainOptions[0]?.key ?? DEFAULT_CHAIN)}
              onChange={(c) => set({ chain: c })}
              options={toOptions(chainOptions)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-m-type">Type</Label>
            <ObSelect
              id="ob-m-type"
              value={draft.type}
              onChange={(t) => set({ type: t })}
              options={CONTRACT_TYPES}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Back to address and chain
        </button>
      </div>
    </>
  );
}

/** A confirmed, on-chain contract: the honest result, verified against the chain. */
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

/** Nothing resolved: the address held no code on the chosen chain. */
function NotFound() {
  return (
    <div className="border-border bg-muted/30 flex items-start gap-2 rounded-xl border p-3">
      <ExclamationTriangleIcon
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
      />
      <p className="text-muted-foreground text-xs">
        No contract found at this address on the selected chain. Check the
        address, or pick the chain it is deployed on.
      </p>
    </div>
  );
}
