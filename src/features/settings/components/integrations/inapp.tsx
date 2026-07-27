"use client";

import {
  BoltIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/date";
import {
  getCookieValue,
  isJsonObject,
  ORG_SELECTION_COOKIE,
} from "@/lib/utils";

import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const CUSTOM_EVENTS_CURL = `curl -X POST https://api.onchainsuite.com/api/v1/events \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "plan_upgraded",
    "contact": { "walletAddress": "0xabc..." },
    "attributes": { "plan": "pro" },
    "idempotencyKey": "evt_123"
  }'`;

type InAppEnvironment = "production" | "staging" | "development";
type SecretKeyEnvironment = "live" | "test";

type InAppOrigin = {
  id: string;
  origin: string;
  environment: InAppEnvironment;
};

type SecretKeyMeta = {
  id: string;
  environment: SecretKeyEnvironment;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
};

type InAppStatus = {
  publishableKeys: { production?: string; test?: string };
  secretKeys: SecretKeyMeta[];
  sessionCount: number | null;
  usage: Record<string, unknown> | null;
};

const readString = (obj: Record<string, unknown> | null, key: string) => {
  if (!obj) return "";
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
};

const readNumber = (obj: Record<string, unknown> | null, key: string) => {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const normalizeStatus = (input: unknown): InAppStatus => {
  if (!isJsonObject(input)) {
    return {
      publishableKeys: {},
      secretKeys: [],
      sessionCount: null,
      usage: null,
    };
  }
  const obj = input as Record<string, unknown>;
  const data = isJsonObject(obj.data)
    ? (obj.data as Record<string, unknown>)
    : obj;

  const keys = isJsonObject(data.keys)
    ? (data.keys as Record<string, unknown>)
    : isJsonObject(data.apiKeys)
      ? (data.apiKeys as Record<string, unknown>)
      : isJsonObject(data.inapp)
        ? (data.inapp as Record<string, unknown>)
        : null;

  const publishableNested = isJsonObject(data.publishable)
    ? (data.publishable as Record<string, unknown>)
    : isJsonObject(data.publishableKey)
      ? (data.publishableKey as Record<string, unknown>)
      : null;
  const inappObj = isJsonObject(data.inapp)
    ? (data.inapp as Record<string, unknown>)
    : null;
  const inappKeysObj = isJsonObject(inappObj?.keys)
    ? (inappObj?.keys as Record<string, unknown>)
    : null;

  const publishableKeysObj =
    (isJsonObject(data.publishableKeys)
      ? (data.publishableKeys as Record<string, unknown>)
      : isJsonObject(keys?.publishableKeys)
        ? (keys?.publishableKeys as Record<string, unknown>)
        : isJsonObject(inappObj?.keys)
          ? (inappObj?.keys as Record<string, unknown>)
          : null) ??
    (isJsonObject(keys?.inapp)
      ? ((keys?.inapp as Record<string, unknown>).keys as Record<
          string,
          unknown
        >)
      : null);

  const production =
    readString(publishableKeysObj, "production") ||
    readString(inappKeysObj, "production") ||
    readString(publishableNested, "production") ||
    readString(publishableNested, "live") ||
    readString(publishableNested, "key") ||
    readString(publishableNested, "value") ||
    readString(data, "publishableKey") ||
    readString(data, "pk");

  const test =
    readString(publishableKeysObj, "test") ||
    readString(inappKeysObj, "test") ||
    readString(publishableNested, "test");

  let secretKeysRaw: unknown[] = [];
  if (
    isJsonObject(data.apiKeys) &&
    Array.isArray((data.apiKeys as Record<string, unknown>).secretKeys)
  ) {
    secretKeysRaw = (data.apiKeys as Record<string, unknown>)
      .secretKeys as unknown[];
  } else if (isJsonObject(keys) && Array.isArray(keys.secretKeys)) {
    secretKeysRaw = keys.secretKeys as unknown[];
  } else if (
    isJsonObject(data.apiKeys) &&
    isJsonObject((data.apiKeys as Record<string, unknown>).secretKeys) &&
    Array.isArray(
      (
        (data.apiKeys as Record<string, unknown>).secretKeys as Record<
          string,
          unknown
        >
      ).items
    )
  ) {
    secretKeysRaw = (
      (data.apiKeys as Record<string, unknown>).secretKeys as Record<
        string,
        unknown
      >
    ).items as unknown[];
  } else if (Array.isArray((data as Record<string, unknown>).secretKeys)) {
    secretKeysRaw = (data as Record<string, unknown>).secretKeys as unknown[];
  }

  const secretKeys: SecretKeyMeta[] = Array.isArray(secretKeysRaw)
    ? secretKeysRaw
        .map((row): SecretKeyMeta | null => {
          if (!isJsonObject(row)) return null;
          const r = row as Record<string, unknown>;
          const idRaw = r.id ?? r.keyId ?? r.secretKeyId ?? r._id ?? "";
          const id = typeof idRaw === "string" ? idRaw.trim() : String(idRaw);
          if (!id) return null;
          const envRaw = readString(r, "environment").toLowerCase();
          const environment: SecretKeyEnvironment =
            envRaw === "live" || envRaw === "test" ? envRaw : "live";
          const createdAt =
            readString(r, "createdAt") || readString(r, "created_at");
          const updatedAt =
            readString(r, "updatedAt") || readString(r, "updated_at");
          const name = readString(r, "name");
          return {
            id,
            environment,
            createdAt,
            updatedAt,
            name: name || undefined,
          };
        })
        .filter((v): v is SecretKeyMeta => Boolean(v))
    : [];

  const sessionCount =
    readNumber(data, "sessionCount") ??
    readNumber(data, "sessions") ??
    readNumber(data, "activeSessions");

  const usage = isJsonObject(data.usage)
    ? (data.usage as Record<string, unknown>)
    : null;

  const publishableKeys: { production?: string; test?: string } = {};
  if (production) publishableKeys.production = production;
  if (test) publishableKeys.test = test;

  return { publishableKeys, secretKeys, sessionCount, usage };
};

const normalizeOrigins = (input: unknown): InAppOrigin[] => {
  const list = Array.isArray(input)
    ? input
    : isJsonObject(input) &&
        Array.isArray((input as Record<string, unknown>).data)
      ? ((input as Record<string, unknown>).data as unknown[])
      : isJsonObject(input) &&
          isJsonObject((input as Record<string, unknown>).data) &&
          Array.isArray(
            ((input as Record<string, unknown>).data as Record<string, unknown>)
              .data
          )
        ? (((input as Record<string, unknown>).data as Record<string, unknown>)
            .data as unknown[])
        : [];

  return list
    .map((row): InAppOrigin | null => {
      if (!isJsonObject(row)) return null;
      const o = row as Record<string, unknown>;
      const idRaw = o.id ?? o.originId ?? o._id ?? "";
      const origin = readString(o, "origin");
      const environmentRaw = readString(o, "environment") as InAppEnvironment;
      const id = typeof idRaw === "string" ? idRaw.trim() : String(idRaw);
      if (!id || !origin) return null;
      const environment: InAppEnvironment =
        environmentRaw === "production" ||
        environmentRaw === "staging" ||
        environmentRaw === "development"
          ? environmentRaw
          : "production";
      return { id, origin, environment };
    })
    .filter((v): v is InAppOrigin => Boolean(v));
};

const maskKey = (key: string) => {
  if (!key) return "";
  if (key.length <= 10) return `${key.slice(0, 2)}••••••`;
  return `${key.slice(0, 8)}••••••••••••••••`;
};

const safeOrgId = (session: unknown): string | null => {
  if (isJsonObject(session)) {
    const s = session as Record<string, unknown>;
    const nested = isJsonObject(s.session)
      ? (s.session as Record<string, unknown>)
      : null;
    const raw =
      nested?.activeOrganizationId ??
      nested?.organizationId ??
      s.activeOrganizationId ??
      s.organizationId;
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  }

  const cookieOrgId = getCookieValue(ORG_SELECTION_COOKIE);
  return cookieOrgId && cookieOrgId.trim().length > 0
    ? cookieOrgId.trim()
    : null;
};

const jsonRequest = async ({
  url,
  method,
  orgId,
  body,
}: {
  url: string;
  method: "GET" | "POST" | "DELETE";
  orgId: string;
  body?: unknown;
}) => {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-org-id": orgId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(async () => {
    try {
      const text = await res.text();
      return text ? { message: text } : null;
    } catch {
      return null;
    }
  });
  if (!res.ok) {
    const message =
      isJsonObject(data) && typeof data.message === "string"
        ? data.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};

const InAppIntegration = () => {
  const { data: session } = authClient.useSession();
  const orgId = safeOrgId(session);

  const queryClient = useQueryClient();
  const [showPublishable, setShowPublishable] = useState(false);
  const [copiedKey, setCopiedKey] = useState<"pk" | "sk" | "curl" | null>(null);
  const [activePanel, setActivePanel] = useState<
    "keys" | "origins" | "test" | null
  >(null);

  const [originInput, setOriginInput] = useState("");
  const [originEnv, setOriginEnv] = useState<InAppEnvironment>("production");

  const [testWalletAddress, setTestWalletAddress] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testBody, setTestBody] = useState("");
  const [testCtaLabel, setTestCtaLabel] = useState("");
  const [testCtaUrl, setTestCtaUrl] = useState("");

  const [createSecretOpen, setCreateSecretOpen] = useState(false);
  const [secretEnv, setSecretEnv] = useState<SecretKeyEnvironment>("live");
  const [secretName, setSecretName] = useState("");
  const [createdSecretToken, setCreatedSecretToken] = useState("");

  const statusQuery = useQuery({
    queryKey: ["integrations", "inapp", "status", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return null;
      return jsonRequest({
        url: "/api/v1/integrations/inapp/status",
        method: "GET",
        orgId,
      });
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const originsQuery = useQuery({
    queryKey: ["integrations", "inapp", "origins", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      return jsonRequest({
        url: "/api/v1/integrations/inapp/origins",
        method: "GET",
        orgId,
      });
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const status = useMemo(
    () => normalizeStatus(statusQuery.data),
    [statusQuery.data]
  );

  const hasRetriedStatusRef = useRef(false);
  useEffect(() => {
    if (!orgId) return;
    if (statusQuery.isLoading || statusQuery.isError) return;
    if (!statusQuery.isSuccess) return;
    if (hasRetriedStatusRef.current) return;
    if (status.publishableKeys.production || status.publishableKeys.test)
      return;
    hasRetriedStatusRef.current = true;
    statusQuery.refetch().catch(() => undefined);
  }, [
    orgId,
    status.publishableKeys.production,
    status.publishableKeys.test,
    statusQuery,
  ]);
  const origins = useMemo(
    () => normalizeOrigins(originsQuery.data),
    [originsQuery.data]
  );

  const addOriginMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active organization");
      const raw = originInput.trim();
      if (!raw) throw new Error("Origin is required");
      const origin =
        raw.startsWith("http://") || raw.startsWith("https://")
          ? raw
          : `https://${raw}`;
      const parsedOrigin = new URL(origin).origin;
      return jsonRequest({
        url: "/api/v1/integrations/inapp/origins",
        method: "POST",
        orgId,
        body: { origin: parsedOrigin, environment: originEnv },
      });
    },
    onSuccess: async () => {
      toast.success("Origin added");
      setOriginInput("");
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "inapp", "origins", orgId],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add origin");
    },
  });

  const removeOriginMutation = useMutation({
    mutationFn: async (originId: string) => {
      if (!orgId) throw new Error("No active organization");
      return jsonRequest({
        url: `/api/v1/integrations/inapp/origins/${encodeURIComponent(originId)}`,
        method: "DELETE",
        orgId,
      });
    },
    onSuccess: async () => {
      toast.success("Origin removed");
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "inapp", "origins", orgId],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove origin"
      );
    },
  });

  const testPushMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active organization");
      const walletAddress = testWalletAddress.trim();
      if (!walletAddress) throw new Error("Wallet address is required");
      const title = testTitle.trim();
      const body = testBody.trim();
      if (!title || !body) throw new Error("Title and body are required");
      const payload: Record<string, unknown> = { walletAddress, title, body };
      if (testCtaLabel.trim()) payload.ctaLabel = testCtaLabel.trim();
      if (testCtaUrl.trim()) payload.ctaUrl = testCtaUrl.trim();
      return jsonRequest({
        url: "/api/v1/integrations/inapp/test-push",
        method: "POST",
        orgId,
        body: payload,
      });
    },
    onSuccess: () => {
      toast.success("Test push sent");
      setTestWalletAddress("");
      setTestTitle("");
      setTestBody("");
      setTestCtaLabel("");
      setTestCtaUrl("");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to send test push"
      );
    },
  });

  const createSecretKeyMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active organization");
      const payload: Record<string, unknown> = { environment: secretEnv };
      const trimmedName = secretName.trim();
      if (trimmedName) payload.name = trimmedName;
      return jsonRequest({
        url: "/api/v1/integrations/keys/secret",
        method: "POST",
        orgId,
        body: payload,
      });
    },
    onSuccess: async (data) => {
      const token =
        isJsonObject(data) &&
        typeof (data as Record<string, unknown>).token === "string"
          ? String((data as Record<string, unknown>).token)
          : isJsonObject(data) &&
              isJsonObject((data as Record<string, unknown>).data) &&
              typeof (
                (data as Record<string, unknown>).data as Record<
                  string,
                  unknown
                >
              ).token === "string"
            ? String(
                (
                  (data as Record<string, unknown>).data as Record<
                    string,
                    unknown
                  >
                ).token
              )
            : "";
      if (!token) {
        toast.error("Secret key created, but no token was returned");
        return;
      }
      setCreatedSecretToken(token);
      toast.success("Secret key created");
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "inapp", "status", orgId],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create secret key"
      );
    },
  });

  const copyToClipboard = async (kind: "pk" | "sk" | "curl", value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKey(kind);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <motion.div className="space-y-6">
      <SettingsSectionCard
        title="In-app push"
        description="Configure SDK keys, approved origins, and test delivery."
        icon={<ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />}
        badge={
          orgId
            ? `Active sessions: ${statusQuery.isLoading ? "Loading…" : (status.sessionCount ?? "—")}`
            : "Select an organization"
        }
        collapsedPreview={
          !orgId ? (
            <div className="text-sm text-muted-foreground">
              Select an organization to manage in-app integration.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Publishable keys
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {statusQuery.isLoading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : status.publishableKeys.production ||
                    status.publishableKeys.test ? (
                    "Configured"
                  ) : (
                    "Not available yet"
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Secret keys
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {statusQuery.isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    `${status.secretKeys.length} created`
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Allowed origins
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {originsQuery.isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    `${origins.length} added`
                  )}
                </div>
              </div>
            </div>
          )
        }
      >
        <div className="space-y-5">
          {!orgId ? (
            <div className="rounded-2xl border border-border/80 bg-muted/50 p-4 text-sm text-muted-foreground">
              Select an organization to manage in-app integration.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Publishable keys
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    {statusQuery.isLoading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : status.publishableKeys.production ||
                      status.publishableKeys.test ? (
                      "Configured"
                    ) : (
                      "Not available yet"
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Secret keys
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    {statusQuery.isLoading ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      `${status.secretKeys.length} created`
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Allowed origins
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    {originsQuery.isLoading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      `${origins.length} added`
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-border/50 pt-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Keys
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      View publishable keys and create server-side secret keys
                      only when needed.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {statusQuery.isLoading ? (
                        <Skeleton className="h-4 w-56" />
                      ) : (
                        `${status.publishableKeys.production || status.publishableKeys.test ? "Publishable keys configured" : "Publishable keys unavailable"} • ${status.secretKeys.length} secret key${status.secretKeys.length === 1 ? "" : "s"}`
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      type="button"
                      onClick={() =>
                        setActivePanel((current) =>
                          current === "keys" ? null : "keys"
                        )
                      }
                    >
                      {activePanel === "keys" ? "Hide keys" : "Manage keys"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setCreatedSecretToken("");
                        setSecretName("");
                        setSecretEnv("live");
                        setCreateSecretOpen(true);
                      }}
                      type="button"
                    >
                      Create secret key
                    </Button>
                  </div>
                </div>

                {activePanel === "keys" ? (
                  <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Publishable keys
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use these in client environments that only need public
                          access.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPublishable((v) => !v)}
                        className="h-9 w-9 rounded-xl border-border/80"
                        aria-label="Toggle publishable key visibility"
                        type="button"
                      >
                        {showPublishable ? (
                          <EyeSlashIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        ) : (
                          <EyeIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label className="text-sm font-medium text-foreground">
                              Production
                            </Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Recommended for live traffic.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                "pk",
                                status.publishableKeys.production ?? ""
                              ).catch(() => undefined)
                            }
                            className="h-9 w-9 rounded-xl border-border/80 bg-transparent"
                            aria-label="Copy production publishable key"
                            type="button"
                          >
                            {copiedKey === "pk" ? (
                              <CheckIcon
                                className="h-4 w-4 text-primary"
                                aria-hidden="true"
                              />
                            ) : (
                              <ClipboardDocumentIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        </div>
                        <code className="mt-3 block w-full break-all rounded-xl border border-border/80 bg-card px-3 py-3 font-mono text-xs text-foreground">
                          {statusQuery.isLoading ? (
                            <Skeleton className="h-4 w-44" />
                          ) : showPublishable ? (
                            (status.publishableKeys.production ?? "—")
                          ) : status.publishableKeys.production ? (
                            maskKey(status.publishableKeys.production)
                          ) : (
                            "—"
                          )}
                        </code>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label className="text-sm font-medium text-foreground">
                              Test
                            </Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Use this while validating non-production flows.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                "pk",
                                status.publishableKeys.test ?? ""
                              ).catch(() => undefined)
                            }
                            className="h-9 w-9 rounded-xl border-border/80 bg-transparent"
                            aria-label="Copy test publishable key"
                            type="button"
                          >
                            {copiedKey === "pk" ? (
                              <CheckIcon
                                className="h-4 w-4 text-primary"
                                aria-hidden="true"
                              />
                            ) : (
                              <ClipboardDocumentIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        </div>
                        <code className="mt-3 block w-full break-all rounded-xl border border-border/80 bg-card px-3 py-3 font-mono text-xs text-foreground">
                          {statusQuery.isLoading ? (
                            <Skeleton className="h-4 w-44" />
                          ) : showPublishable ? (
                            (status.publishableKeys.test ?? "—")
                          ) : status.publishableKeys.test ? (
                            maskKey(status.publishableKeys.test)
                          ) : (
                            "—"
                          )}
                        </code>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4">
                      <h4 className="text-sm font-semibold text-foreground">
                        Secret keys
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create `sk_*` tokens for secure server actions. Tokens
                        are only shown once when created.
                      </p>

                      <div className="mt-4 space-y-3">
                        {statusQuery.isLoading ? (
                          <>
                            <Skeleton className="h-16 w-full rounded-2xl" />
                            <Skeleton className="h-16 w-full rounded-2xl" />
                          </>
                        ) : status.secretKeys.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                            No secret keys created yet.
                          </div>
                        ) : (
                          status.secretKeys.slice(0, 3).map((k) => (
                            <div
                              key={k.id}
                              className="rounded-2xl border border-border/60 bg-background/60 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-foreground">
                                    {k.name ?? "Secret key"}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {k.environment}
                                    {formatDateTime(k.createdAt)
                                      ? ` • Created ${formatDateTime(k.createdAt)}`
                                      : ""}
                                  </div>
                                </div>
                                <code className="break-all font-mono text-xs text-muted-foreground sm:shrink-0">
                                  {k.id}
                                </code>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {status.secretKeys.length > 3 ? (
                        <div className="mt-3 text-xs text-muted-foreground">
                          {status.secretKeys.length - 3} more…
                        </div>
                      ) : null}
                    </div>

                    {statusQuery.isError ? (
                      <div className="text-sm text-destructive">
                        Failed to load status
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Allowed origins
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Approve the frontends that can initialize in-app sessions
                      and request delivery.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {originsQuery.isLoading ? (
                        <Skeleton className="h-4 w-36" />
                      ) : (
                        `${origins.length} origin${origins.length === 1 ? "" : "s"} configured`
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    type="button"
                    onClick={() =>
                      setActivePanel((current) =>
                        current === "origins" ? null : "origins"
                      )
                    }
                  >
                    {activePanel === "origins"
                      ? "Hide origin manager"
                      : "Manage origins"}
                  </Button>
                </div>

                {activePanel === "origins" ? (
                  <div className="space-y-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <form
                      className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto]"
                      onSubmit={(e) => {
                        e.preventDefault();
                        addOriginMutation.mutate();
                      }}
                    >
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Origin
                        </Label>
                        <Input
                          value={originInput}
                          onChange={(e) => setOriginInput(e.target.value)}
                          placeholder="https://app.example.com"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Environment
                        </Label>
                        <Select
                          value={originEnv}
                          onValueChange={(v) =>
                            setOriginEnv(v as InAppEnvironment)
                          }
                        >
                          <SelectTrigger className="h-11 border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="production">
                              Production
                            </SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="development">
                              Development
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 lg:self-end">
                        <Button
                          type="submit"
                          className="h-11 w-full rounded-xl px-6"
                          disabled={addOriginMutation.isPending}
                        >
                          Add
                        </Button>
                      </div>
                    </form>

                    <div className="space-y-3">
                      {originsQuery.isLoading ? (
                        <>
                          <Skeleton className="h-16 w-full rounded-2xl" />
                          <Skeleton className="h-16 w-full rounded-2xl" />
                        </>
                      ) : originsQuery.isError ? (
                        <div className="text-sm text-destructive">
                          Failed to load origins
                        </div>
                      ) : origins.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                          No origins configured.
                        </div>
                      ) : (
                        origins.map((o) => (
                          <div
                            key={o.id}
                            className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-mono text-sm text-foreground">
                                {o.origin}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {o.environment}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              className="rounded-xl border-border/80"
                              disabled={removeOriginMutation.isPending}
                              onClick={() => removeOriginMutation.mutate(o.id)}
                              type="button"
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Test push
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Send a single in-app message to a wallet to validate
                      delivery, content, and CTA behavior.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    type="button"
                    onClick={() =>
                      setActivePanel((current) =>
                        current === "test" ? null : "test"
                      )
                    }
                  >
                    {activePanel === "test"
                      ? "Hide test composer"
                      : "Compose test push"}
                  </Button>
                </div>

                {activePanel === "test" ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <form
                      className="grid gap-4 lg:grid-cols-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        testPushMutation.mutate();
                      }}
                    >
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Wallet address
                        </Label>
                        <Input
                          value={testWalletAddress}
                          onChange={(e) => setTestWalletAddress(e.target.value)}
                          placeholder="0x…"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Title
                        </Label>
                        <Input
                          value={testTitle}
                          onChange={(e) => setTestTitle(e.target.value)}
                          placeholder="New notification"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label className="text-sm font-medium text-foreground">
                          Body
                        </Label>
                        <Input
                          value={testBody}
                          onChange={(e) => setTestBody(e.target.value)}
                          placeholder="Hello from OnchainSuite"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          CTA label (optional)
                        </Label>
                        <Input
                          value={testCtaLabel}
                          onChange={(e) => setTestCtaLabel(e.target.value)}
                          placeholder="View"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          CTA URL (optional)
                        </Label>
                        <Input
                          value={testCtaUrl}
                          onChange={(e) => setTestCtaUrl(e.target.value)}
                          placeholder="https://…"
                          className="h-11 border-border/80"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <Button
                          type="submit"
                          className="h-11 w-full rounded-xl sm:w-fit sm:px-6"
                          disabled={testPushMutation.isPending}
                        >
                          Send test push
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>

              {statusQuery.isSuccess &&
                !statusQuery.isLoading &&
                !statusQuery.isError &&
                !status.publishableKeys.production &&
                !status.publishableKeys.test &&
                status.secretKeys.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                    Keys are not available for this org yet. Confirm you are an
                    org admin and that `GET /integrations/inapp/status` returns
                    publishable keys. To mint a usable `sk_*`, create one via
                    `POST /integrations/keys/secret` and save the returned token
                    immediately.
                  </div>
                )}
            </>
          )}
        </div>
      </SettingsSectionCard>

      {/* Custom Events API — ingestion is fully backend-abstracted
          (POST /events, secret-key auth); the dashboard only documents the
          call. Events fire app_event automation triggers and land in
          Intelligence SQL (app_events). */}
      <SettingsSectionCard
        title="Custom Events"
        description="Send product events from your backend — they trigger automations and power in-app messaging."
        icon={<BoltIcon className="h-5 w-5" aria-hidden="true" />}
        badge="POST /events · secret-key auth"
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-foreground">
                {CUSTOM_EVENTS_CURL}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full text-xs"
                type="button"
                onClick={() => copyToClipboard("curl", CUSTOM_EVENTS_CURL)}
              >
                {copiedKey === "curl" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Use a secret key from above (`sk_test_` keys dry-run — nothing
            sends). Identify the contact by wallet, email, or externalId. Events
            match automations with an{" "}
            <span className="font-medium">App event</span> trigger by name and
            appear in Intelligence as{" "}
            <code className="rounded bg-muted px-1">app_events</code>. Batch up
            to 100 with{" "}
            <code className="rounded bg-muted px-1">/events/batch</code>.
          </p>
        </div>
      </SettingsSectionCard>
      <Dialog open={createSecretOpen} onOpenChange={setCreateSecretOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-light tracking-tight text-foreground">
              Create secret key
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will return an `sk_*` token once. Store it immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">
                Environment
              </Label>
              <Select
                value={secretEnv}
                onValueChange={(v) => setSecretEnv(v as SecretKeyEnvironment)}
              >
                <SelectTrigger className="h-11 border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">
                Name (optional)
              </Label>
              <Input
                value={secretName}
                onChange={(e) => setSecretName(e.target.value)}
                placeholder="Server integration"
                className="h-11 border-border/80"
              />
            </div>

            {createdSecretToken && (
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">
                    New secret token
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard("sk", createdSecretToken).catch(
                        () => undefined
                      )
                    }
                    className="h-9 w-9 border-border/80 bg-transparent"
                    aria-label="Copy new secret token"
                  >
                    {copiedKey === "sk" ? (
                      <CheckIcon
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <ClipboardDocumentIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                </div>
                <code className="mt-2 block w-full break-all rounded-xl border border-border/80 bg-card px-3 py-2 font-mono text-xs text-foreground">
                  {createdSecretToken}
                </code>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateSecretOpen(false)}
              type="button"
            >
              Close
            </Button>
            <Button
              onClick={() => createSecretKeyMutation.mutate()}
              disabled={createSecretKeyMutation.isPending}
              type="button"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default InAppIntegration;
