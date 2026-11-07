import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WhatsAppOptInCard } from "./whatsapp-optin-card";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: { whatsappOptInLink: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mint = vi.mocked(connectionsService.whatsappOptInLink);
const url = "https://wa.me/14155550100?text=Connect%20me%3A%20abc";

const renderCard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })}
    >
      <WhatsAppOptInCard />
    </QueryClientProvider>
  );

const typeWallet = (value: string) =>
  fireEvent.change(screen.getByLabelText("Wallet address"), {
    target: { value },
  });

describe("WhatsAppOptInCard", () => {
  // Braces: a function returned from beforeEach is run as teardown.
  beforeEach(() => {
    mint.mockReset();
  });

  it("mints a wa.me link for the wallet and shows it with that wallet", async () => {
    mint.mockResolvedValue({ url, expiresInSeconds: 1800 });
    renderCard();
    typeWallet("0xA");
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    expect(await screen.findByText(url)).toBeTruthy();
    expect(screen.getByText("0xA")).toBeTruthy();
    expect(screen.getByText("Expires in 30 minutes. One use.")).toBeTruthy();
    expect(mint).toHaveBeenCalledWith("0xA", "org_1");
  });

  it("drops the link when the wallet changes", async () => {
    mint.mockResolvedValue({ url, expiresInSeconds: 1800 });
    renderCard();
    typeWallet("0xA");
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await screen.findByText(url);

    typeWallet("0xB");
    expect(screen.queryByText(url)).toBeNull();
  });
});
