"use client";

import { useQuery } from "@tanstack/react-query";

import { consentService } from "../../consent.service";
import type { ConsentView } from "../../contracts/consent";
import { consentDateLabel, consentSourceLabel } from "../../utils/consent";

const isUrl = (v: string) => /^https?:\/\//i.test(v);

function Proof({ value }: { value: string }) {
  return isUrl(value) ? (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="break-words">{value}</span>
  );
}

function Current({ v }: { v: ConsentView }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-muted-foreground">Source</dt>
      <dd className="text-foreground">
        {consentSourceLabel(v)}
        {v.consentMethod ? (
          <span className="text-muted-foreground"> · {v.consentMethod}</span>
        ) : null}
      </dd>
      <dt className="text-muted-foreground">Opted in</dt>
      <dd className="text-foreground">{consentDateLabel(v)}</dd>
      <dt className="text-muted-foreground">Double opt-in</dt>
      <dd className="text-foreground">{v.doubleOptIn ? "Yes" : "No"}</dd>
      {v.consentProof ? (
        <>
          <dt className="text-muted-foreground">Proof</dt>
          <dd className="text-foreground">
            <Proof value={v.consentProof} />
          </dd>
        </>
      ) : null}
    </dl>
  );
}

/**
 * How and when this contact opted in, from
 * `GET /audience/profiles/:id/consent`: the strongest current record, then
 * every record newest first. Hidden when the read fails (an older backend
 * has no route), so the slide-over never shows an error for it.
 */
export function ContactConsentPanel({
  profileId,
  open,
}: {
  profileId: string;
  open: boolean;
}) {
  const query = useQuery({
    queryKey: ["audience", "profile-consent", profileId],
    queryFn: () => consentService.getProfileConsent(profileId),
    enabled: open && profileId.length > 0,
    retry: false,
    staleTime: 60_000,
  });

  if (query.isError) return null;
  const { data } = query;
  const history = data?.records ?? [];

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Consent
      </p>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading consent…</p>
      ) : !data?.current ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No opt-in recorded for this contact.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Current v={data.current} />
          {history.length > 1 ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                History
              </p>
              <ul className="space-y-1.5 text-sm">
                {history.map((r) => (
                  <li
                    key={r.id || `${r.consentSource}-${r.recordedAt}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-foreground">
                      {consentSourceLabel(r)}
                      {r.doubleOptIn ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · double opt-in
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {consentDateLabel(r)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
