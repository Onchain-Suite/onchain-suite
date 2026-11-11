import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedContract } from "../../contracts/resolve-contract";
import { onboardingService } from "../../onboarding.service";
import { ProjectContractField } from "./project-contract-field";

vi.mock("../../onboarding.service", () => ({
  onboardingService: { resolveContract: vi.fn(), requestChain: vi.fn() },
}));
vi.mock("../../hooks/use-supported-chains", () => ({
  useSupportedChains: () => [
    { key: "eth-mainnet", label: "Ethereum" },
    { key: "base-mainnet", label: "Base" },
  ],
}));

const resolve = vi.mocked(onboardingService.resolveContract);

const ON_BASE = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
const NOWHERE = "0x000000000000000000000000000000000000dead";

const answers: Record<string, ResolvedContract> = {
  [ON_BASE]: {
    found: true,
    address: ON_BASE,
    chain: "base-mainnet",
    chainLabel: "Base",
    standard: "erc20",
    kind: "token",
    name: "Uniswap",
    symbol: "UNI",
    decimals: 18,
    logo: null,
    verifiedOnChain: true,
    alsoOn: [],
  },
  [NOWHERE]: {
    found: false,
    address: NOWHERE,
    reason: "no-code",
    chainsTried: ["Ethereum", "Base"],
  },
};

/** The field with the two values its parent owns. */
function Harness({ initial = "" }: { initial?: string }) {
  const [contract, setContract] = useState(initial);
  const [chain, setChain] = useState<string | undefined>(undefined);
  return (
    <>
      <output data-testid="chain">{chain ?? "none"}</output>
      <ProjectContractField
        contract={contract}
        chain={chain}
        onContract={(value, { clearChain }) => {
          setContract(value);
          if (clearChain) setChain(undefined);
        }}
        onChain={(c) => setChain(c ?? undefined)}
        onKeyDown={() => undefined}
      />
    </>
  );
}

const renderField = (initial?: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Harness initial={initial} />
    </QueryClientProvider>
  );

const soon = { timeout: 3000 };

describe("ProjectContractField", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resolve.mockReset();
    resolve.mockImplementation(async ({ address }) => answers[address]);
  });

  it("sets the chain from the address, so nobody has to know its name", async () => {
    renderField(ON_BASE);

    expect(
      await screen.findByText("Uniswap (UNI), a token on Base.", {}, soon)
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("chain")).toHaveTextContent("base-mainnet")
    );
  });

  // The chain found for one address must not be kept for the next.
  it("drops the chain when the address is replaced by one found nowhere", async () => {
    renderField(ON_BASE);
    await waitFor(
      () =>
        expect(screen.getByTestId("chain")).toHaveTextContent("base-mainnet"),
      soon
    );

    fireEvent.change(screen.getByLabelText(/Contract address/), {
      target: { value: NOWHERE },
    });

    expect(
      await screen.findByText(
        /No contract at this address on any of the 2 chains we checked/,
        {},
        soon
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("chain")).toHaveTextContent("none")
    );
  });

  // Until the new lookup landed, the old address's chain was still set, and
  // continuing in that moment indexed the new address there.
  it("drops the chain the moment the address changes, before the lookup lands", async () => {
    renderField(ON_BASE);
    await waitFor(
      () =>
        expect(screen.getByTestId("chain")).toHaveTextContent("base-mainnet"),
      soon
    );

    fireEvent.change(screen.getByLabelText(/Contract address/), {
      target: { value: NOWHERE },
    });

    expect(screen.getByTestId("chain")).toHaveTextContent("none");
  });

  it("does not look anything up for a website or a name", async () => {
    renderField("acme.xyz");

    expect(screen.getByText("A website.")).toBeInTheDocument();
    // Past the debounce, still nothing was asked of the chain.
    await new Promise((r) => setTimeout(r, 600));
    expect(resolve).not.toHaveBeenCalled();
  });
});
