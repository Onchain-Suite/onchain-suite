"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { onboardingService } from "../onboarding.service";
import {
  type LookupState,
  lookupState,
  toAddress,
} from "../utils/contract-lookup";

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
 * Looks a pasted address up on the chain, shared by the project step and the
 * contract step so both say the same thing about the same address.
 *
 * With no `chain` the backend looks on every chain it indexes and answers with
 * the one holding the contract, which is the point: a bare address does not
 * say which chain it is on, and the person often does not know our name for
 * theirs. With a `chain` (they picked one by hand) only that chain is read.
 * The read is debounced, abortable and bounded by the service's timeout.
 */
export function useContractLookup(input: {
  /** What is in the address field, as typed. */
  raw: string;
  /** The chain the person picked by hand, or null to look everywhere. */
  chain: string | null;
  /** The project's chains, preferred when the address is on several. */
  preferred?: string[];
}): { state: LookupState; retry: () => void } {
  const address = toAddress(input.raw);
  const debounced = useDebounced(address);
  const preferred = input.preferred ?? [];

  const query = useQuery({
    queryKey: [
      "onboarding",
      "resolve-contract",
      debounced,
      input.chain,
      preferred.join(","),
    ],
    queryFn: ({ signal }) =>
      onboardingService.resolveContract(
        {
          address: debounced as string,
          ...(input.chain ? { chain: input.chain } : { chains: preferred }),
        },
        { signal }
      ),
    enabled: Boolean(debounced),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Typing has moved on from what the query last answered for: still looking.
  const settling = address !== debounced;
  return {
    state: lookupState({
      raw: input.raw,
      isLooking: settling || query.isPending || query.isFetching,
      isError: query.isError,
      result: settling ? undefined : query.data,
    }),
    retry: () => {
      query.refetch().catch(() => undefined);
    },
  };
}
