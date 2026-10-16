"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * Cloudflare Turnstile widget — the client half of the backend's bot gate on
 * sign-in, sign-up and public form submit. Renders the challenge, hands the
 * one-time token to `onVerify`, and exposes `reset()` so a form can request a
 * fresh token after a 400 (tokens are single-use and short-lived).
 *
 * The site key comes from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. When it's unset the
 * component renders nothing and callers should skip the check — mirroring the
 * backend, which is fail-open until its secret is configured, so nothing breaks
 * before cutover.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** True when a site key is configured, so callers know to require a token. */
export const isTurnstileConfigured = (): boolean => SITE_KEY.length > 0;

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    }
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Load the script once per page, no matter how many widgets mount.
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const ready = () => {
      const start = Date.now();
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        } else if (Date.now() - start > 10_000) {
          clearInterval(poll);
          reject(new Error("Turnstile failed to initialise"));
        }
      }, 50);
    };
    const existing = document.querySelector(
      'script[src^="https://challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      ready();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Clear the current token and re-issue the challenge (call after a 400). */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Called with the token on success, and with "" when it expires or errors. */
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  className?: string;
}

export const TurnstileWidget = forwardRef<
  TurnstileHandle,
  TurnstileWidgetProps
>(function TurnstileWidget(
  { onVerify, onExpire, theme = "auto", className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        onVerify("");
      }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        // Guard the double-mount React StrictMode does in dev.
        if (widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token: string) => onVerify(token),
          "error-callback": () => {
            setFailed(true);
            onVerify("");
          },
          "expired-callback": () => {
            onVerify("");
            onExpire?.();
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* already gone */
        }
        widgetIdRef.current = null;
      }
    };
    // Mount-once: the callbacks are read via refs Cloudflare keeps; re-running
    // this effect would double-render the widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Not configured → render nothing; the caller skips the token requirement.
  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {failed ? (
        <p className="mt-1 text-xs text-destructive">
          Couldn&apos;t load the verification widget. Refresh and try again.
        </p>
      ) : null}
    </div>
  );
});
