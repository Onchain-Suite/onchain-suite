"use client";

import { CheckCircleIcon, CheckIcon } from "@heroicons/react/20/solid";
import {
  AtSymbolIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  HANDOFF_MODE,
  type Role,
  type RoleIcon,
  ROLES,
} from "../../constants/guided";
import { type HandoffIcon, SETUP_TASKS } from "../../data/setup-tasks";
import { useSendHandoff } from "../../hooks/use-send-handoff";
import { AUTH_ROUTES } from "@/shared/config/app-routes";

const ROLE_ICONS: Record<RoleIcon, typeof WrenchScrewdriverIcon> = {
  builder: WrenchScrewdriverIcon,
  operator: UserGroupIcon,
};

const TASK_ICONS: Record<HandoffIcon, typeof EnvelopeIcon> = {
  email: EnvelopeIcon,
  push: DevicePhoneMobileIcon,
  x: AtSymbolIcon,
};

/**
 * Step 2 - who wires up the technical side. The answer branches the flow: a builder goes on to
 * the sending domain and the contract; someone handing it over sends the steps to whoever holds
 * the credentials and skips the contract. Most account creators are not the ones holding them, so
 * the step is framed as a choice, not an assumption.
 */
export function StepTechnical({
  role,
  onRole,
  onHandoffSent,
}: {
  role: Role;
  onRole: (r: Role) => void;
  onHandoffSent: (email: string) => void;
}) {
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Who is setting up the technical side?
      </h1>
      <p className="text-muted-foreground mt-3">
        The contract, sending domain and SDK usually sit with someone else. Send
        them the steps and carry on. You do not have to wait.
      </p>

      <div className="mt-8 space-y-3">
        {ROLES.map((r) => {
          const on = role === r.id;
          const Icon = ROLE_ICONS[r.icon];
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => onRole(r.id)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                on
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  on
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block font-semibold">
                  {r.label}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {r.desc}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {on ? (
                  <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {role === "operator" ? <Delegate onSent={onHandoffSent} /> : null}
    </>
  );
}

/**
 * Hand the setup to whoever holds the credentials. The only thing worth asking is who to send it
 * to; the steps go with the invite. Optional: Continue never waits on it. The invite is a real
 * org invite (admin), so the developer lands with access to Settings -> Integrations -> Channels.
 */
function Delegate({ onSent }: { onSent: (email: string) => void }) {
  const sendHandoff = useSendHandoff();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = /.+@.+\..+/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const ok = await sendHandoff(email);
    setBusy(false);
    if (ok) {
      const addr = email.trim().toLowerCase();
      setSentTo(addr);
      onSent(addr);
    }
  };

  return (
    <div className="border-border mt-6 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        What they will set up
      </p>
      <ul className="mt-3 space-y-2.5">
        {SETUP_TASKS.map((t) => {
          const Icon = TASK_ICONS[t.icon];
          return (
            <li key={t.id} className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="text-foreground block text-sm font-medium">
                  {t.label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {t.who}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {sentTo ? (
        <HandoffSent email={sentTo} />
      ) : (
        <form className="mt-4 flex items-start gap-2" onSubmit={submit}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-label="Their email"
            placeholder="developer@yourteam.xyz"
          />
          <Button type="submit" disabled={!valid || busy}>
            <PaperAirplaneIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {busy ? "Sending…" : "Send steps"}
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Confirmation after the invite goes out, with the link that drops the developer straight into the
 * scoped setup flow (sending domain + contract) for this workspace. The invite gives them access;
 * this link is the shortcut past the dashboard to the two steps they were brought in for, to paste
 * wherever the team already talks.
 */
function HandoffSent({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Built on the client so it carries whatever origin the app is served from.
    setLink(
      `${window.location.origin}${AUTH_ROUTES.ONBOARDING}?mode=${HANDOFF_MODE}`
    );
    return () => clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-foreground flex items-center gap-2 text-sm">
        <CheckCircleIcon aria-hidden="true" className="text-primary h-4 w-4" />
        <span>
          Invited <b>{email}</b> as an admin. Carry on. When they are in, this
          link takes them straight to the setup steps.
        </span>
      </p>
      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-2">
        <code className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {link || "…"}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={copy}
          disabled={!link}
        >
          {copied ? (
            <ClipboardDocumentCheckIcon
              aria-hidden="true"
              className="mr-1.5 h-4 w-4"
            />
          ) : (
            <ClipboardIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
