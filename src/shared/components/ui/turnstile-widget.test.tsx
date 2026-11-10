import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("TurnstileWidget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete window.turnstile;
  });

  it("renders the challenge with its action, so the backend can check it", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAAAAAATEST");
    const renderWidget = vi.fn(
      (_el: HTMLElement, _opts: Record<string, unknown>) => "widget-1"
    );
    window.turnstile = {
      render: renderWidget,
      reset: vi.fn(),
      remove: vi.fn(),
    };
    // The site key is read when the module loads, so import after stubbing it.
    const { TurnstileWidget } = await import("./turnstile-widget");

    render(<TurnstileWidget action="signup" onVerify={() => undefined} />);

    await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
    expect(renderWidget.mock.calls[0]?.[1]).toMatchObject({
      sitekey: "0x4AAAAAAATEST",
      action: "signup",
    });
  });

  it("renders nothing when no site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const { TurnstileWidget } = await import("./turnstile-widget");
    const { container } = render(
      <TurnstileWidget action="login" onVerify={() => undefined} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
