import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { type ConsentDraft, EMPTY_CONSENT_DRAFT } from "../../utils/consent";
import { ConsentDeclarationFields } from "./consent-declaration-fields";

function Harness({ onDraft }: { onDraft: (d: ConsentDraft) => void }) {
  const [d, setD] = useState<ConsentDraft>({
    ...EMPTY_CONSENT_DRAFT,
    source: "other",
  });
  return (
    <ConsentDeclarationFields
      value={d}
      onChange={(n) => {
        setD(n);
        onDraft(n);
      }}
      error="Describe how these contacts opted in."
    />
  );
}

describe("ConsentDeclarationFields", () => {
  it("explains that bought lists are not allowed and the per-row date columns", () => {
    render(<Harness onDraft={() => undefined} />);
    expect(
      screen.getByText(/How did these contacts opt in/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bought, rented or scraped lists/)
    ).toBeInTheDocument();
    expect(screen.getByText("opt_in_date")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Describe/);
  });

  it("edits the other description, proof and double opt-in", () => {
    let last: ConsentDraft = EMPTY_CONSENT_DRAFT;
    render(<Harness onDraft={(d) => (last = d)} />);
    fireEvent.change(screen.getByLabelText("Describe how they opted in"), {
      target: { value: "Telegram bot" },
    });
    expect(last.otherSource).toBe("Telegram bot");
    fireEvent.change(screen.getByLabelText(/Proof or notes/), {
      target: { value: "https://x.test" },
    });
    expect(last.proof).toBe("https://x.test");
    fireEvent.click(screen.getByLabelText(/double opt-in/));
    expect(last.doubleOptIn).toBe(true);
  });
});
