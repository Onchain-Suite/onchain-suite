import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as FacebookSdkModule from "../../utils/facebook-sdk";
import { WhatsAppEmbeddedSignup } from "./whatsapp-embedded-signup";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: {
    whatsappEmbeddedSettings: vi.fn(),
    whatsappEmbeddedComplete: vi.fn(),
  },
}));
const connection = vi.hoisted(() => ({ current: null as unknown }));
const org = vi.hoisted(() => ({ current: "org_1" }));
vi.mock("@/features/integrations/hooks/use-connections", () => ({
  CONNECTIONS_PREFIX: ["organization", "connections"],
  useConnection: () => ({
    organizationId: org.current,
    canManage: true,
    connection: connection.current,
  }),
}));
const login = vi.hoisted(() => vi.fn());
vi.mock("../../utils/facebook-sdk", async (orig) => ({
  ...(await orig<typeof FacebookSdkModule>()),
  loadFacebookSdk: vi.fn(async () => ({ init: vi.fn(), login })),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

const settings = vi.mocked(connectionsService.whatsappEmbeddedSettings);
const complete = vi.mocked(connectionsService.whatsappEmbeddedComplete);

const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: 0 } } });

const renderCard = (qc = client()) =>
  render(
    <QueryClientProvider client={qc}>
      <WhatsAppEmbeddedSignup />
    </QueryClientProvider>
  );

const postFromFacebook = (event: string, data: Record<string, unknown>) =>
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://www.facebook.com",
        data: JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event, data }),
      })
    );
  });

describe("WhatsAppEmbeddedSignup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connection.current = null;
    org.current = "org_1";
    settings.mockResolvedValue({
      enabled: true,
      appId: "111",
      configId: "222",
      graphVersion: "v23.0",
    });
    complete.mockResolvedValue({
      verified: true,
      label: "Acme",
      registered: true,
      warning: null,
    });
  });

  it("stays hidden when the server has no Meta app, or WhatsApp is connected", async () => {
    settings.mockResolvedValue({
      enabled: false,
      appId: null,
      configId: null,
      graphVersion: "v23.0",
    });
    const a = renderCard();
    await waitFor(() => expect(settings).toHaveBeenCalled());
    expect(a.container).toBeEmptyDOMElement();
    a.unmount();

    settings.mockResolvedValue({
      enabled: true,
      appId: "111",
      configId: "222",
      graphVersion: "v23.0",
    });
    connection.current = { connector: "whatsapp" };
    const b = renderCard();
    await waitFor(() => expect(settings).toHaveBeenCalledTimes(2));
    expect(b.container).toBeEmptyDOMElement();
  });

  it("opens Embedded Signup with the configuration and finishes once code and ids arrive", async () => {
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Connect WhatsApp" })
    );
    // Called inside the click itself, so the popup keeps its user gesture.
    expect(login).toHaveBeenCalledTimes(1);
    expect(login.mock.calls[0][1]).toMatchObject({
      config_id: "222",
      response_type: "code",
      override_default_response_type: true,
    });
    // The ids arrive first, then the code: nothing is sent until both are here.
    postFromFacebook("FINISH", {
      waba_id: "102290129340398",
      phone_number_id: "106540352242922",
    });
    expect(complete).not.toHaveBeenCalled();
    act(() => login.mock.calls[0][0]({ authResponse: { code: "one-time" } }));
    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith(
        {
          code: "one-time",
          wabaId: "102290129340398",
          phoneNumberId: "106540352242922",
        },
        "org_1"
      )
    );
  });

  it("a closed window or a cancel sends nothing and re-enables the button", async () => {
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Connect WhatsApp" })
    );
    await waitFor(() => expect(login).toHaveBeenCalled());
    postFromFacebook("CANCEL", { current_step: "WABA_SETUP" });
    act(() => login.mock.calls[0][0]({ authResponse: null }));
    expect(
      await screen.findByRole("button", { name: "Connect WhatsApp" })
    ).toBeEnabled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("switching workspace mid-signup abandons it instead of saving to the new org", async () => {
    const qc = client();
    const view = renderCard(qc);
    fireEvent.click(
      await screen.findByRole("button", { name: "Connect WhatsApp" })
    );
    expect(login).toHaveBeenCalledTimes(1);
    act(() => login.mock.calls[0][0]({ authResponse: { code: "one-time" } }));

    org.current = "org_2";
    view.rerender(
      <QueryClientProvider client={qc}>
        <WhatsAppEmbeddedSignup />
      </QueryClientProvider>
    );
    postFromFacebook("FINISH", {
      waba_id: "102290129340398",
      phone_number_id: "106540352242922",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("ignores Facebook messages when no signup was started here", async () => {
    renderCard();
    await screen.findByRole("button", { name: "Connect WhatsApp" });
    postFromFacebook("FINISH", {
      waba_id: "102290129340398",
      phone_number_id: "106540352242922",
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
