"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

import {
  extractAxiosError,
  findExistingOrganizationId,
  generateUniqueSlug,
  normalizeWebsiteUrl,
  slugify,
} from "../utils/organization";

export interface CreateOrganizationInput {
  name: string;
  websiteUrl?: string;
  description?: string;
}

/**
 * Refresh the session and persist the active org id to the `onchain.selectedOrgId` cookie, so
 * everything org-scoped (the step-2 developer invite, the step-3 sender-domain card, the dashboard)
 * can resolve the workspace right after it is created, without waiting for `useSession` to settle.
 */
async function persistActiveOrg(): Promise<void> {
  const session = await authClient.getSession();
  const id = session.data?.session?.activeOrganizationId;
  if (typeof id === "string" && id.length > 0) {
    document.cookie = `onchain.selectedOrgId=${encodeURIComponent(
      id
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
}

/**
 * Create (or adopt) the owner's organization and set it active.
 *
 * This is the original `organization-setup-step` submit flow, lifted out so the guided wizard can
 * run it when leaving the project step. The behaviour is unchanged - BetterAuth first, custom
 * endpoint fallback, 409 -> adopt-or-reslug recovery, and the foreign-key path that bootstraps a
 * missing user profile - but instead of advancing the flow itself it resolves to a boolean the
 * caller acts on: `true` once an org is active and the session is refreshed, `false` when it has
 * already surfaced the error via a toast.
 */
export function useCreateOrganization() {
  return useCallback(
    async (input: CreateOrganizationInput): Promise<boolean> => {
      const { name } = input;
      try {
        const slug = slugify(name);

        // Fetch the session, retrying briefly before giving up. Right after a verify / OAuth
        // redirect a fresh getSession can momentarily come back null while the cookie settles;
        // a couple of short retries turn that transient miss into a hit.
        let session = (await authClient.getSession()).data;
        for (let attempt = 0; !session && attempt < 3; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          session = (await authClient.getSession()).data;
        }

        if (!session) {
          const reason = await fetch("/api/v1/auth/get-session", {
            credentials: "include",
          })
            .then((r) => r.headers.get("x-session-miss"))
            .catch(() => null);
          throw new Error(
            reason === "upstream-unreachable"
              ? "Cannot reach the authentication service. Please try again in a moment."
              : reason === "cookie-rejected-by-backend"
                ? "Your session has expired. Please sign in again."
                : "No active session found. Please sign in again."
          );
        }

        const websiteUrl = normalizeWebsiteUrl(input.websiteUrl);
        const description = (input.description ?? "").trim();

        // Try creating via authClient (BetterAuth plugin) first.
        const { data: org, error } = await authClient.organization.create({
          name,
          slug,
        });

        if (error) {
          console.warn(
            "BetterAuth creation failed, trying custom endpoint as fallback:",
            error.message
          );

          const createPayload: Record<string, unknown> = {
            name,
            slug,
            ...(websiteUrl ? { websiteUrl } : {}),
            ...(description ? { description } : {}),
          };

          const createOrganization = async () => {
            const response = await apiClient.post(
              "/organization/create",
              createPayload
            );
            const body: unknown = response.data;
            const bodyObj = isJsonObject(body) ? body : undefined;
            const createdOrgCandidate =
              bodyObj?.data ?? bodyObj?.organization ?? bodyObj ?? body;
            const createdOrg = isJsonObject(createdOrgCandidate)
              ? createdOrgCandidate
              : undefined;
            const organizationId =
              createdOrg?.id ?? createdOrg?.organizationId ?? null;
            if (
              typeof organizationId === "string" &&
              organizationId.length > 0
            ) {
              await apiClient.post("/organization/set-active", {
                organizationId,
              });
            }
            return response;
          };

          try {
            await createOrganization();
          } catch (err) {
            const { status, message } = extractAxiosError(err);

            if (status === 409) {
              try {
                const listRes = await apiClient.get("/organization/list");
                const existingId = findExistingOrganizationId(
                  listRes.data,
                  name,
                  slug
                );
                if (existingId) {
                  await apiClient.post("/organization/set-active", {
                    organizationId: existingId,
                  });
                  await persistActiveOrg();
                  return true;
                }
              } catch (_e) {
                String(_e);
              }

              try {
                createPayload.slug = generateUniqueSlug(slug);
                await createOrganization();
                await persistActiveOrg();
                return true;
              } catch (retryErr) {
                const { message: retryMessage } = extractAxiosError(retryErr);
                const retryMsg = String(retryMessage);
                toast.error(
                  retryMsg.length > 0
                    ? retryMsg
                    : "This organization name is already taken. Please choose a different name."
                );
                return false;
              }
            }

            if (
              status === 400 &&
              message.toLowerCase().includes("foreign key")
            ) {
              try {
                const profileName =
                  session?.user?.name ?? session?.user?.email ?? name ?? "User";
                try {
                  await apiClient.get("/user/profile");
                } catch (profileErr) {
                  const { status: profileStatus, message: profileMessageRaw } =
                    extractAxiosError(profileErr);
                  const profileMessage = String(profileMessageRaw);

                  if (
                    profileStatus === 404 ||
                    profileMessage.toLowerCase().includes("record not found")
                  ) {
                    try {
                      await apiClient.post("/user/profile", {
                        name: profileName,
                      });
                    } catch {
                      await apiClient.put("/user/profile", {
                        name: profileName,
                      });
                    }
                  } else {
                    throw profileErr;
                  }
                }
              } catch (profileBootstrapErr) {
                const { message: profileBootstrapMsgRaw } =
                  extractAxiosError(profileBootstrapErr);
                toast.error(
                  profileBootstrapMsgRaw.length > 0
                    ? profileBootstrapMsgRaw
                    : "Failed to create your user profile."
                );
                throw profileBootstrapErr;
              }

              try {
                await createOrganization();
              } catch (finalErr) {
                const { status: finalStatus } = extractAxiosError(finalErr);
                if (finalStatus === 409) {
                  try {
                    const listRes = await apiClient.get("/organization/list");
                    const existingId = findExistingOrganizationId(
                      listRes.data,
                      name,
                      slug
                    );
                    if (existingId) {
                      await apiClient.post("/organization/set-active", {
                        organizationId: existingId,
                      });
                      await persistActiveOrg();
                      return true;
                    }
                  } catch (_e) {
                    String(_e);
                  }

                  try {
                    createPayload.slug = generateUniqueSlug(slug);
                    await createOrganization();
                    await persistActiveOrg();
                    return true;
                  } catch (_e) {
                    String(_e);
                  }
                }

                const { message: finalRaw } = extractAxiosError(finalErr);
                const finalMsg = String(finalRaw);
                toast.error(
                  finalMsg.length > 0
                    ? finalMsg
                    : "Failed to create organization."
                );
                return false;
              }
            } else {
              throw err;
            }
          }
        } else {
          const orgCandidate: unknown = org;
          const orgObj = isJsonObject(orgCandidate) ? orgCandidate : undefined;
          const nestedData = isJsonObject(orgObj?.data)
            ? orgObj.data
            : undefined;
          const createdOrgId = orgObj?.id ?? nestedData?.id ?? null;
          if (typeof createdOrgId === "string" && createdOrgId.length > 0) {
            await apiClient.post("/organization/set-active", {
              organizationId: createdOrgId,
            });
          }
        }

        // Refresh session + persist the active-org id so it is resolvable right away.
        await persistActiveOrg();
        return true;
      } catch (error) {
        const { status, message } = extractAxiosError(error);
        if (status !== 409) {
          console.error("Failed to create organization (catch block):", error);
        }
        const fallback =
          error instanceof Error
            ? error.message
            : "Failed to create organization. Please try again.";
        const displayMessage = message.length > 0 ? message : fallback;
        toast.error(displayMessage);
        return false;
      }
    },
    []
  );
}
