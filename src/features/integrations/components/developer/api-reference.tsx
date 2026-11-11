"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { CopyButton } from "@/components/common/copy-button";

import { cn } from "@/lib/utils";

import {
  API_BASE_URL,
  API_ENDPOINTS,
  type ApiEndpoint,
  type ApiMethod,
} from "../../data/api-reference";
import {
  curlFor,
  groupEndpoints,
  searchEndpoints,
} from "../../utils/developer";
import { ToneBadge } from "./tone-badge";
import { Icon } from "@/shared/components/common/hugeicon";

const LABEL =
  "text-[11.5px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase";

function MethodBadge({ method }: { method: ApiMethod }) {
  return (
    <span
      className={cn(
        "inline-flex w-11 shrink-0 justify-center rounded px-1 py-0.5 font-mono text-[10.5px] font-semibold",
        method === "GET"
          ? "bg-(--status-info-bg) text-(--status-info-text)"
          : "bg-(--status-warning-bg) text-(--status-warning-text)"
      )}
    >
      {method}
    </span>
  );
}

function EndpointDetail({ endpoint }: { endpoint: ApiEndpoint }) {
  const request = useMemo(() => curlFor(endpoint, API_BASE_URL), [endpoint]);
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 p-4 lg:overflow-y-auto">
      <header className="flex flex-wrap items-center gap-2.5">
        <MethodBadge method={endpoint.method} />
        <code className="font-mono text-sm font-medium text-(--text-primary)">
          {endpoint.path}
        </code>
        <ToneBadge tone={endpoint.scope === "write" ? "info" : "neutral"}>
          {endpoint.scope === "write"
            ? "Needs a read and write key"
            : "Any key"}
        </ToneBadge>
      </header>
      <p className="text-sm leading-relaxed text-(--text-secondary)">
        {endpoint.summary}
      </p>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={LABEL}>Request</span>
          <CopyButton value={request} label="Copy request" />
        </div>
        <pre className="overflow-x-auto rounded-lg bg-(--tint-hover) px-3 py-2.5 font-mono text-xs leading-relaxed text-(--text-primary)">
          {request}
        </pre>
      </div>

      {endpoint.notes?.length ? (
        <div>
          <span className={LABEL}>Good to know</span>
          <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-[18px] text-[13px] leading-relaxed text-(--text-secondary)">
            {endpoint.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto border-t border-(--border-subtle) pt-3 text-[12.5px] leading-relaxed text-(--text-tertiary)">
        <p>
          Responses come back as{" "}
          <code className="font-mono">{"{ success, data }"}</code>. 401 is a bad
          or expired key, 403 a key without the scope, 400 or 422 an invalid
          body.
        </p>
        <p className="mt-1">
          A <code className="font-mono">sk_test_</code> key dry-runs: the call
          validates and answers as usual, and nothing is sent or saved.
        </p>
      </div>
    </div>
  );
}

/**
 * The endpoint reference beside the keys: pick a key, then read the call you
 * are about to make. Each request is a curl command to copy; the key in it is
 * a placeholder, because a secret is shown once and not kept here.
 */
export function ApiReference() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(API_ENDPOINTS[0].id);
  const groups = useMemo(() => groupEndpoints(searchEndpoints(q)), [q]);
  const current =
    API_ENDPOINTS.find((e) => e.id === selectedId) ?? API_ENDPOINTS[0];

  return (
    <div className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-(--border-default) bg-card sm:grid sm:grid-cols-[minmax(200px,250px)_minmax(0,1fr)] lg:shrink lg:grid-rows-[minmax(0,1fr)]">
      <nav
        aria-label="Endpoints"
        className="flex min-h-0 flex-col gap-2.5 border-b border-(--border-subtle) p-2.5 sm:border-r sm:border-b-0 lg:overflow-y-auto"
      >
        <label className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-(--border-default) px-2 text-(--text-tertiary) focus-within:border-primary">
          <Icon icon={Search01Icon} className="size-[13px] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Find an endpoint"
            placeholder="Find an endpoint"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-(--text-primary) outline-none placeholder:text-(--text-tertiary)"
          />
        </label>
        {groups.length === 0 ? (
          <p className="px-1 text-[12.5px] text-(--text-tertiary)">
            No endpoint matches &ldquo;{q.trim()}&rdquo;.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.group} className="flex flex-col gap-px">
              <span className={cn(LABEL, "px-1.5 pb-1")}>{g.group}</span>
              {g.items.map((e) => {
                const on = e.id === current.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-current={on ? "true" : undefined}
                    title={`${e.method} ${e.path}`}
                    onClick={() => setSelectedId(e.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                      on ? "bg-(--bg-selected)" : "hover:bg-(--tint-hover)"
                    )}
                  >
                    <MethodBadge method={e.method} />
                    <code
                      className={cn(
                        "min-w-0 truncate font-mono text-xs",
                        on ? "text-(--text-primary)" : "text-(--text-secondary)"
                      )}
                    >
                      {e.path}
                    </code>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </nav>
      <EndpointDetail key={current.id} endpoint={current} />
    </div>
  );
}
