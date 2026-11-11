"use client";

import type { ChainRef } from "../../contracts/resolve-contract";
import {
  chainList,
  describeContract,
  type LookupState,
} from "../../utils/contract-lookup";

const LINK =
  "text-primary font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none";

/**
 * What the lookup found, in a line under the address field. It never claims
 * more than it knows: "not found" only counts chains that answered, a chain
 * that did not answer is named, and a lookup that could not run says so
 * instead of saying the address is wrong.
 */
export function ContractLookupNote({
  state,
  chainCount,
  onPickChain,
  onOtherChain,
  onRetry,
}: {
  state: LookupState;
  /** How many chains we index, for "looking on N chains". */
  chainCount: number;
  /** Read the address on one of the other chains it is deployed on. */
  onPickChain: (chain: ChainRef) => void;
  /** Open "which chain is it on?". */
  onOtherChain: () => void;
  onRetry: () => void;
}) {
  if (state.kind === "idle") return null;

  if (state.kind === "invalid") {
    return (
      <p className="text-destructive text-xs">
        Enter a valid address (0x followed by 40 hex characters).
      </p>
    );
  }

  if (state.kind === "looking") {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        Looking for this address on the {chainCount} chains we index…
      </p>
    );
  }

  if (state.kind === "found") {
    const { contract } = state;
    return (
      <p role="status" className="text-muted-foreground text-xs">
        <b className="text-foreground">{describeContract(contract)}.</b> Indexed
        first.
        {contract.alsoOn.length > 0 ? (
          <>
            {" "}
            Also on{" "}
            {contract.alsoOn.map((ref, i) => (
              <span key={ref.chain}>
                {i > 0 ? ", " : null}
                <button
                  type="button"
                  className={LINK}
                  onClick={() => onPickChain(ref)}
                >
                  {ref.chainLabel}
                </button>
              </span>
            ))}
            : pick one if that is the one you mean.
          </>
        ) : null}
      </p>
    );
  }

  if (state.kind === "unknown") {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        We could not reach the chains to check this address.{" "}
        <button type="button" className={LINK} onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  }

  return (
    <p role="status" className="text-muted-foreground text-xs">
      {state.kind === "unreadable-chain" ? (
        "That is not a chain we can read yet."
      ) : (
        <>
          No contract at this address on{" "}
          {state.tried === 1
            ? "that chain"
            : `any of the ${state.tried} chains we checked`}
          .
          {state.unreachable.length > 0
            ? ` ${chainList(state.unreachable)} did not answer, so we could not check there.`
            : null}
        </>
      )}{" "}
      <button type="button" className={LINK} onClick={onOtherChain}>
        It is on another chain
      </button>
    </p>
  );
}
