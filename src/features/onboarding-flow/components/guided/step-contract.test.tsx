import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedContract } from "../../contracts/resolve-contract";
import { onboardingService } from "../../onboarding.service";
import { StepContract } from "./step-contract";

vi.mock("../../onboarding.service", () => ({
  onboardingService: {
    resolveContract: vi.fn(),
    requestChain: vi.fn(),
  },
}));
vi.mock("../../hooks/use-supported-chains", () => ({
  useSupportedChains: () => [
    { key: "eth-mainnet", label: "Ethereum" },
    { key: "base-mainnet", label: "Base" },
    { key: "arb-mainnet", label: "Arbitrum" },
  ],
}));

const resolve = vi.mocked(onboardingService.resolveContract);
const requestChain = vi.mocked(onboardingService.requestChain);

const ADDR = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

const found = (over: Record<string, unknown> = {}): ResolvedContract =>
  ({
    found: true,
    address: ADDR,
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
    ...over,
  }) as ResolvedContract;

const nowhere: ResolvedContract = {
  found: false,
  address: ADDR,
  reason: "no-code",
  chainsTried: ["Ethereum", "Base", "Arbitrum"],
};

function renderStep(onChain = vi.fn(), chain: string | null = null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StepContract
        value={ADDR}
        onChange={vi.fn()}
        chain={chain}
        onChain={onChain}
        manual={null}
        onManual={vi.fn()}
        chains={[]}
      />
    </QueryClientProvider>
  );
  return { onChain };
}

// The lookup is debounced, so answers land a beat after render.
const soon = { timeout: 3000 };

describe("StepContract", () => {
  beforeEach(() => {
    // "It is on another chain" is remembered for the session.
    window.sessionStorage.clear();
    resolve.mockReset();
    requestChain.mockReset();
  });

  it("finds the chain from the address alone and reports it up", async () => {
    resolve.mockResolvedValue(found());
    const { onChain } = renderStep();

    expect(await screen.findByText("Uniswap", {}, soon)).toBeInTheDocument();
    expect(screen.getByText(/Verified on Base/)).toBeInTheDocument();
    // No chain was named: the backend looked everywhere.
    expect(resolve.mock.calls[0][0]).toEqual({ address: ADDR, chains: [] });
    await waitFor(() => expect(onChain).toHaveBeenCalledWith("base-mainnet"));
  });

  it("offers the other chains the same address is on", async () => {
    resolve.mockResolvedValue(
      found({ alsoOn: [{ chain: "arb-mainnet", chainLabel: "Arbitrum" }] })
    );
    renderStep();

    fireEvent.click(
      await screen.findByRole("button", { name: "Arbitrum" }, soon)
    );

    await waitFor(
      () =>
        expect(resolve).toHaveBeenCalledWith(
          { address: ADDR, chain: "arb-mainnet" },
          expect.anything()
        ),
      soon
    );
  });

  it("says where it looked, and reports no chain, when the address is nowhere", async () => {
    resolve.mockResolvedValue(nowhere);
    const { onChain } = renderStep();

    expect(
      await screen.findByText(
        /No contract at this address on any of the 3 chains we checked/,
        {},
        soon
      )
    ).toBeInTheDocument();
    expect(onChain).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("takes note of a chain we do not index", async () => {
    resolve.mockResolvedValue(nowhere);
    requestChain.mockResolvedValue({ recorded: true, chain: "Berachain" });
    renderStep();

    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "It is on another chain" },
        soon
      )
    );
    fireEvent.change(screen.getByLabelText("Which chain is it on?"), {
      target: { value: "Berachain" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tell us" }));

    expect(await screen.findByText(/Noted: Berachain/)).toBeInTheDocument();
    expect(requestChain).toHaveBeenCalledWith({
      chain: "Berachain",
      address: ADDR,
    });
  });

  it("reads the address on the chain when the name is one we do index", async () => {
    resolve.mockResolvedValue(nowhere);
    requestChain.mockResolvedValue({
      recorded: false,
      supported: { chain: "arb-mainnet", chainLabel: "Arbitrum" },
    });
    renderStep();

    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "It is on another chain" },
        soon
      )
    );
    fireEvent.change(screen.getByLabelText("Which chain is it on?"), {
      target: { value: "arbitrum one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tell us" }));

    await waitFor(
      () =>
        expect(resolve).toHaveBeenCalledWith(
          { address: ADDR, chain: "arb-mainnet" },
          expect.anything()
        ),
      soon
    );
  });

  // Coming back to the step used to look everywhere again and could move the
  // contract to another chain the same address is deployed on.
  it("reads only the chain already chosen when the step is revisited", async () => {
    resolve.mockResolvedValue(
      found({ chain: "arb-mainnet", chainLabel: "Arbitrum" })
    );
    const { onChain } = renderStep(vi.fn(), "arb-mainnet");

    expect(
      await screen.findByText(/Verified on Arbitrum/, {}, soon)
    ).toBeTruthy();
    expect(resolve).toHaveBeenCalledWith(
      { address: ADDR, chain: "arb-mainnet" },
      expect.anything()
    );
    expect(onChain).not.toHaveBeenCalled();
  });

  // The note says setup carries on without a contract; that has to be true.
  it("lets go of a deployment we found once they say it is on a chain we do not index", async () => {
    resolve.mockResolvedValue(
      found({ alsoOn: [{ chain: "arb-mainnet", chainLabel: "Arbitrum" }] })
    );
    requestChain.mockResolvedValue({ recorded: true, chain: "Berachain" });
    const { onChain } = renderStep();
    await screen.findByText("Uniswap", {}, soon);
    await waitFor(() => expect(onChain).toHaveBeenCalledWith("base-mainnet"));

    fireEvent.click(screen.getByRole("combobox", { name: "Chain" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Another chain…" })
    );
    fireEvent.change(screen.getByLabelText("Which chain is it on?"), {
      target: { value: "Berachain" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tell us" }));

    expect(await screen.findByText(/Noted: Berachain/)).toBeInTheDocument();
    await waitFor(() => expect(onChain).toHaveBeenLastCalledWith(null));
    expect(screen.queryByText(/Verified on Base/)).toBeNull();
  });

  // The step unmounts as the wizard moves; coming back used to look the
  // address up again and re-select the deployment they had turned down.
  it("still has no contract selected when the step is revisited after that", async () => {
    resolve.mockResolvedValue(found());
    requestChain.mockResolvedValue({ recorded: true, chain: "Berachain" });
    const first = renderStep();
    await screen.findByText("Uniswap", {}, soon);
    fireEvent.click(screen.getByRole("combobox", { name: "Chain" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Another chain…" })
    );
    fireEvent.change(screen.getByLabelText("Which chain is it on?"), {
      target: { value: "Berachain" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tell us" }));
    await screen.findByText(/Noted: Berachain/);
    cleanup();

    const again = renderStep();
    await new Promise((r) => setTimeout(r, 700));

    expect(screen.queryByText(/Verified on Base/)).toBeNull();
    expect(again.onChain).not.toHaveBeenCalledWith("base-mainnet");
    expect(first.onChain).toHaveBeenLastCalledWith(null);
  });

  // Having said "another chain" once, then naming one we do index, left the
  // contract suppressed: found, but never selected for indexing.
  it("selects the contract again when the chain turns out to be one we index", async () => {
    window.sessionStorage.setItem("onchain.onboarding.contractElsewhere", ADDR);
    resolve.mockResolvedValue(
      found({ chain: "arb-mainnet", chainLabel: "Arbitrum" })
    );
    requestChain.mockResolvedValue({
      recorded: false,
      supported: { chain: "arb-mainnet", chainLabel: "Arbitrum" },
    });
    const { onChain } = renderStep();

    fireEvent.change(await screen.findByLabelText("Which chain is it on?"), {
      target: { value: "arbitrum one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tell us" }));

    expect(
      await screen.findByText(/Verified on Arbitrum/, {}, soon)
    ).toBeInTheDocument();
    await waitFor(() => expect(onChain).toHaveBeenCalledWith("arb-mainnet"));
  });

  it("does not call an address wrong when the lookup could not run", async () => {
    resolve.mockRejectedValue(new Error("timeout"));
    renderStep();

    expect(
      await screen.findByText(/We could not reach the chains/, {}, soon)
    ).toBeInTheDocument();
    expect(screen.queryByText(/No contract at this address/)).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
