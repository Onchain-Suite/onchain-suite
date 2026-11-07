import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsentImportCard } from "./consent-import-card";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: { consentImport: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const importChunk = vi.mocked(connectionsService.consentImport);

const WORDING =
  "I agree to receive marketing texts from Acme. Reply STOP to opt out.";

const csvFile = (text: string, name = "list.csv") => {
  const file = new File([text], name, { type: "text/csv" });
  // jsdom's File has no text(); give it one.
  Object.defineProperty(file, "text", { value: async () => text });
  return file;
};

const fill = () => {
  fireEvent.change(screen.getByLabelText("Consent wording they agreed to"), {
    target: { value: WORDING },
  });
  fireEvent.change(screen.getByLabelText("Where they agreed"), {
    target: { value: "https://app.acme.xyz/alerts" },
  });
};

const upload = (text: string) =>
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [csvFile(text)] },
  });

describe("ConsentImportCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names the required columns a file is missing and won't import it", async () => {
    render(<ConsentImportCard channel="sms" />);
    fill();
    upload("wallet,phone\n0xa,+14155552671\n");
    expect(
      await screen.findByText(/missing consented_at column/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("sends the file in chunks of 500 and adds up the results", async () => {
    const lines = ["wallet,phone,consented_at"];
    for (let i = 0; i < 501; i++)
      lines.push(`0x${i},+1415555${String(i).padStart(4, "0")},2026-01-02`);
    importChunk
      .mockResolvedValueOnce({
        received: 500,
        imported: 498,
        alreadyConsented: 0,
        suppressed: 1,
        duplicate: 0,
        invalid: 1,
        errors: [{ row: 7, reason: "phone_invalid" }],
      })
      .mockResolvedValueOnce({
        received: 1,
        imported: 1,
        alreadyConsented: 0,
        suppressed: 0,
        duplicate: 0,
        invalid: 0,
        errors: [],
      });
    render(<ConsentImportCard channel="sms" />);
    fill();
    upload(lines.join("\n"));
    await screen.findByText(/501 rows ready/);
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(importChunk).toHaveBeenCalledTimes(2));
    const [[channel, body]] = importChunk.mock.calls;
    expect(channel).toBe("sms");
    expect(body.consentText).toBe(WORDING);
    expect(body.rows).toHaveLength(500);
    expect(body.rows[0]).toEqual({
      walletAddress: "0x0",
      phone: "+14155550000",
      consentedAt: "2026-01-02",
    });
    expect(importChunk.mock.calls[1][1].rows).toHaveLength(1);

    expect(await screen.findByText("499")).toBeInTheDocument();
    // Row 7 of the first chunk is line 9 of the file (after the header).
    expect(
      screen.getByText(/Line 9: phone number isn't valid/)
    ).toBeInTheDocument();
  });

  it("needs real consent wording before it will import", async () => {
    render(<ConsentImportCard channel="whatsapp" />);
    upload("wallet,phone,consented_at\n0xa,+14155552671,2026-01-02\n");
    await screen.findByText(/1 row ready/);
    fireEvent.change(screen.getByLabelText("Where they agreed"), {
      target: { value: "app" },
    });
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });
});
