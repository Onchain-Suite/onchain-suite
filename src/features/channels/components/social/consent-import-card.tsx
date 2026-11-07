"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import {
  chunk,
  type ConsentColumn,
  type ConsentRow,
  mapColumns,
  parseCsv,
  REQUIRED_COLUMNS,
  toRows,
} from "../../utils/consent-csv";
import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/** The API takes 500 rows per request. */
const CHUNK = 500;
const MAX_SHOWN_ERRORS = 20;

const COLUMN_LABEL: Record<ConsentColumn, string> = {
  walletAddress: "wallet",
  phone: "phone",
  consentedAt: "consented_at",
  source: "source",
  ipAddress: "ip",
};

const REASON: Record<string, string> = {
  wallet_missing: "no wallet",
  wallet_invalid: "wallet isn't a valid address",
  phone_missing: "no phone number",
  phone_invalid:
    "phone number isn't valid (add the country code, or set a default country)",
  consented_at_missing: "no consent date",
  consented_at_invalid: "consent date isn't a date",
  consented_at_in_future: "consent date is in the future",
  consented_at_too_old: "consent date is before 2000",
  source_missing: "no source",
  bind_failed: "couldn't be saved, try again",
};

interface Parsed {
  fileName: string;
  rows: ConsentRow[];
  missing: ConsentColumn[];
}

interface Totals {
  imported: number;
  alreadyConsented: number;
  suppressed: number;
  duplicate: number;
  invalid: number;
  errors: Array<{ line: number; reason: string }>;
}

const EMPTY: Totals = {
  imported: 0,
  alreadyConsented: 0,
  suppressed: 0,
  duplicate: 0,
  invalid: 0,
  errors: [],
};

/**
 * Import numbers you already have permission to message, with the proof of
 * how each person agreed. The file is read here and sent in chunks; nothing is
 * texted. Numbers that replied STOP before are never re-added.
 */
export function ConsentImportCard({
  channel,
}: {
  channel: "sms" | "whatsapp";
}) {
  const { organizationId } = useAccountOrg();
  const [wording, setWording] = useState("");
  const [source, setSource] = useState("");
  const [country, setCountry] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const abort = useRef<AbortController | null>(null);

  const readFile = async (file: File) => {
    setTotals(null);
    const table = parseCsv(await file.text());
    const [header, ...body] = table;
    if (!header || body.length === 0) {
      setParsed(null);
      toast.error("That file has no rows under a header.");
      return;
    }
    const columns = mapColumns(header);
    setParsed({
      fileName: file.name,
      rows: toRows(body, columns),
      missing: REQUIRED_COLUMNS.filter((c) => columns[c] === undefined),
    });
  };

  const ready =
    parsed !== null &&
    parsed.missing.length === 0 &&
    wording.trim().length >= 20 &&
    source.trim().length >= 3 &&
    (country === "" || /^[A-Za-z]{2}$/.test(country));

  const run = async () => {
    if (!parsed || !ready) return;
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setDone(0);
    const sum: Totals = { ...EMPTY, errors: [] };
    setTotals(sum);
    try {
      const chunks = chunk(parsed.rows, CHUNK);
      for (const [i, rows] of chunks.entries()) {
        const r = await connectionsService.consentImport(
          channel,
          {
            consentText: wording.trim(),
            source: source.trim(),
            ...(country ? { defaultCountry: country.toUpperCase() } : {}),
            rows: rows as Array<Record<string, string>>,
          },
          controller.signal,
          organizationId ?? undefined
        );
        sum.imported += r.imported;
        sum.alreadyConsented += r.alreadyConsented;
        sum.suppressed += r.suppressed;
        sum.duplicate += r.duplicate;
        sum.invalid += r.invalid;
        for (const e of r.errors) {
          // Line 1 is the header, so data row 0 of chunk 0 is line 2.
          sum.errors.push({ line: i * CHUNK + e.row + 2, reason: e.reason });
        }
        setDone(Math.min((i + 1) * CHUNK, parsed.rows.length));
        setTotals({ ...sum, errors: [...sum.errors] });
      }
      toast.success(`Imported ${sum.imported.toLocaleString()} numbers`);
    } catch (e) {
      if (!controller.signal.aborted) {
        toast.error(
          e instanceof Error ? e.message : "The import stopped partway."
        );
      }
    } finally {
      setRunning(false);
      abort.current = null;
    }
  };

  const total = parsed?.rows.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          Import numbers with consent
        </h3>
        <p className="text-xs text-muted-foreground">
          For people who already agreed to hear from you. Upload a CSV with{" "}
          <code>wallet</code>, <code>phone</code> and <code>consented_at</code>{" "}
          columns (<code>source</code> and <code>ip</code> are optional). Nobody
          is messaged by the import, and anyone who replied STOP before is left
          out.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${channel}-consent-wording`}>
          Consent wording they agreed to
        </Label>
        <Textarea
          id={`${channel}-consent-wording`}
          rows={3}
          value={wording}
          disabled={running}
          onChange={(e) => setWording(e.target.value)}
          placeholder="I agree to receive marketing text messages from Acme. Msg & data rates may apply. Reply STOP to opt out."
        />
        <p className="text-xs text-muted-foreground">
          Paste the exact text shown next to the checkbox. It&apos;s kept as
          evidence with every number.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label htmlFor={`${channel}-consent-source`}>Where they agreed</Label>
          <Input
            id={`${channel}-consent-source`}
            value={source}
            disabled={running}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://app.acme.xyz/settings/alerts"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${channel}-consent-country`}>Default country</Label>
          <Input
            id={`${channel}-consent-country`}
            value={country}
            disabled={running}
            maxLength={2}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="US"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${channel}-consent-file`}>CSV file</Label>
        <Input
          id={`${channel}-consent-file`}
          type="file"
          accept=".csv,text/csv"
          disabled={running}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              readFile(file).catch(() =>
                toast.error("Couldn't read that file.")
              );
          }}
        />
        {parsed ? (
          parsed.missing.length > 0 ? (
            <p className="text-xs text-destructive">
              {parsed.fileName} is missing{" "}
              {parsed.missing.map((c) => COLUMN_LABEL[c]).join(", ")}{" "}
              {parsed.missing.length === 1 ? "column" : "columns"}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {parsed.fileName}: {total.toLocaleString()}{" "}
              {total === 1 ? "row" : "rows"} ready.
            </p>
          )
        ) : null}
      </div>

      {running || totals ? (
        <div className="space-y-2">
          <Progress value={pct} aria-label="Import progress" />
          <p className="text-xs tabular-nums text-muted-foreground">
            {done.toLocaleString()} of {total.toLocaleString()} rows
          </p>
        </div>
      ) : null}

      {totals && !running ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <Stat label="Imported" value={totals.imported} />
          <Stat label="Already imported" value={totals.alreadyConsented} />
          <Stat label="Opted out before" value={totals.suppressed} />
          <Stat label="Repeated in file" value={totals.duplicate} />
          <Stat label="Couldn't import" value={totals.invalid} />
        </dl>
      ) : null}

      {totals && totals.errors.length > 0 && !running ? (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          {totals.errors.slice(0, MAX_SHOWN_ERRORS).map((e) => (
            <li key={`${e.line}-${e.reason}`}>
              Line {e.line}: {REASON[e.reason] ?? e.reason}
            </li>
          ))}
          {totals.errors.length > MAX_SHOWN_ERRORS ? (
            <li>…and {totals.errors.length - MAX_SHOWN_ERRORS} more</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm" disabled={!ready || running} onClick={run}>
          {running ? "Importing..." : "Import"}
        </Button>
        {running ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => abort.current?.abort()}
          >
            Stop
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
