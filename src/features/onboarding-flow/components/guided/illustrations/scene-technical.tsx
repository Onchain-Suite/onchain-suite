"use client";

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import {
  AtSymbolIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

import { FloatingChip, IllustrationShell } from "./illustration-frame";

const TASKS: {
  label: string;
  who: string;
  minutes: number;
  icon: typeof EnvelopeIcon;
}[] = [
  {
    label: "Email sending domain",
    who: "DNS owner",
    minutes: 10,
    icon: EnvelopeIcon,
  },
  {
    label: "In-app push SDK",
    who: "Frontend eng",
    minutes: 20,
    icon: DevicePhoneMobileIcon,
  },
  { label: "X DM access", who: "X app owner", minutes: 15, icon: AtSymbolIcon },
];

/** Step 2 scene: hand the technical setup to whoever holds the credentials, one message, tracked. */
export function SceneTechnical() {
  return (
    <IllustrationShell
      chips={
        <FloatingChip
          className="-right-4 -top-4"
          icon={PaperAirplaneIcon}
          title="Steps sent"
          subtitle="dev@acme.xyz"
        />
      }
    >
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-medium">
            Setup handoff
          </p>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
            ~45 min
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {TASKS.map((t) => (
            <li
              key={t.label}
              className="bg-background flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
            >
              <span className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <t.icon aria-hidden className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-medium">
                  {t.label}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {t.who} · {t.minutes} min
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-xl border p-3">
        <CheckCircleIcon
          aria-hidden
          className="text-primary h-5 w-5 shrink-0"
        />
        <p className="text-foreground text-xs">
          Invited as an admin. They pick up the sending domain and contracts
          from here while you keep building.
        </p>
      </div>
    </IllustrationShell>
  );
}
