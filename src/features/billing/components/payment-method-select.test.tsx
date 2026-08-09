import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaymentMethodSelect } from "./payment-method-select";

describe("PaymentMethodSelect", () => {
  it("exposes both methods as a single accessible radiogroup", () => {
    render(<PaymentMethodSelect value="card" onChange={vi.fn()} />);

    const group = screen.getByRole("radiogroup", { name: "Payment method" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Card/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Crypto/ })).not.toBeChecked();
  });

  it("reports the newly picked method to the caller", () => {
    const onChange = vi.fn();
    render(<PaymentMethodSelect value="card" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /Crypto/ }));

    expect(onChange).toHaveBeenCalledWith("crypto");
  });

  it("reflects a crypto selection driven from props", () => {
    render(<PaymentMethodSelect value="crypto" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Crypto/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Card/ })).not.toBeChecked();
  });

  it("cannot be changed while a checkout is already starting", () => {
    const onChange = vi.fn();
    render(<PaymentMethodSelect value="card" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("radio", { name: /Crypto/ }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps ids unique across instances so labels target the right input", () => {
    render(
      <>
        <PaymentMethodSelect value="card" onChange={vi.fn()} />
        <PaymentMethodSelect value="card" onChange={vi.fn()} />
      </>
    );

    const ids = screen.getAllByRole("radio").map((el) => el.getAttribute("id"));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
