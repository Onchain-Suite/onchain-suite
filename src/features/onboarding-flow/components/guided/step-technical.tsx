"use client";

import { CheckIcon } from "@heroicons/react/20/solid";
import {
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

import { type Role, type RoleIcon, ROLES } from "../../constants/guided";

const ICONS: Record<RoleIcon, typeof WrenchScrewdriverIcon> = {
  builder: WrenchScrewdriverIcon,
  operator: UserGroupIcon,
};

/**
 * Step 2 - who wires up the technical side. The answer branches the flow: a builder goes on to
 * the sending domain and the contract; someone handing it over skips the contract (the
 * developer's job). Most account creators are not the ones holding the credentials, so the step
 * is framed as a choice, not an assumption.
 */
export function StepTechnical({
  role,
  onRole,
}: {
  role: Role;
  onRole: (r: Role) => void;
}) {
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Who is setting up the technical side?
      </h1>
      <p className="text-muted-foreground mt-3">
        The contract, sending domain and SDK usually sit with someone else. You
        can carry on now and invite them from Settings whenever you like.
      </p>

      <div className="mt-8 space-y-3">
        {ROLES.map((r) => {
          const on = role === r.id;
          const Icon = ICONS[r.icon];
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

      {role === "operator" ? (
        <p className="text-muted-foreground mt-5 text-sm">
          No problem. Invite your developer from Settings → Team and we will
          send them the sending-domain, SDK and X setup steps.
        </p>
      ) : null}
    </>
  );
}
