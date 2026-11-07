import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SmsOptInCard } from "./sms-optin-card";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: { smsOptInLink: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mint = vi.mocked(connectionsService.smsOptInLink);

const linkFor = (wallet: string) => ({
  url: `sms:+14155550100?&body=Connect%20me%3A%20token-${wallet}`,
  smsNumber: "+14155550100",
  body: `Connect me: token-${wallet}`,
  expiresInSeconds: 1800,
});

const renderCard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })}
    >
      <SmsOptInCard />
    </QueryClientProvider>
  );

const typeWallet = (value: string) =>
  fireEvent.change(screen.getByLabelText("Wallet address"), {
    target: { value },
  });

describe("SmsOptInCard", () => {
  // Braces matter: a function returned from beforeEach is run as teardown, and
  // mockReset() returns the mock itself.
  beforeEach(() => {
    mint.mockReset();
  });

  it("shows the link minted for the wallet in the field, labelled with it", async () => {
    mint.mockResolvedValue(linkFor("0xA"));
    renderCard();
    typeWallet("0xA");
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    expect(await screen.findByText("Connect me: token-0xA")).toBeTruthy();
    expect(screen.getByText("0xA")).toBeTruthy();
    expect(mint).toHaveBeenCalledWith("0xA", "org_1");
  });

  it("drops the link as soon as the wallet changes", async () => {
    mint.mockResolvedValue(linkFor("0xA"));
    renderCard();
    typeWallet("0xA");
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await screen.findByText("Connect me: token-0xA");

    typeWallet("0xB");
    expect(screen.queryByText("Connect me: token-0xA")).toBeNull();
  });

  it("never shows a link that resolves after the wallet was changed", async () => {
    let resolve!: (v: ReturnType<typeof linkFor>) => void;
    mint.mockImplementation(
      () => new Promise((r) => (resolve = r as typeof resolve))
    );
    renderCard();
    typeWallet("0xA");
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    await waitFor(() => expect(mint).toHaveBeenCalledWith("0xA", "org_1"));
    // The operator edits the wallet while 0xA's request is still in flight.
    typeWallet("0xB");
    await act(async () => resolve(linkFor("0xA")));

    expect(screen.queryByText("Connect me: token-0xA")).toBeNull();
  });
});
