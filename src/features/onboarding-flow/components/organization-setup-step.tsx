"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputFormField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

import { organizationOptions } from "../constants";
import type { SuggestedContract } from "../onboarding.service";
import { type OnboardingStepsProps } from "../types";
import {
  type OrganizationSetupFormData,
  organizationSetupSchema,
} from "../validation";
// Paused for launch alongside the panel below.
// import { ContractSuggestionsPanel } from "./contract-suggestions";

const normalizeWebsiteUrl = (input?: string) => {
  const raw = (input ?? "").trim();
  if (!raw) return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return undefined;
  }
};

const pickNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
};

const extractAxiosError = (error: unknown) => {
  const err = error as {
    message?: unknown;
    response?: { status?: unknown; data?: unknown };
  };
  const status =
    typeof err.response?.status === "number" ? err.response.status : undefined;
  const data = err.response?.data;
  const dataObj = isJsonObject(data) ? data : undefined;
  const nestedError = isJsonObject(dataObj?.error) ? dataObj.error : undefined;
  const message =
    pickNonEmptyString(
      isJsonObject(nestedError) ? nestedError.message : undefined,
      dataObj?.message,
      dataObj?.error,
      err.message
    ) ?? "";
  return { status, message };
};

const findExistingOrganizationId = (
  payload: unknown,
  expectedName: string,
  expectedSlug: string
): string | null => {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const list = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.data)
      ? root.data
      : isJsonObject(root) &&
          isJsonObject(root.data) &&
          Array.isArray(root.data.data)
        ? root.data.data
        : [];

  if (!Array.isArray(list)) return null;

  const nameLower = expectedName.toLowerCase().trim();
  const slugLower = expectedSlug.toLowerCase().trim();

  const match = list.find((org) => {
    const orgObj = isJsonObject(org) ? org : {};
    const orgName = String(orgObj.name ?? "")
      .toLowerCase()
      .trim();
    const orgSlug = String(orgObj.slug ?? "")
      .toLowerCase()
      .trim();
    return (
      (slugLower && orgSlug === slugLower) ||
      (nameLower && orgName === nameLower)
    );
  });

  const matchObj = isJsonObject(match) ? match : undefined;
  const id = matchObj?.id ?? matchObj?.organizationId ?? null;
  return typeof id === "string" && id.length > 0 ? id : null;
};

const generateUniqueSlug = (baseSlug: string) => {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${baseSlug}-${suffix}`;
};

export function OrganizationSetupStep({
  initialData,
  onNext,
}: OnboardingStepsProps) {
  const form = useForm<OrganizationSetupFormData>({
    resolver: zodResolver(organizationSetupSchema),
    defaultValues: {
      organizationName: initialData.organizationName ?? "",
      websiteUrl: initialData.websiteUrl ?? "",
      description: initialData.description ?? "",
      sector: initialData.sector ?? "",
    },
  });

  // Paused with the contract-suggestions panel below - restore these
  // useWatch subscriptions (organizationName, sector) when re-enabling it.

  // Contracts the user explicitly accepted from the suggestion panel. The
  // backend sends `requiresReview: true`, so only accepted rows are ever
  // committed (they ride along in this step's stepData on submit).
  const [acceptedContracts] = useState<SuggestedContract[]>(
    () => initialData.contracts ?? []
  );

  const onSubmit = async (data: OrganizationSetupFormData) => {
    const stepData = { ...data, contracts: acceptedContracts };
    try {
      const slug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Ensure session is fresh
      const { data: session } = await authClient.getSession();

      if (!session) {
        throw new Error("No active session found. Please sign in again.");
      }

      const websiteUrl = normalizeWebsiteUrl(data.websiteUrl);
      const description = (data.description ?? "").trim();

      // Try creating via authClient (BetterAuth plugin)
      const { data: org, error } = await authClient.organization.create({
        name: data.organizationName,
        slug,
      });

      if (error) {
        console.warn(
          "BetterAuth creation failed, trying custom endpoint as fallback:",
          error.message
        );

        const createPayload: Record<string, unknown> = {
          name: data.organizationName,
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
          if (typeof organizationId === "string" && organizationId.length > 0) {
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
                data.organizationName,
                slug
              );
              if (existingId) {
                await apiClient.post("/organization/set-active", {
                  organizationId: existingId,
                });
                await authClient.getSession();
                await onNext(stepData);
                return;
              }
            } catch (_e) {
              String(_e);
            }

            try {
              createPayload.slug = generateUniqueSlug(slug);
              await createOrganization();
              await authClient.getSession();
              await onNext(stepData);
              return;
            } catch (retryErr) {
              const { message: retryMessage } = extractAxiosError(retryErr);
              const retryMsg = String(retryMessage);
              toast.error(
                retryMsg.length > 0
                  ? retryMsg
                  : "This organization name is already taken. Please choose a different name."
              );
              return;
            }
          }

          if (status === 400 && message.toLowerCase().includes("foreign key")) {
            try {
              const profileName =
                session?.user?.name ??
                session?.user?.email ??
                data.organizationName ??
                "User";
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
                    await apiClient.put("/user/profile", { name: profileName });
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
                    data.organizationName,
                    slug
                  );
                  if (existingId) {
                    await apiClient.post("/organization/set-active", {
                      organizationId: existingId,
                    });
                    await authClient.getSession();
                    await onNext(stepData);
                    return;
                  }
                } catch (_e) {
                  String(_e);
                }

                try {
                  createPayload.slug = generateUniqueSlug(slug);
                  await createOrganization();
                  await authClient.getSession();
                  await onNext(stepData);
                  return;
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
              return;
            }
          } else {
            throw err;
          }
        }
      } else {
        const orgCandidate: unknown = org;
        const orgObj = isJsonObject(orgCandidate) ? orgCandidate : undefined;
        const nestedData = isJsonObject(orgObj?.data) ? orgObj.data : undefined;
        const createdOrgId = orgObj?.id ?? nestedData?.id ?? null;
        if (typeof createdOrgId === "string" && createdOrgId.length > 0) {
          await apiClient.post("/organization/set-active", {
            organizationId: createdOrgId,
          });
        }
      }

      // Refresh session one more time to update org state
      await authClient.getSession();

      await onNext(stepData);
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
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="text-foreground mb-4 text-3xl font-bold">
          Set up your organization
        </h1>
        <p className="text-muted-foreground">
          Tell us a bit about your organization to get started.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InputFormField
            form={form}
            name="organizationName"
            label="Organization Name"
            placeholder="Acme Corp"
            required
          />

          <InputFormField
            form={form}
            name="websiteUrl"
            label="Website URL"
            placeholder="https://example.com"
          />

          <InputFormField
            form={form}
            name="sector"
            label="Sector"
            renderChild={(field) => (
              <Select
                value={typeof field.value === "string" ? field.value : ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your sector (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {organizationOptions.map((option) => (
                    <SelectItem key={option.id} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            description="Helps us suggest the contracts and events to track."
          />

          <InputFormField
            form={form}
            name="description"
            label="Description"
            placeholder="Brief description..."
          />

          {/* Contract suggestions are paused for launch - re-enable by
              restoring the import, accept/remove handlers, and this panel.
          <ContractSuggestionsPanel
            protocolName={watchedName ?? ""}
            sector={watchedSector ?? ""}
            accepted={acceptedContracts}
            onAccept={handleAcceptContract}
            onRemove={handleRemoveContract}
          />
          */}

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
