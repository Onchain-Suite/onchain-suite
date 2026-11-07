/**
 * Loading the Facebook JS SDK once, and reading Embedded Signup's session
 * messages. Kept apart from the component so both are testable.
 */

interface FbLoginResponse {
  authResponse?: { code?: string } | null;
  status?: string;
}

export interface FacebookSdk {
  init(params: {
    appId: string;
    autoLogAppEvents: boolean;
    xfbml: boolean;
    version: string;
  }): void;
  login(
    callback: (r: FbLoginResponse) => void,
    options: Record<string, unknown>
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
let loading: Promise<FacebookSdk> | null = null;

/** Load and init the SDK for this app id. Resolves with `window.FB`. */
export function loadFacebookSdk(
  appId: string,
  version: string
): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  if (loading) return loading;
  loading = new Promise<FacebookSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) return reject(new Error("Facebook didn't load."));
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB);
    };
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      loading = null;
      reject(
        new Error(
          "Facebook couldn't be reached. Check an ad blocker isn't blocking it."
        )
      );
    };
    document.body.appendChild(script);
  });
  return loading;
}

export type SignupEvent =
  | { kind: "finish"; wabaId: string; phoneNumberId: string }
  | { kind: "cancel"; step: string | null }
  | { kind: "error"; message: string };

/**
 * Embedded Signup posts its result to the opener as a JSON string with
 * `type: "WA_EMBEDDED_SIGNUP"`. Only messages from facebook.com are trusted;
 * anything else is ignored (returns null).
 */
export function readSignupMessage(
  origin: string,
  data: unknown
): SignupEvent | null {
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return null;
  }
  if (host !== "facebook.com" && !host.endsWith(".facebook.com")) return null;
  let msg: Record<string, unknown>;
  try {
    msg =
      typeof data === "string"
        ? JSON.parse(data)
        : (data as Record<string, unknown>);
  } catch {
    return null;
  }
  if (msg?.type !== "WA_EMBEDDED_SIGNUP") return null;
  const d = (msg.data ?? {}) as Record<string, unknown>;
  const event = String(msg.event ?? "");
  if (event === "FINISH" || event === "FINISH_ONLY_WABA") {
    const wabaId = String(d.waba_id ?? "");
    const phoneNumberId = String(d.phone_number_id ?? "");
    if (!wabaId || !phoneNumberId) {
      return {
        kind: "error",
        message: "Pick a phone number in the Facebook window to finish.",
      };
    }
    return { kind: "finish", wabaId, phoneNumberId };
  }
  if (event === "CANCEL") {
    return {
      kind: "cancel",
      step: typeof d.current_step === "string" ? d.current_step : null,
    };
  }
  if (event === "ERROR") {
    return {
      kind: "error",
      message: String(d.error_message ?? "Facebook reported an error."),
    };
  }
  return null;
}
