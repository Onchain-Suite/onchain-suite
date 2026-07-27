import crypto from "crypto";

export class VerificationService {
  /**
   * Splits a verification token into selector and verifier.
   * Token format: selector.verifier (encoded as base64 or hex)
   */
  static parseToken(token: string) {
    try {
      // Assuming the token is base64 encoded selector.verifier
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [selector, verifier] = decoded.split(".");

      if (!selector || !verifier) {
        throw new Error("Invalid token format");
      }

      return { selector, verifier };
    } catch {
      // If not base64, try direct split (fallback)
      const [selector, verifier] = token.split(".");
      if (selector && verifier) return { selector, verifier };
      throw new Error("Invalid token format");
    }
  }

  /**
   * Hashes a verifier using SHA-256.
   */
  static hashVerifier(verifier: string) {
    return crypto.createHash("sha256").update(verifier).digest("hex");
  }

  /**
   * Verifies an email token and updates the user's status.
   */
  static async verifyEmail(token: string) {
    const { selector, verifier } = this.parseToken(token);
    const verifierHash = this.hashVerifier(verifier);

    // 1. Lookup: Search DB for selector
    // 2. Expiration Check: Check expiresAt
    // 3. Hashing Check: Compare verifierHash with stored hash
    // 4. Validation: Set emailVerified = true
    // 5. Cleanup: Delete token

    // NOTE: Since we don't have a direct DB client in this project,
    // we call the backend API which handles the actual database operations.
    // We'll try the custom verify-token endpoint first, then fallback to BetterAuth if needed.
    // NOTE: BACKEND_URL / NEXT_PUBLIC_BACKEND_URL already include the `/api/v1`
    // suffix (see src/app/api/v1/auth/[...path]/route.ts). Defaults must match,
    // and callers must NOT prepend `/api/v1` again or the path doubles up.
    const devDefault = "http://127.0.0.1:3333/api/v1";
    const prodDefault = "https://api.onchainsuite.com/api/v1";
    const pickNonEmpty = (...values: Array<string | undefined | null>) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim().length > 0) return value;
      }
      return "";
    };

    const pickNonEmptyString = (...values: unknown[]) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim().length > 0) return value;
      }
      return undefined;
    };

    const backendUrl = pickNonEmpty(
      process.env.BACKEND_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
      process.env.NODE_ENV === "production" ? prodDefault : devDefault
    ).replace(/\/$/, "");

    const response = await fetch(`${backendUrl}/auth/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selector,
        verifierHash,
        token, // We also pass the original token if needed by the backend
      }),
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json") ?? false;

    if (!response.ok) {
      // If the custom endpoint doesn't exist (404), try the standard BetterAuth endpoint
      if (response.status === 404) {
        const baResponse = await fetch(
          `${backendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: "GET" }
        );

        if (baResponse.ok) {
          return { success: true, method: "BetterAuth" };
        }

        const baText = await baResponse.text();
        throw new Error(
          `BetterAuth verification failed: ${baResponse.status} - ${baText}`
        );
      }

      let errorMessage = "Verification failed";
      if (isJson) {
        try {
          const errorData = await response.json();
          const next =
            pickNonEmptyString(errorData?.message, errorData?.error) ??
            errorMessage;
          errorMessage = next;
        } catch (e) {
          console.error("Failed to parse error JSON response", e);
        }
      } else {
        const text = await response.text();
        console.error("Backend error response (non-JSON):", text);
        errorMessage = `Backend error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (isJson) {
      try {
        const data = await response.json();
        return data;
      } catch (e) {
        console.error("Failed to parse success JSON response", e);
        // If it's empty but OK, just return success
        return { success: true };
      }
    }

    // If it's not JSON but was OK (2xx), just return success
    return { success: true };
  }
}
