/**
 * Early-access signup service (marketing site, no auth/org context).
 *
 * Backend contract expected by the frontend:
 *   POST /api/v1/early-access
 *   body: EarlyAccessPayload (JSON)
 *   200/201 → { id?: string }          // success, interest captured
 *   4xx     → { message: string }      // validation error to surface
 *
 * The call is intentionally tolerant: if the endpoint isn't deployed yet
 * (network error / non-2xx), we resolve with `delivered: false` so the UI can
 * still confirm the interest locally. Replace this behavior once the backend
 * route exists (e.g. surface real validation errors).
 */

export interface EarlyAccessPayload {
  email: string;
  name?: string;
  protocol?: string;
  /** One or more reasons the team wants OnchainSuite. */
  reasons?: string[];
  notes?: string;
  /** Preferred call time (ISO string) if the user picked one. */
  preferredTime?: string;
  /** Where the signup originated. */
  source: "hero" | "early-access";
}

export interface EarlyAccessResult {
  delivered: boolean;
}

export async function submitEarlyAccess(
  payload: EarlyAccessPayload
): Promise<EarlyAccessResult> {
  try {
    const res = await fetch("/api/v1/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return { delivered: res.ok };
  } catch {
    return { delivered: false };
  }
}
