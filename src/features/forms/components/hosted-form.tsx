"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CaptureFieldSpec, FormDisplaySettings } from "../forms.service";
import { FormRenderer } from "./form-renderer";

/** Minimal EIP-1193 provider surface we rely on (no wallet SDK). */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

/**
 * Pull a human-readable string out of an API error payload. Backends return the
 * error as a plain string OR a nested object ({ error: { message } }); passing
 * the object straight to `new Error()` renders the dreaded "[object Object]".
 */
function errText(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const root = payload as { error?: unknown; message?: unknown };
    const candidate = root.error ?? root.message;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as { message?: unknown }).message;
      if (typeof nested === "string" && nested.trim()) return nested;
    }
  }
  return fallback;
}

export interface HostedFormConfig {
  token: string;
  name: string;
  fields: CaptureFieldSpec[];
  settings: Record<string, unknown>;
  display: FormDisplaySettings;
  zkEnabled: boolean;
}

interface WalletProof {
  address: string;
  signature: string;
  nonce: string;
}

/**
 * Interactive hosted form for `/f/[token]`. Wallet connect is a light EIP-1193
 * flow (request accounts → fetch nonce → `personal_sign`), with no wallet SDK.
 * X / Farcaster linking opens the backend OAuth flow in a popup and listens for
 * the callback's postMessage. Submission POSTs to the public proxy.
 */
export function HostedForm({ config }: { config: HostedFormConfig }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [wallet, setWallet] = useState<WalletProof | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const [linkedHandles, setLinkedHandles] = useState<Record<string, string>>(
    {}
  );
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Backend returns pendingConfirmation:true when double opt-in is on and the
  // contact must click a confirmation link before they actually join. Telling
  // someone they are subscribed when they are not is how that email gets ignored.
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Listen for the OAuth callback popup posting back a linked channel.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as {
        type?: string;
        channel?: string;
        handle?: string;
      } | null;
      const channel = data?.channel;
      if (data?.type !== "onchain-form-link" || !channel) return;
      setLinked((p) => ({ ...p, [channel]: true }));
      const { handle } = data;
      if (handle) {
        setLinkedHandles((p) => ({ ...p, [channel]: handle }));
      }
      popupRef.current?.close();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const hasField = useCallback(
    (type: string) => config.fields.some((f) => (f.type ?? "text") === type),
    [config.fields]
  );

  const connectWallet = useCallback(async () => {
    setError(null);
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No wallet detected. Install a browser wallet to continue.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("No account returned by the wallet.");

      // The address is the identity we need - capture it up front so a connected
      // wallet is never lost to a hiccup in the optional ownership proof below.
      setWallet({ address, signature: "", nonce: "" });

      // Best-effort signature proof (nonce -> personal_sign). If the
      // verification service is unavailable we keep the address-only connection
      // rather than failing the whole connect.
      try {
        const nonceRes = await fetch(
          `/api/forms/${encodeURIComponent(config.token)}/nonce?wallet=${address}`
        );
        const noncePayload = (await nonceRes.json().catch(() => ({}))) as {
          nonce?: string;
          message?: string;
          data?: { nonce?: string; message?: string };
        };
        const nonce = noncePayload.nonce ?? noncePayload.data?.nonce ?? "";
        if (nonceRes.ok && nonce) {
          const message =
            noncePayload.message ??
            noncePayload.data?.message ??
            `Sign in to ${config.name}: ${nonce}`;
          const signature = (await provider.request({
            method: "personal_sign",
            params: [message, address],
          })) as string;
          setWallet({ address, signature, nonce });
        }
      } catch {
        // Signature declined or verification unavailable - the connected
        // address still stands; submission proceeds with it.
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet connection failed.";
      // 4001 = user rejected the connection request
      setError(
        msg.includes("4001") || msg.toLowerCase().includes("reject")
          ? "Wallet connection was rejected."
          : msg
      );
    } finally {
      setConnecting(false);
    }
  }, [config.token, config.name]);

  const linkChannel = useCallback(
    (type: "x" | "farcaster") => {
      const w = 520;
      const h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      popupRef.current = window.open(
        `/api/forms/${encodeURIComponent(config.token)}/oauth/${type}`,
        "onchain-oauth",
        `width=${w},height=${h},left=${left},top=${top}`
      );
    },
    [config.token]
  );

  const submit = useCallback(async () => {
    setError(null);

    if (hasField("wallet") && !wallet) {
      setError("Connect your wallet to continue.");
      return;
    }
    const consentField = config.fields.find(
      (f) => (f.type ?? "text") === "consent"
    );
    if (consentField && !consent) {
      setError("Please accept the consent to continue.");
      return;
    }
    for (const field of config.fields) {
      const type = field.type ?? "text";
      if (!field.required) continue;
      if (type === "email" || type === "text") {
        if (!values[field.key]?.trim()) {
          setError(`${field.label ?? field.key} is required.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/forms/${encodeURIComponent(config.token)}/submit`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fields: values,
            consent,
            wallet: wallet
              ? {
                  address: wallet.address,
                  signature: wallet.signature,
                  nonce: wallet.nonce,
                }
              : null,
            channels: linkedHandles,
          }),
        }
      );
      const payload = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        pendingConfirmation?: boolean;
      };
      if (!res.ok) throw new Error(errText(payload, "Submission failed."));
      setPendingConfirmation(payload.pendingConfirmation === true);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }, [
    config.fields,
    config.token,
    values,
    consent,
    wallet,
    linkedHandles,
    hasField,
  ]);

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0f12] p-8 text-center text-white">
        <CheckCircleIcon
          className="mx-auto size-12 text-emerald-400"
          aria-hidden="true"
        />
        {pendingConfirmation ? (
          <>
            <h2 className="mt-4 text-xl font-bold">Check your email</h2>
            <p className="mt-2 text-sm text-white/60">
              Almost there. Click the confirmation link we just emailed you to
              finish subscribing.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-xl font-bold">You&apos;re in</h2>
            <p className="mt-2 text-sm text-white/60">
              {config.display.successMessage ??
                "Thanks - watch your inbox for what's next."}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <FormRenderer
      name={config.name}
      fields={config.fields}
      settings={config.settings}
      zkEnabled={config.zkEnabled}
      live={{
        values,
        onChange: (key, value) => setValues((p) => ({ ...p, [key]: value })),
        walletAddress: wallet?.address ?? null,
        onConnectWallet: connectWallet,
        connectingWallet: connecting,
        linkedChannels: linked,
        onLinkChannel: linkChannel,
        consent,
        onConsent: setConsent,
        onSubmit: submit,
        submitting,
        error,
      }}
    />
  );
}
