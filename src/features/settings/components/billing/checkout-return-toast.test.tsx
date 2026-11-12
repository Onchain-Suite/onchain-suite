import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutReturnToast } from "./checkout-return-toast";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.params,
}));
const toast = vi.hoisted(() => ({ message: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

function renderAt(query: string) {
  nav.params = new URLSearchParams(query);
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={client}>
      <CheckoutReturnToast />
    </QueryClientProvider>
  );
  return { invalidate, ...view, client };
}

describe("CheckoutReturnToast", () => {
  beforeEach(() => {
    nav.replace.mockClear();
    toast.message.mockClear();
    toast.success.mockClear();
  });

  it("says a cancelled checkout charged nothing, then cleans the address", () => {
    const { invalidate } = renderAt("tab=billing&checkout=canceled&ref=abc");
    expect(toast.message).toHaveBeenCalledWith(
      "Checkout cancelled. You have not been charged."
    );
    expect(nav.replace).toHaveBeenCalledWith("/settings?tab=billing", {
      scroll: false,
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("confirms a change of size and reads the billing figures again", () => {
    const { invalidate } = renderAt("tab=billing&subscription=updated");
    expect(toast.success).toHaveBeenCalledWith(
      "Plan updated. The price below is what you pay now."
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["billing"] });
  });

  it("says it once, however often the tab re-renders", () => {
    const { rerender, client } = renderAt("tab=billing&checkout=canceled");
    for (let i = 0; i < 3; i += 1) {
      rerender(
        <QueryClientProvider client={client}>
          <CheckoutReturnToast />
        </QueryClientProvider>
      );
    }
    expect(toast.message).toHaveBeenCalledTimes(1);
  });

  it("says nothing on a plain visit to the billing tab", () => {
    renderAt("tab=billing");
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
