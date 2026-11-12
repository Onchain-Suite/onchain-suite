import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SenderDomains } from "./sender-domains";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org1" }),
}));
vi.mock("@/features/common/layout/components/org-switcher-context", () => ({
  useOrgSwitcherContextOptional: () => ({ activeOrg: { name: "Acme" } }),
}));
const service = vi.hoisted(() => ({
  listDomains: vi.fn(),
  createDomain: vi.fn(),
  deleteDomain: vi.fn(),
  getDomainDns: vi.fn(),
  provisionDomain: vi.fn(),
  recheckDomain: vi.fn(),
}));
vi.mock("@/features/settings/sender-identities.service", () => ({
  senderIdentitiesService: service,
}));

function renderPanel(defaultDomain?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SenderDomains defaultDomain={defaultDomain} />
    </QueryClientProvider>
  );
}

const report = {
  sendReady: false,
  records: [
    {
      id: "1",
      host: "abc._domainkey",
      fqdn: "abc._domainkey.mail.acme.com",
      type: "CNAME",
      value: "abc.dkim.amazonses.com",
      verification: "Verified",
    },
    {
      id: "2",
      host: "_dmarc",
      fqdn: "_dmarc.mail.acme.com",
      type: "TXT",
      value: "v=DMARC1; p=none;",
      verification: "NotStarted",
    },
  ],
};

describe("SenderDomains", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.provisionDomain.mockResolvedValue({ domain: "", providers: [] });
    service.getDomainDns.mockResolvedValue(report);
  });

  it("asks for a sending domain when there is none", async () => {
    service.listDomains.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByLabelText("Sending domain")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Generate DNS records" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("will not generate records for something that is not a domain", async () => {
    service.listDomains.mockResolvedValue([]);
    renderPanel();
    fireEvent.change(await screen.findByLabelText("Sending domain"), {
      target: { value: "acme" },
    });
    expect(screen.getByText("Enter a domain like mail.acme.com.")).toBeTruthy();
    fireEvent.submit(
      screen.getByRole("button", { name: "Generate DNS records" })
    );
    expect(service.createDomain).not.toHaveBeenCalled();
  });

  // Pasted from the address bar, a domain arrives with a scheme, www and a path.
  it("registers the bare host of whatever was typed", async () => {
    service.listDomains.mockResolvedValue([]);
    service.createDomain.mockResolvedValue({ id: "d1" });
    renderPanel();
    fireEvent.change(await screen.findByLabelText("Sending domain"), {
      target: { value: " https://www.Mail.Acme.com/welcome " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate DNS records" })
    );
    await waitFor(() =>
      expect(service.createDomain).toHaveBeenCalledWith("mail.acme.com", "org1")
    );
  });

  it("starts onboarding's form on the domain it suggests", async () => {
    service.listDomains.mockResolvedValue([]);
    renderPanel("https://acme.com/");
    const input = await screen.findByLabelText("Sending domain");
    expect((input as HTMLInputElement).value).toBe("acme.com");
  });

  it("shows a waiting domain's records and how many were found", async () => {
    service.listDomains.mockResolvedValue([
      { id: "d1", domain: "mail.acme.com", status: "PENDING_VERIFICATION" },
    ]);
    renderPanel();
    expect(await screen.findByText("Waiting on DNS")).toBeTruthy();
    expect(await screen.findByText("1 of 2")).toBeTruthy();
    // Short hosts appear once the public suffix list has placed the zone.
    expect(await screen.findByText("abc._domainkey.mail")).toBeTruthy();
    expect(service.getDomainDns).toHaveBeenCalledWith("d1", "org1");
    expect(
      screen.getByRole("button", { name: "Add another domain" })
    ).toBeTruthy();
  });

  // A verified domain has nothing left to add, so its records are folded away
  // and are not even fetched until someone asks to see them.
  it("keeps a verified domain's records folded away", async () => {
    service.listDomains.mockResolvedValue([
      { id: "d2", domain: "news.acme.com", status: "VERIFIED" },
    ]);
    renderPanel();
    expect(await screen.findByText("Verified")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show records" })).toBeTruthy();
    expect(service.getDomainDns).not.toHaveBeenCalled();
    expect(service.provisionDomain).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show records" }));
    await waitFor(() =>
      expect(service.getDomainDns).toHaveBeenCalledWith("d2", "org1")
    );
    expect(service.provisionDomain).not.toHaveBeenCalled();
  });

  it("checks DNS again on request, and says when the domain verified", async () => {
    const { toast } = await import("sonner");
    service.listDomains.mockResolvedValue([
      { id: "d1", domain: "mail.acme.com", status: "PENDING_VERIFICATION" },
    ]);
    service.recheckDomain.mockResolvedValue({ status: "VERIFIED" });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /Check now/ }));
    await waitFor(() =>
      expect(service.recheckDomain).toHaveBeenCalledWith("d1", "org1")
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "mail.acme.com verified. Email can send."
      )
    );
  });
});
