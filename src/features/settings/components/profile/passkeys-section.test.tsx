/**
 * Passkeys section - exercised through the real `@/lib/passkey` client with
 * the network mocked at the `fetch` level, so empty-vs-error handling,
 * request bodies, and the register ceremony ordering are all covered.
 *
 * The WebAuthn ceremony itself (`navigator.credentials.create`) cannot run
 * without a real authenticator, so `@simplewebauthn/browser` is mocked and
 * `PublicKeyCredential` is stubbed for feature detection.
 */
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PasskeyRecord } from "@/lib/passkey";

import PasskeysSection from "./passkeys-section";

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockedIsSupported = vi.mocked(browserSupportsWebAuthn);
const mockedStartRegistration = vi.mocked(startRegistration);

// --- fetch-level network mock -------------------------------------------

type MockedResponse = { status?: number; body?: unknown };
type RouteHandler = (init?: RequestInit) => MockedResponse;

let routes: Record<string, RouteHandler>;
let networkLog: Array<{ path: string; init?: RequestInit }>;

const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const path = Object.keys(routes).find((candidate) =>
      url.includes(candidate)
    );
    if (!path) throw new Error(`Unmocked fetch in test: ${url}`);
    networkLog.push({ path, init });
    const { status = 200, body = null } = routes[path](init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }
);

const parseBody = (init?: RequestInit): unknown =>
  init?.body ? JSON.parse(String(init.body)) : undefined;

// --------------------------------------------------------------------------

const samplePasskey: PasskeyRecord = {
  id: "pk_1",
  name: "MacBook Touch ID",
  deviceType: "platform",
  backedUp: true,
  createdAt: "2026-07-01T12:00:00.000Z",
};

const renderSection = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<PasskeysSection />, { wrapper });
};

describe("PasskeysSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routes = {};
    networkLog = [];
    mockedIsSupported.mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);
    // Feature-detection stub - no real authenticator exists in jsdom.
    vi.stubGlobal("PublicKeyCredential", class PublicKeyCredential {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders registered passkeys with name and created date", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({
      body: [samplePasskey],
    });

    renderSection();

    expect(await screen.findByText("MacBook Touch ID")).toBeTruthy();
    expect(screen.getByText(/Added/)).toBeTruthy();
  });

  it("shows the inviting empty-state CTA when the list is empty", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({ body: [] });

    renderSection();

    expect(
      await screen.findByText(
        /No passkeys yet - add one to sign in without a password/
      )
    ).toBeTruthy();
    // A single, prominent Add button (the empty-state CTA replaces the
    // header button so there's one obvious affordance).
    expect(
      screen.getAllByRole("button", { name: /Add passkey/i })
    ).toHaveLength(1);
    expect(screen.queryByText(/Couldn't load your passkeys/)).toBeNull();
  });

  it("treats a 404 from the list endpoint as empty, not an error", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({
      status: 404,
      body: { message: "Passkeys not found" },
    });

    renderSection();

    expect(await screen.findByText(/No passkeys yet/)).toBeTruthy();
    expect(screen.queryByText(/Couldn't load your passkeys/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Retry/i })).toBeNull();
  });

  it("treats an empty-ish body ({ passkeys: null }) as empty, not an error", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({
      body: { passkeys: null },
    });

    renderSection();

    expect(await screen.findByText(/No passkeys yet/)).toBeTruthy();
    expect(screen.queryByText(/Couldn't load your passkeys/)).toBeNull();
  });

  it("shows the error state for a real 500 and recovers via Retry", async () => {
    let listCalls = 0;
    routes["/passkey/list-user-passkeys"] = () => {
      listCalls += 1;
      return listCalls === 1
        ? { status: 500, body: { message: "Internal error" } }
        : { body: [samplePasskey] };
    };

    renderSection();

    expect(await screen.findByText(/Couldn't load your passkeys/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(await screen.findByText("MacBook Touch ID")).toBeTruthy();
    expect(screen.queryByText(/Couldn't load your passkeys/)).toBeNull();
  });

  it("registers a passkey: options → WebAuthn ceremony → verify → list refresh", async () => {
    const ceremonyOrder: string[] = [];
    let registered = false;
    const attestation = {
      id: "cred_1",
      rawId: "cred_1",
      type: "public-key",
      response: {},
      clientExtensionResults: {},
    };

    routes["/passkey/list-user-passkeys"] = () => ({
      body: registered ? [samplePasskey] : [],
    });
    routes["/passkey/generate-register-options"] = () => {
      ceremonyOrder.push("generate-register-options");
      return { body: { challenge: "base64url-challenge", rp: { id: "app" } } };
    };
    routes["/passkey/verify-registration"] = () => {
      ceremonyOrder.push("verify-registration");
      registered = true;
      return { body: samplePasskey };
    };
    mockedStartRegistration.mockImplementation(async () => {
      ceremonyOrder.push("startRegistration");
      return attestation as never;
    });

    renderSection();

    fireEvent.click(
      await screen.findByRole("button", { name: /Add passkey/i })
    );
    fireEvent.change(screen.getByLabelText("New passkey name"), {
      target: { value: "Work laptop" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    // The refreshed list renders the newly registered passkey.
    expect(await screen.findByText("MacBook Touch ID")).toBeTruthy();

    expect(ceremonyOrder).toEqual([
      "generate-register-options",
      "startRegistration",
      "verify-registration",
    ]);
    expect(mockedStartRegistration).toHaveBeenCalledWith({
      optionsJSON: { challenge: "base64url-challenge", rp: { id: "app" } },
    });
    const verifyCall = networkLog.find(
      (entry) => entry.path === "/passkey/verify-registration"
    );
    expect(parseBody(verifyCall?.init)).toEqual({
      response: attestation,
      name: "Work laptop",
    });
  });

  it("renames a passkey from its row action", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({ body: [samplePasskey] });
    routes["/passkey/update-passkey"] = () => ({ body: { status: true } });

    renderSection();

    fireEvent.click(
      await screen.findByRole("button", { name: /Rename passkey/i })
    );
    const nameInput = screen.getByLabelText("Passkey name");
    fireEvent.change(nameInput, { target: { value: "Personal Mac" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });

    await waitFor(() => {
      const renameCall = networkLog.find(
        (entry) => entry.path === "/passkey/update-passkey"
      );
      expect(parseBody(renameCall?.init)).toEqual({
        id: "pk_1",
        name: "Personal Mac",
      });
    });
  });

  it("deletes a passkey from its row action", async () => {
    routes["/passkey/list-user-passkeys"] = () => ({ body: [samplePasskey] });
    routes["/passkey/delete-passkey"] = () => ({ body: { status: true } });

    renderSection();

    fireEvent.click(
      await screen.findByRole("button", { name: /Delete passkey/i })
    );

    await waitFor(() => {
      const deleteCall = networkLog.find(
        (entry) => entry.path === "/passkey/delete-passkey"
      );
      expect(parseBody(deleteCall?.init)).toEqual({ id: "pk_1" });
    });
  });

  it("shows a graceful note when WebAuthn is unsupported", async () => {
    mockedIsSupported.mockReturnValue(false);
    routes["/passkey/list-user-passkeys"] = () => ({ body: [] });

    renderSection();

    expect(
      await screen.findByText(/aren't supported in this browser/)
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add passkey/i })).toBeNull();
  });
});
