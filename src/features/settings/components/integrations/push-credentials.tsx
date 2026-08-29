"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatDateTime } from "@/lib/date";

import {
  type ApnsConfig,
  type ApnsInput,
  explainPushError,
  type FcmConfig,
  type PushCredential,
  pushCredentialsService,
  type PushProvider,
} from "../../push-credentials.service";
import { useAccountOrg } from "../account/use-account-org";
import { SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const APPLE_KEYS_URL =
  "https://developer.apple.com/account/resources/authkeys/list";
const FIREBASE_URL = "https://console.firebase.google.com/";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}

/**
 * Notifications. Web push needs no setup; native (APNs/FCM) is the optional
 * upgrade. OWNER/ADMIN only - hidden for other roles rather than 403-ing.
 */
export function PushCredentialsCard() {
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["organization", "push-credentials", organizationId] as const,
    [organizationId]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => pushCredentialsService.list(organizationId ?? undefined),
    enabled: canEdit && Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [apnsOpen, setApnsOpen] = useState(false);
  const [fcmOpen, setFcmOpen] = useState(false);
  const [removing, setRemoving] = useState<PushProvider | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey }).catch(() => undefined);

  if (!canEdit) return null;

  const creds = query.data ?? [];
  const apns = creds.find((c) => c.provider === "apns") ?? null;
  const fcm = creds.find((c) => c.provider === "fcm") ?? null;

  return (
    <SettingsCard
      title="Notifications"
      description="Web push works out of the box. Add mobile credentials only if you ship a native iOS or Android app."
    >
      {/* Web push - always active, no credentials needed */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <CheckCircleIcon
          className="mt-0.5 size-5 shrink-0 text-emerald-500"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Web push</p>
            <StatusPill tone="success">Active</StatusPill>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            No setup required. Reaches browsers and phones, including iOS
            home-screen apps.
          </p>
        </div>
      </div>

      {/* Mobile app push - optional native credentials */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground">Mobile app push</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Only needed if you have a native iOS or Android app.
        </p>
        <div className="mt-4 space-y-3">
          <ProviderRow
            title="iOS · APNs"
            loading={query.isLoading}
            cred={apns}
            summary={apnsSummary(apns)}
            onSetUp={() => setApnsOpen(true)}
            onRemove={() => setRemoving("apns")}
          />
          <ProviderRow
            title="Android · FCM"
            loading={query.isLoading}
            cred={fcm}
            summary={fcmSummary(fcm)}
            onSetUp={() => setFcmOpen(true)}
            onRemove={() => setRemoving("fcm")}
          />
        </div>
      </div>

      <ApnsDialog
        open={apnsOpen}
        onOpenChange={setApnsOpen}
        orgId={organizationId ?? undefined}
        existing={apns}
        onSaved={invalidate}
      />
      <FcmDialog
        open={fcmOpen}
        onOpenChange={setFcmOpen}
        orgId={organizationId ?? undefined}
        onSaved={invalidate}
      />
      <RemoveDialog
        provider={removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        orgId={organizationId ?? undefined}
        onDone={invalidate}
      />
    </SettingsCard>
  );
}

function apnsSummary(cred: PushCredential | null): string | null {
  if (!cred) return null;
  const c = cred.config as ApnsConfig;
  return [c.bundleId, c.sandbox ? "Sandbox" : "Production"]
    .filter(Boolean)
    .join(" · ");
}

function fcmSummary(cred: PushCredential | null): string | null {
  if (!cred) return null;
  const c = cred.config as FcmConfig;
  return c.projectId ?? c.clientEmail ?? null;
}

/** One provider's installed state + actions (or a "Set up" prompt). */
function ProviderRow({
  title,
  loading,
  cred,
  summary,
  onSetUp,
  onRemove,
}: {
  title: string;
  loading: boolean;
  cred: PushCredential | null;
  summary: string | null;
  onSetUp: () => void;
  onRemove: () => void;
}) {
  const friendly = explainPushError(cred?.lastError ?? null);
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DevicePhoneMobileIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {loading ? null : !cred ? (
            <StatusPill tone="neutral">Not configured</StatusPill>
          ) : cred.verified ? (
            <StatusPill tone="success">Connected</StatusPill>
          ) : (
            <StatusPill tone="pending">Saved, but not working</StatusPill>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSetUp}>
            {cred ? "Replace" : "Set up"}
          </Button>
          {cred ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {cred ? (
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          {summary ? <p className="text-foreground">{summary}</p> : null}
          <p>
            Key{" "}
            <span className="font-mono text-foreground">
              {cred.fingerprint}
            </span>
            {cred.updatedAt
              ? ` · uploaded ${formatDateTime(cred.updatedAt)}`
              : ""}
          </p>
          {!cred.verified && cred.lastError ? (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-amber-700 dark:text-amber-300">
              <ExclamationTriangleIcon
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                {friendly ? <span className="block">{friendly}</span> : null}
                <span className="mt-0.5 block font-mono opacity-80">
                  {cred.lastError}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shared inline result after a save: verified (success) or saved-not-working. */
function SaveResult({ cred }: { cred: PushCredential }) {
  const friendly = explainPushError(cred.lastError);
  if (cred.verified) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircleIcon className="size-4 shrink-0" aria-hidden="true" />
        Connected - the credential verified with the provider.
      </div>
    );
  }
  return (
    <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
      <p className="font-medium">Saved, but not working yet.</p>
      {friendly ? <p>{friendly}</p> : null}
      {cred.lastError ? (
        <p className="font-mono text-xs opacity-80">{cred.lastError}</p>
      ) : null}
    </div>
  );
}

const TEN_CHARS = /^[A-Za-z0-9]{10}$/;

function ApnsDialog({
  open,
  onOpenChange,
  orgId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId?: string;
  existing: PushCredential | null;
  onSaved: () => void;
}) {
  const cfg = (existing?.config ?? {}) as ApnsConfig;
  const [privateKey, setPrivateKey] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [keyId, setKeyId] = useState(cfg.keyId ?? "");
  const [teamId, setTeamId] = useState(cfg.teamId ?? "");
  const [bundleId, setBundleId] = useState(cfg.bundleId ?? "");
  const [sandbox, setSandbox] = useState(cfg.sandbox ?? false);
  const [result, setResult] = useState<PushCredential | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ApnsInput) =>
      pushCredentialsService.updateApns(input, orgId),
    onSuccess: (cred) => {
      onSaved();
      setResult(cred);
      if (cred.verified) {
        toast.success("iOS push connected.");
        onOpenChange(false);
      } else {
        toast.warning("Saved, but Apple hasn't verified the key.");
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't save the key."),
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPrivateKey(await readFileAsText(file));
      setFileName(file.name);
    } catch {
      toast.error("Couldn't read that .p8 file.");
    }
  };

  const valid =
    privateKey.trim().length > 0 &&
    TEN_CHARS.test(keyId.trim()) &&
    TEN_CHARS.test(teamId.trim()) &&
    bundleId.trim().length > 0;

  const submit = () =>
    mutation.mutate({
      privateKey: privateKey.trim(),
      keyId: keyId.trim(),
      teamId: teamId.trim(),
      bundleId: bundleId.trim(),
      sandbox,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>iOS push (APNs)</DialogTitle>
          <DialogDescription>
            Create a key in{" "}
            <a
              href={APPLE_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              Apple Developer → Keys
              <ArrowTopRightOnSquareIcon
                className="size-3"
                aria-hidden="true"
              />
            </a>{" "}
            with APNs enabled. The .p8 downloads once and can&apos;t be
            re-downloaded, so keep it safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>APNs key (.p8)</Label>
            <input
              type="file"
              accept=".p8,text/plain"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
            />
            <Textarea
              value={privateKey}
              onChange={(e) => {
                setPrivateKey(e.target.value);
                setFileName(null);
              }}
              rows={3}
              placeholder="…or paste the -----BEGIN PRIVATE KEY----- contents"
              className="font-mono text-xs"
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">Loaded {fileName}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apns-keyid">Key ID</Label>
              <Input
                id="apns-keyid"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="ABC1234567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apns-teamid">Team ID</Label>
              <Input
                id="apns-teamid"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="DEF8901234"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apns-bundle">Bundle ID</Label>
            <Input
              id="apns-bundle"
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="com.example.app"
            />
          </div>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
            <span className="text-sm">
              <span className="font-medium text-foreground">Sandbox</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Turn on only while testing with a development build from Xcode.
                Production and TestFlight builds need this off.
              </span>
            </span>
            <Switch checked={sandbox} onCheckedChange={setSandbox} />
          </label>

          {result ? <SaveResult cred={result} /> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? "Verifying…" : "Save & verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FcmDialog({
  open,
  onOpenChange,
  orgId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId?: string;
  onSaved: () => void;
}) {
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<PushCredential | null>(null);

  const mutation = useMutation({
    mutationFn: (serviceAccount: Record<string, unknown>) =>
      pushCredentialsService.updateFcm(serviceAccount, orgId),
    onSuccess: (cred) => {
      onSaved();
      setResult(cred);
      if (cred.verified) {
        toast.success("Android push connected.");
        onOpenChange(false);
      } else {
        toast.warning("Saved, but Google hasn't verified the credential.");
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't save the key."),
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setJson(await readFileAsText(file));
      setFileName(file.name);
    } catch {
      toast.error("Couldn't read that JSON file.");
    }
  };

  const submit = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      toast.error("That isn't valid JSON. Upload the service-account file.");
      return;
    }
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      toast.error(
        "That JSON is missing project_id / client_email / private_key."
      );
      return;
    }
    mutation.mutate(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Android push (FCM)</DialogTitle>
          <DialogDescription>
            In{" "}
            <a
              href={FIREBASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              Firebase Console → Project Settings → Service accounts
              <ArrowTopRightOnSquareIcon
                className="size-3"
                aria-hidden="true"
              />
            </a>
            , generate a new private key and upload the JSON here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Service account JSON</Label>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">Loaded {fileName}</p>
            ) : (
              <Textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={4}
                placeholder='…or paste the { "type": "service_account", … } JSON'
                className="font-mono text-xs"
              />
            )}
          </div>

          {result ? <SaveResult cred={result} /> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={submit}
            disabled={json.trim().length === 0 || mutation.isPending}
          >
            {mutation.isPending ? "Verifying…" : "Save & verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({
  provider,
  onOpenChange,
  orgId,
  onDone,
}: {
  provider: PushProvider | null;
  onOpenChange: (o: boolean) => void;
  orgId?: string;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: (p: PushProvider) => pushCredentialsService.remove(p, orgId),
    onSuccess: () => {
      onDone();
      toast.success("Credential removed.");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't remove it."),
  });
  const platform = provider === "fcm" ? "Android" : "iOS";
  return (
    <Dialog open={provider !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {platform} push credential?</DialogTitle>
          <DialogDescription>
            {platform} notifications will stop immediately. You can add a new
            credential at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => provider && mutation.mutate(provider)}
          >
            {mutation.isPending ? "Removing…" : `Remove ${platform} credential`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
