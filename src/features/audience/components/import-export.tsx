"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import {
  type AudienceExportJobStatus,
  type AudienceImportExportFormat,
  type AudienceImportJobStatus,
  type AudienceImportPreset,
  audienceService,
} from "@/features/audience/audience.service";
import { PageHeader } from "@/shared/components/page/page-header";

const fieldOptions = [
  { value: "", label: "Skip this column" },
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
  { value: "wallet", label: "Wallet Address" },
  { value: "tags", label: "Tags" },
  { value: "status", label: "Status" },
  { value: "chain", label: "Chain" },
  { value: "notes", label: "Notes" },
  { value: "custom", label: "Custom Field" },
];

// Radix Select reserves "" to clear selection, so the "Skip this column"
// option is represented by this sentinel and mapped back to "" on change.
const SKIP_VALUE = "__skip";

// Same sentinel trick for the platform preset select's "none/custom" option.
const PLATFORM_NONE = "__custom";

type ImportStep = "upload" | "mapping" | "complete";
type ActiveTab = "import" | "export";

interface CSVColumn {
  header: string;
  sample: string[];
  mappedTo: string;
}

type ImportHistoryStatus =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

type ExportHistoryStatus =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

interface ImportHistoryItem {
  jobId: string;
  fileName: string;
  format: AudienceImportExportFormat;
  createdAt: string;
  status: ImportHistoryStatus;
  processedRows?: number;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  errorCount?: number;
}

interface ExportHistoryItem {
  jobId: string;
  format: AudienceImportExportFormat;
  createdAt: string;
  status: ExportHistoryStatus;
  processedRows?: number;
  totalRows?: number;
  fileSizeBytes?: number;
}

const steps = [
  { id: "upload", label: "Upload" },
  { id: "mapping", label: "Map Fields" },
  { id: "complete", label: "Complete" },
];

const IMPORT_HISTORY_KEY = "onchain.audience.importHistory.v1";
const EXPORT_HISTORY_KEY = "onchain.audience.exportHistory.v1";

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toIsoNow = () => new Date().toISOString();

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRateLimitedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as { cause?: unknown; message?: unknown };
  const candidate = (err.cause ?? err) as {
    response?: { status?: unknown };
    status?: unknown;
    message?: unknown;
  };
  const status =
    typeof candidate.response?.status === "number"
      ? candidate.response.status
      : typeof candidate.status === "number"
        ? candidate.status
        : null;
  if (status === 429) return true;
  const msg =
    typeof err.message === "string"
      ? err.message
      : typeof candidate.message === "string"
        ? candidate.message
        : "";
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
};

// Large imports (100k+ rows) exceed the Next.js/Vercel proxy body cap, so upload
// straight to the backend when NEXT_PUBLIC_BACKEND_URL is set; fall back to the
// proxied service call on a network/CORS error.
const getDirectBackendBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
};

const unwrapBackendEnvelope = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

const toHumanBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const fixed = value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${fixed} ${units[idx]}`;
};

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readFileSnippetText = async (file: File, bytes: number) => {
  const blob = file.slice(0, Math.max(0, bytes));
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(blob);
  });
};

interface PreviewTable {
  headers: string[];
  rows: string[][];
}

const cellToString = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
};

// Turn an array of JSON objects into a flat preview table (union of keys).
const objectsToTable = (objs: unknown[], maxRows = 6): PreviewTable | null => {
  const records = objs.filter(
    (o): o is Record<string, unknown> =>
      typeof o === "object" && o !== null && !Array.isArray(o)
  );
  if (records.length === 0) return null;
  const headers: string[] = [];
  for (const rec of records.slice(0, maxRows)) {
    for (const k of Object.keys(rec)) if (!headers.includes(k)) headers.push(k);
  }
  if (headers.length === 0) return null;
  const rows = records
    .slice(0, maxRows)
    .map((rec) => headers.map((h) => cellToString(rec[h])));
  return { headers, rows };
};

const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.map((v) => v.replace(/^"|"$/g, ""));
};

const csvToTable = (text: string, maxRows = 6): PreviewTable | null => {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1, maxRows + 1).map((line) => {
    const cells = splitCsvLine(line);
    return headers.map((_, i) => cells[i] ?? "");
  });
  return { headers, rows };
};

const EXPECTED_FIELDS = [
  { key: "email", required: true, note: "Primary identifier" },
  { key: "name", required: false, note: "Display name" },
  { key: "wallet", required: false, note: "0x… or address" },
  { key: "tags", required: false, note: "Comma-separated" },
  { key: "status", required: false, note: "subscribed / unsubscribed" },
  { key: "chain", required: false, note: "e.g. eth-mainnet" },
  { key: "notes", required: false, note: "Free text" },
];

/** Small info popover documenting the accepted CSV / JSON shape. */
function FormatHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Expected file format"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(340px,calc(100vw-2rem))] rounded-xl p-0 text-sm"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="font-medium text-foreground">Expected file format</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            CSV needs a header row. JSON should be an array of objects (or{" "}
            <code className="rounded bg-muted px-1">{"{ data: [...] }"}</code>).
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recognized columns / keys
          </p>
          <div className="space-y-1.5">
            {EXPECTED_FIELDS.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-3"
              >
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {f.key}
                </code>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {f.note}
                  {f.required ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      required
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-2.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              CSV example
            </p>
            <pre className="overflow-x-auto font-mono text-[11px] text-foreground">
              {`email,name,wallet,tags
a@x.io,Ada,0xAbC…,vip`}
            </pre>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * "Import from platform" preset picker (`GET /audience/imports/presets`).
 * Defaults to none/custom; when a platform is chosen the import POST carries
 * `?platform=` so the backend auto-maps that platform's CSV export headers
 * (explicit column mappings still override). Renders nothing when no presets
 * are available (fetch failure degrades to the manual-only flow).
 */
function PlatformPresetSelect({
  presets,
  value,
  onChange,
}: {
  presets: AudienceImportPreset[];
  value: string;
  onChange: (platform: string) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Import from platform
      </span>
      <Select
        value={value === "" ? PLATFORM_NONE : value}
        onValueChange={(v) => onChange(v === PLATFORM_NONE ? "" : v)}
      >
        <SelectTrigger
          aria-label="Import from platform"
          className="h-9 w-52 rounded-lg border-border bg-background text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value={PLATFORM_NONE}>Custom (manual mapping)</SelectItem>
          {presets.map((preset) => (
            <SelectItem key={preset.platform} value={preset.platform}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Compact, scrollable table preview of the uploaded file's first rows. */
function FilePreviewTable({ table }: { table: PreviewTable }) {
  const headerCells = table.headers.map((h, i) => ({
    key: `h${i}`,
    label: h || `Column ${i + 1}`,
  }));
  const bodyRows = table.rows.map((row, r) => ({
    key: `row${r}`,
    cells: table.headers.map((_, c) => ({
      key: `r${r}c${c}`,
      val: row[c] ?? "",
    })),
  }));
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-muted/60">
            {headerCells.map((c) => (
              <th
                key={c.key}
                className="whitespace-nowrap border-b border-border px-3 py-2 font-medium text-foreground"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row) => (
            <tr key={row.key} className="even:bg-muted/20">
              {row.cells.map((cell) => (
                <td
                  key={cell.key}
                  className="max-w-[220px] truncate border-b border-border/60 px-3 py-2 font-mono text-muted-foreground"
                  title={cell.val}
                >
                  {cell.val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportExportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("import");
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [filePreviewText, setFilePreviewText] = useState<string>("");
  const [filePreviewError, setFilePreviewError] = useState<string>("");
  const [previewTable, setPreviewTable] = useState<PreviewTable | null>(null);
  // "" = none/custom (manual mapping only); otherwise a platform id whose
  // preset the backend applies via `?platform=` on the import POST.
  const [importPlatform, setImportPlatform] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Presets discovery is effectively static — cache it for the session and
  // degrade silently to the manual-only flow if it fails (no toast, no gate).
  const presetsQuery = useQuery({
    queryKey: ["audience", "imports", "presets"],
    queryFn: () => audienceService.listImportPresets(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const importPresets = useMemo(
    () => presetsQuery.data ?? [],
    [presetsQuery.data]
  );

  const selectedPreset = useMemo(
    () =>
      importPresets.find((preset) => preset.platform === importPlatform) ??
      null,
    [importPresets, importPlatform]
  );

  // Headers the selected preset pre-maps (case-insensitive), when the
  // discovery payload exposes the header map — used purely as a visual hint.
  const presetHeaderSet = useMemo(() => {
    const set = new Set<string>();
    for (const header of Object.keys(selectedPreset?.mapping ?? {})) {
      set.add(header.trim().toLowerCase());
    }
    return set;
  }, [selectedPreset]);

  const isCsvFile = Boolean(uploadedFile?.name?.toLowerCase().endsWith(".csv"));
  const isJsonFile = Boolean(
    uploadedFile?.name?.toLowerCase().endsWith(".json")
  );
  const selectedImportFormat: AudienceImportExportFormat | null = isCsvFile
    ? "csv"
    : isJsonFile
      ? "json"
      : null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  useEffect(() => {
    const rawImports =
      typeof window !== "undefined"
        ? window.localStorage.getItem(IMPORT_HISTORY_KEY)
        : null;
    const parsedImports =
      typeof rawImports === "string" ? safeJsonParse(rawImports) : null;
    const importsArray = Array.isArray(parsedImports) ? parsedImports : [];
    setImportHistory(
      importsArray
        .filter((x) => x && typeof x === "object")
        .slice(0, 50) as ImportHistoryItem[]
    );

    const rawExports =
      typeof window !== "undefined"
        ? window.localStorage.getItem(EXPORT_HISTORY_KEY)
        : null;
    const parsedExports =
      typeof rawExports === "string" ? safeJsonParse(rawExports) : null;
    const exportsArray = Array.isArray(parsedExports) ? parsedExports : [];
    setExportHistory(
      exportsArray
        .filter((x) => x && typeof x === "object")
        .slice(0, 50) as ExportHistoryItem[]
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IMPORT_HISTORY_KEY,
      JSON.stringify(importHistory.slice(0, 50))
    );
  }, [importHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      EXPORT_HISTORY_KEY,
      JSON.stringify(exportHistory.slice(0, 50))
    );
  }, [exportHistory]);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const [headerLine] = lines;
    const headers = headerLine
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    const columns: CSVColumn[] = headers.map((header, index) => {
      const samples: string[] = [];
      for (let i = 1; i < Math.min(4, lines.length); i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        if (values[index]) samples.push(values[index]);
      }

      let autoMap = "";
      const headerLower = header.toLowerCase();
      if (headerLower.includes("email")) autoMap = "email";
      else if (headerLower.includes("name")) autoMap = "name";
      else if (
        headerLower.includes("wallet") ||
        headerLower.includes("address")
      )
        autoMap = "wallet";
      else if (headerLower.includes("tag")) autoMap = "tags";
      else if (headerLower.includes("status")) autoMap = "status";
      else if (headerLower.includes("chain")) autoMap = "chain";

      return { header, sample: samples, mappedTo: autoMap };
    });

    return columns;
  };

  const handleFileSelect = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
      toast.error("Only CSV and JSON files are supported");
      return;
    }
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        "That file is over 100MB. Split your contacts into a few smaller files (each under 100MB) and import them one at a time."
      );
      return;
    }

    setUploadedFile(file);
    setImportJobId(null);
    setFilePreviewError("");
    setFilePreviewText("");
    setPreviewTable(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.toLowerCase().endsWith(".csv")) {
        const columns = parseCSV(text);
        setCsvColumns(columns);
        setPreviewTable(csvToTable(text));
        setImportStep("mapping");
        return;
      }

      setCsvColumns([]);
      setImportStep("mapping");
    };
    reader.readAsText(file.slice(0, 200_000));

    (async () => {
      try {
        const snippet = await readFileSnippetText(file, 50_000);
        if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = safeJsonParse(snippet);
          let records: unknown[] | null = null;
          if (Array.isArray(parsed)) {
            records = parsed;
          } else if (parsed && typeof parsed === "object") {
            const obj = parsed as Record<string, unknown>;
            if (Array.isArray(obj.data)) records = obj.data;
          }
          if (records) {
            const table = objectsToTable(records);
            if (table) {
              setPreviewTable(table);
              return;
            }
            setFilePreviewText(JSON.stringify(records.slice(0, 3), null, 2));
            return;
          }
        }
        const lines = snippet.split(/\r?\n/).slice(0, 12).join("\n");
        setFilePreviewText(lines);
      } catch (e) {
        setFilePreviewError(
          e instanceof Error ? e.message : "Preview unavailable"
        );
      }
    })().catch(() => undefined);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const [file] = Array.from(e.dataTransfer.files);
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".json"))) {
      handleFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const updateMapping = (index: number, value: string) => {
    setCsvColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, mappedTo: value } : col))
    );
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error("No file selected");
      const lower = uploadedFile.name.toLowerCase();
      const format: AudienceImportExportFormat | undefined = lower.endsWith(
        ".csv"
      )
        ? "csv"
        : lower.endsWith(".json")
          ? "json"
          : undefined;
      if (!format) throw new Error("Unsupported file type");

      const mapping: Record<string, string> = {};
      if (format === "csv") {
        for (const col of csvColumns) {
          const target = col.mappedTo?.trim();
          if (!target) continue;
          if (target === "custom") {
            const key = col.header.trim().replace(/\s+/g, "_");
            mapping[col.header] = `attributes.${key}`;
            continue;
          }
          mapping[col.header] = target;
        }
      }

      const query = {
        mode: "upsert",
        onConflict: "update",
        dedupeKey: "email",
        maxErrors: 10000,
      };

      const orgId = getSelectedOrganizationId();
      const directBase = getDirectBackendBaseUrl();

      const uploadDirect = async (): Promise<unknown> => {
        if (!directBase) throw new Error("Missing backend URL");
        if (!orgId) throw new Error("Missing organization id");

        const fd = new FormData();
        fd.append("file", uploadedFile);
        if (format === "csv" && Object.keys(mapping).length > 0) {
          fd.append("mapping", JSON.stringify(mapping));
        }

        const params = new URLSearchParams();
        params.set("format", format);
        if (importPlatform) params.set("platform", importPlatform);
        for (const [k, v] of Object.entries(query)) {
          if (v === undefined) continue;
          params.set(k, String(v));
        }

        let attempts = 0;
        for (;;) {
          const res = await fetch(`${directBase}/audience/imports?${params}`, {
            method: "POST",
            body: fd,
            credentials: "include",
            headers: {
              "x-org-id": orgId,
            },
          });

          if (res.ok) {
            const json = await res.json().catch(() => null);
            return unwrapBackendEnvelope(json);
          }

          if (res.status === 429 && attempts < 3) {
            attempts += 1;
            await wait(2000 + Math.floor(Math.random() * 3000));
            continue;
          }

          const bodyText = await res.text().catch(() => "");
          throw new Error(
            `Import upload failed [HTTP ${res.status}]: ${
              bodyText.trim().length > 0 ? bodyText : "Request failed"
            }`
          );
        }
      };

      // The same-origin API proxy injects the session server-side (from the
      // onchain.token cookie), so it authenticates reliably — but it runs on a
      // serverless function with a ~4.5MB request-body cap. The direct-to-
      // backend upload has no size cap but relies on a cross-origin session
      // cookie the browser won't send (→ 401). So: route small/medium files
      // through the authenticated proxy, and only large files direct.
      const PROXY_BODY_LIMIT = 4 * 1024 * 1024; // headroom under the ~4.5MB cap

      const uploadViaProxy = async (): Promise<unknown> => {
        let attempts = 0;
        for (;;) {
          try {
            return await audienceService.createImportJob({
              file: uploadedFile,
              format,
              mapping: format === "csv" ? mapping : undefined,
              platform: importPlatform || undefined,
              query,
            });
          } catch (innerError) {
            if (!isRateLimitedError(innerError) || attempts >= 3)
              throw innerError;
            attempts += 1;
            await wait(2000 + Math.floor(Math.random() * 3000));
          }
        }
      };

      let res: unknown;
      if (uploadedFile.size <= PROXY_BODY_LIMIT) {
        res = await uploadViaProxy();
      } else {
        // Large file: must go direct (over the proxy's serverless body cap).
        try {
          res = await uploadDirect();
        } catch (error) {
          const authRejected =
            error instanceof Error && /\[HTTP 40[13]\]/.test(error.message);
          const networkFailed =
            !directBase ||
            !orgId ||
            error instanceof TypeError ||
            (error instanceof Error &&
              error.message.toLowerCase().includes("failed to fetch"));
          if (authRejected || networkFailed) {
            throw new Error(
              "This file is larger than the app can proxy (~4.5MB) and the direct upload to the backend was rejected. Split it into files under 4MB to import now, or enable credentialed CORS on the backend imports endpoint so large direct uploads authenticate.",
              { cause: error }
            );
          }
          throw error;
        }
      }

      const jobIdCandidate = (res as { jobId?: unknown }).jobId;
      const jobId =
        typeof jobIdCandidate === "string" && jobIdCandidate.length > 0
          ? jobIdCandidate
          : typeof (res as unknown as { id?: unknown }).id === "string"
            ? String((res as unknown as { id?: unknown }).id)
            : typeof (res as unknown as { jobId?: unknown }).jobId === "string"
              ? String((res as unknown as { jobId?: unknown }).jobId)
              : null;

      if (!jobId)
        throw new Error("Import job started but no jobId was returned");
      return { jobId };
    },
    onMutate: () => {
      setIsImporting(true);
    },
    onSuccess: ({ jobId }) => {
      setImportJobId(jobId);
      if (uploadedFile && selectedImportFormat) {
        const entry: ImportHistoryItem = {
          jobId,
          fileName: uploadedFile.name,
          format: selectedImportFormat,
          createdAt: toIsoNow(),
          status: "queued",
        };
        setImportHistory((prev) =>
          [entry, ...prev.filter((x) => x.jobId !== jobId)].slice(0, 50)
        );
      }
      toast.success(
        "Import started — you can keep using the platform. It runs in the background and we'll let you know when it's done."
      );
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Import failed";
      toast.error(message);
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const importStatusQuery = useQuery({
    queryKey: ["audience", "imports", importJobId],
    queryFn: async () => {
      if (!importJobId) return null;
      return audienceService.getImportJob(importJobId);
    },
    enabled: Boolean(importJobId),
    refetchInterval: (q) => {
      const data = q.state.data as AudienceImportJobStatus | null | undefined;
      const state = String(data?.state ?? "");
      if (!data) return 1500;
      if (state === "queued" || state === "processing") return 1500;
      return false;
    },
  });

  const importStatus = importStatusQuery.data ?? null;

  useEffect(() => {
    if (!importJobId || !importStatus) return;
    const state = String(importStatus.state ?? "") as ImportHistoryStatus;
    setImportHistory((prev) => {
      const next = prev.map((x) => {
        if (x.jobId !== importJobId) return x;
        const updated: ImportHistoryItem = {
          ...x,
          status: state || x.status,
          processedRows: importStatus.processedRows ?? x.processedRows,
          totalRows: importStatus.totalRows ?? x.totalRows,
          createdCount: importStatus.createdCount ?? x.createdCount,
          updatedCount: importStatus.updatedCount ?? x.updatedCount,
          errorCount: importStatus.errorCount ?? x.errorCount,
        };
        return updated;
      });
      return next;
    });
  }, [importJobId, importStatus]);

  const cancelImportMutation = useMutation({
    mutationFn: async () => {
      if (!importJobId) return;
      await audienceService.cancelImportJob(importJobId);
    },
    onSuccess: () => {
      if (importJobId) {
        setImportHistory((prev) =>
          prev.map((x) =>
            x.jobId === importJobId ? { ...x, status: "cancelled" } : x
          )
        );
      }
      toast.success("Import cancelled");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to cancel import"),
  });

  const downloadImportErrorsMutation = useMutation({
    mutationFn: async () => {
      if (!importJobId) throw new Error("Missing jobId");
      const blob = await audienceService.downloadImportErrors(importJobId);
      return blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience-import-errors-${importJobId ?? "job"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to download errors"),
  });

  const exportMutation = useMutation({
    mutationFn: async (format: AudienceImportExportFormat) => {
      const res = await audienceService.createExportJob({ format });
      const jobId =
        typeof res.jobId === "string" && res.jobId.length > 0
          ? res.jobId
          : typeof (res as unknown as { id?: unknown }).id === "string"
            ? String((res as unknown as { id?: unknown }).id)
            : null;
      if (!jobId)
        throw new Error("Export job started but no jobId was returned");
      return { jobId, format };
    },
    onSuccess: ({ jobId, format }) => {
      setExportJobId(jobId);
      const entry: ExportHistoryItem = {
        jobId,
        format,
        createdAt: toIsoNow(),
        status: "queued",
      };
      setExportHistory((prev) =>
        [entry, ...prev.filter((x) => x.jobId !== jobId)].slice(0, 50)
      );
      toast.success("Export started");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  const exportStatusQuery = useQuery({
    queryKey: ["audience", "exports", exportJobId],
    queryFn: async () => {
      if (!exportJobId) return null;
      return audienceService.getExportJob(exportJobId);
    },
    enabled: Boolean(exportJobId),
    refetchInterval: (q) => {
      const data = q.state.data as AudienceExportJobStatus | null | undefined;
      const state = String(data?.state ?? "");
      if (!data) return 1500;
      if (state === "queued" || state === "processing") return 1500;
      return false;
    },
  });

  const exportStatus = exportStatusQuery.data ?? null;

  useEffect(() => {
    if (!exportJobId || !exportStatus) return;
    const state = String(exportStatus.state ?? "") as ExportHistoryStatus;
    setExportHistory((prev) =>
      prev.map((x) => {
        if (x.jobId !== exportJobId) return x;
        return {
          ...x,
          status: state || x.status,
          processedRows: exportStatus.processedRows ?? x.processedRows,
          totalRows: exportStatus.totalRows ?? x.totalRows,
          fileSizeBytes: exportStatus.fileSizeBytes ?? x.fileSizeBytes,
          format:
            (exportStatus.format as AudienceImportExportFormat | undefined) ??
            x.format,
        };
      })
    );
  }, [exportJobId, exportStatus]);

  const cancelExportMutation = useMutation({
    mutationFn: async () => {
      if (!exportJobId) return;
      await audienceService.cancelExportJob(exportJobId);
    },
    onSuccess: () => {
      if (exportJobId) {
        setExportHistory((prev) =>
          prev.map((x) =>
            x.jobId === exportJobId ? { ...x, status: "cancelled" } : x
          )
        );
      }
      toast.success("Export cancelled");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to cancel export"),
  });

  const downloadExportMutation = useMutation({
    mutationFn: async () => {
      if (!exportJobId) throw new Error("Missing jobId");
      const blob = await audienceService.downloadExport(exportJobId);
      return blob;
    },
    onSuccess: (blob) => {
      const ext =
        (exportStatus?.format ?? "").toString().toLowerCase() === "json"
          ? "json"
          : "csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience-export-${exportJobId ?? "job"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to download export"),
  });

  const handleImport = () => {
    importMutation.mutateAsync().catch(() => undefined);
  };

  const resetImport = () => {
    setImportStep("upload");
    setUploadedFile(null);
    setCsvColumns([]);
    setImportResult(null);
    setImportJobId(null);
    setPreviewTable(null);
    setFilePreviewText("");
    setFilePreviewError("");
  };

  const mappedCount = csvColumns.filter((c) => c.mappedTo).length;

  useEffect(() => {
    if (!importStatus) return;
    const state = String(importStatus.state ?? "");
    if (state === "completed") {
      const success =
        (importStatus.createdCount ?? 0) + (importStatus.updatedCount ?? 0);
      const failed = importStatus.errorCount ?? 0;
      setImportResult({ success, failed });
      setImportStep("complete");
      toast.success(
        failed > 0
          ? `Import finished — ${success.toLocaleString()} contacts imported, ${failed.toLocaleString()} skipped.`
          : `Import finished — ${success.toLocaleString()} contacts imported.`
      );
      return;
    }
    if (state === "failed") {
      toast.error("Import failed");
    }
  }, [importStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto w-full max-w-[1600px] space-y-6 text-foreground"
    >
      <Link
        href="/audience"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Back to Audience
      </Link>

      <PageHeader
        title="Import / Export"
        description="Bulk import contacts or export your audience data."
        actions={
          importStep === "upload" ? (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <button
                onClick={() => setActiveTab("import")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "import"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setActiveTab("export")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "export"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Export
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {importStep !== "upload" && (
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const stepIndex = steps.findIndex((s) => s.id === importStep);
              const currentIndex = steps.findIndex((s) => s.id === step.id);
              const isActive = step.id === importStep;
              const isCompleted = currentIndex < stepIndex;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => {
                      if (isCompleted && step.id === "upload") resetImport();
                    }}
                    disabled={!isCompleted}
                    className={`flex items-center gap-3 ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isActive
                            ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                            : "bg-(--color-elevated) text-(--color-text-muted)"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-primary"
                          : isCompleted
                            ? "hidden text-(--color-text) sm:inline"
                            : "hidden text-(--color-text-muted) sm:inline"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {!isLast && (
                    <div
                      className={`mx-2 h-0.5 w-6 rounded-full transition-colors sm:mx-4 sm:w-16 ${
                        isCompleted ? "bg-primary" : "bg-(--color-border)"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {importStep === "upload" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="space-y-8"
          >
            {activeTab === "import" && (
              <section>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">
                    Upload contacts
                  </h3>
                  <div className="flex items-center gap-3">
                    <PlatformPresetSelect
                      presets={importPresets}
                      value={importPlatform}
                      onChange={setImportPlatform}
                    />
                    <FormatHelp />
                  </div>
                </div>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all shadow-md hover:shadow-lg sm:p-20 ${
                    dragActive
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-(--color-border) hover:border-primary/50 hover:bg-(--color-card)"
                  }`}
                >
                  <CloudArrowUpIcon
                    className="mb-4 h-12 w-12 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-lg font-medium">
                    Drop files here or click to upload
                  </p>
                  <p className="mt-2 text-sm text-(--color-text-muted)">
                    Supports CSV and JSON formats
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                  >
                    Select File
                  </button>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-(--color-text-muted)">
                      Import history
                    </h3>
                    {importHistory.length > 0 && (
                      <button
                        onClick={() => setImportHistory([])}
                        className="text-xs text-(--color-text-muted) hover:text-(--color-text)"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {importHistory.length === 0 ? (
                    <div className="rounded-2xl border border-(--color-border) bg-(--color-card) p-6 text-sm text-(--color-text-muted)">
                      No imports yet. Upload a CSV or JSON file to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {importHistory.slice(0, 10).map((item) => (
                        <div
                          key={item.jobId}
                          className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-card) p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {item.format === "json" ? (
                              <CodeBracketIcon
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            ) : (
                              <DocumentTextIcon
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.fileName}
                              </p>
                              <p className="mt-0.5 text-xs text-(--color-text-muted)">
                                {formatShortDate(item.createdAt)} ·{" "}
                                {String(item.status)}
                                {typeof item.processedRows === "number"
                                  ? ` · ${item.processedRows.toLocaleString()} processed`
                                  : ""}
                                {typeof item.errorCount === "number" &&
                                item.errorCount > 0
                                  ? ` · ${item.errorCount.toLocaleString()} errors`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          {item.status === "completed" ? (
                            <CheckCircleIcon
                              className="h-5 w-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : item.status === "failed" ? (
                            <ExclamationCircleIcon
                              className="h-5 w-5 shrink-0 text-destructive"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="h-5 w-5 shrink-0 rounded-full bg-primary/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "export" && (
              <section>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => exportMutation.mutate("csv")}
                    disabled={exportMutation.isPending}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <DocumentTextIcon
                      className="h-6 w-6 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium">Export as CSV</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Spreadsheet compatible
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => exportMutation.mutate("json")}
                    disabled={exportMutation.isPending}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <CodeBracketIcon
                      className="h-6 w-6 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium">Export as JSON</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Developer friendly
                      </p>
                    </div>
                  </button>
                </div>

                {exportJobId && (
                  <div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-card) p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Export job</p>
                        <p className="mt-1 text-xs text-(--color-text-muted) break-all">
                          {exportJobId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cancelExportMutation.mutate()}
                          disabled={
                            cancelExportMutation.isPending ||
                            ["completed", "failed", "cancelled"].includes(
                              String(exportStatus?.state ?? "")
                            )
                          }
                          className="rounded-xl border border-(--color-border) px-3 py-2 text-xs font-medium hover:bg-(--color-elevated) disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => downloadExportMutation.mutate()}
                          disabled={
                            downloadExportMutation.isPending ||
                            String(exportStatus?.state ?? "") !== "completed"
                          }
                          className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(exportStatus?.progress ?? (String(exportStatus?.state ?? "") === "completed" ? 100 : 0))))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-(--color-text-muted)">
                        Status: {String(exportStatus?.state ?? "queued")}
                        {typeof exportStatus?.processedRows === "number"
                          ? ` · ${exportStatus.processedRows.toLocaleString()} processed`
                          : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-(--color-text-muted)">
                      Export history
                    </h3>
                    {exportHistory.length > 0 && (
                      <button
                        onClick={() => setExportHistory([])}
                        className="text-xs text-(--color-text-muted) hover:text-(--color-text)"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {exportHistory.length === 0 ? (
                    <div className="rounded-2xl border border-(--color-border) bg-(--color-card) p-6 text-sm text-(--color-text-muted)">
                      No exports yet. Choose CSV or JSON to generate your first
                      export.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {exportHistory.slice(0, 10).map((item) => (
                        <div
                          key={item.jobId}
                          className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-card) p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {item.format === "json" ? (
                              <CodeBracketIcon
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            ) : (
                              <DocumentTextIcon
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                audience-export-{item.jobId}.{item.format}
                              </p>
                              <p className="mt-0.5 text-xs text-(--color-text-muted)">
                                {formatShortDate(item.createdAt)} ·{" "}
                                {String(item.status)}
                                {typeof item.fileSizeBytes === "number"
                                  ? ` · ${toHumanBytes(item.fileSizeBytes)}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          {item.status === "completed" ? (
                            <CheckCircleIcon
                              className="h-5 w-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : item.status === "failed" ? (
                            <ExclamationCircleIcon
                              className="h-5 w-5 shrink-0 text-destructive"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="h-5 w-5 shrink-0 rounded-full bg-primary/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {importStep === "mapping" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">
                  {selectedImportFormat === "csv"
                    ? "Map CSV Columns"
                    : "Import JSON"}
                </h2>
                <p className="mt-1 text-sm text-(--color-text-muted)">
                  {uploadedFile?.name}
                  {selectedImportFormat === "csv"
                    ? ` · ${mappedCount} of ${csvColumns.length} columns mapped`
                    : ""}
                </p>
              </div>
              <button
                onClick={resetImport}
                aria-label="Cancel import"
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-card"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {selectedImportFormat === "csv" && importPresets.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-card) p-4">
                <PlatformPresetSelect
                  presets={importPresets}
                  value={importPlatform}
                  onChange={setImportPlatform}
                />
                {importPlatform && selectedPreset ? (
                  <p className="text-xs text-muted-foreground">
                    The {selectedPreset.label} preset maps recognized CSV
                    headers automatically on import. Columns you map manually
                    below override the preset.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pick a platform to auto-map its CSV export headers, or map
                    columns manually below.
                  </p>
                )}
              </div>
            )}

            {uploadedFile && (
              <div className="mb-6 rounded-2xl border border-(--color-border) bg-(--color-card) p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Preview</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">
                      {uploadedFile.name} · {toHumanBytes(uploadedFile.size)}
                      {selectedImportFormat
                        ? ` · ${selectedImportFormat.toUpperCase()}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {selectedImportFormat === "json" ? (
                      <CodeBracketIcon
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <DocumentTextIcon
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
                {filePreviewError.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-(--color-border) bg-(--color-elevated) p-4 text-sm text-destructive">
                    {filePreviewError}
                  </div>
                ) : previewTable ? (
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TableCellsIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      Showing first {previewTable.rows.length} row
                      {previewTable.rows.length === 1 ? "" : "s"}
                    </p>
                    <FilePreviewTable table={previewTable} />
                  </div>
                ) : (
                  <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-(--color-border) bg-(--color-elevated) p-4 text-xs text-(--color-text-muted)">
                    {filePreviewText.length > 0
                      ? filePreviewText
                      : "Preview unavailable."}
                  </pre>
                )}
              </div>
            )}

            {selectedImportFormat === "csv" ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {csvColumns.map((column, index) => {
                  const isMapped = Boolean(column.mappedTo);
                  // Unmapped columns the platform preset covers are applied
                  // server-side; manual selection below overrides.
                  const isPresetMapped =
                    !isMapped &&
                    Boolean(importPlatform) &&
                    presetHeaderSet.has(column.header.trim().toLowerCase());
                  return (
                    <div
                      key={column.header}
                      className={`rounded-xl border bg-(--color-card) p-3 transition-colors ${
                        isMapped
                          ? "border-primary/40"
                          : "border-(--color-border)"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="truncate text-sm font-medium"
                          title={column.header}
                        >
                          {column.header}
                        </p>
                        {isMapped ? (
                          <CheckIcon
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : isPresetMapped ? (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Preset
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-(--color-elevated) px-2 py-0.5 text-[10px] font-medium text-(--color-text-muted)">
                            Skipped
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-1 truncate font-mono text-[11px] text-(--color-text-muted)"
                        title={column.sample.join(", ")}
                      >
                        {column.sample.slice(0, 2).join(", ")}
                        {column.sample.length > 2 && "…"}
                      </p>
                      <Select
                        value={
                          column.mappedTo === "" ? SKIP_VALUE : column.mappedTo
                        }
                        onValueChange={(v) =>
                          updateMapping(index, v === SKIP_VALUE ? "" : v)
                        }
                      >
                        <SelectTrigger className="mt-2.5 h-9 w-full rounded-lg border-(--color-border) bg-(--color-background) text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {fieldOptions.map((option) => (
                            <SelectItem
                              key={option.value || SKIP_VALUE}
                              value={option.value || SKIP_VALUE}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-(--color-border) bg-(--color-card) p-6 text-sm text-(--color-text-muted)">
                Ready to import JSON file. No field mapping is required.
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 border-t border-(--color-border) pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-(--color-text-muted)">
                {selectedImportFormat === "csv"
                  ? mappedCount > 0
                    ? `Ready to import ${mappedCount} fields${
                        importPlatform && selectedPreset
                          ? ` (${selectedPreset.label} preset fills the rest)`
                          : ""
                      }`
                    : importPlatform && selectedPreset
                      ? `Ready to import with the ${selectedPreset.label} preset`
                      : "Map at least one column to continue"
                  : "Ready to import"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetImport}
                  className="rounded-xl border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-(--color-card)"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    isImporting ||
                    importMutation.isPending ||
                    !uploadedFile ||
                    !selectedImportFormat ||
                    // A platform preset auto-maps headers server-side, so
                    // manual mapping is only required without one.
                    (selectedImportFormat === "csv" &&
                      mappedCount === 0 &&
                      !importPlatform)
                  }
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting || importMutation.isPending
                    ? "Importing..."
                    : "Import Data"}
                </button>
              </div>
            </div>
          </div>
        )}

        {(() => {
          const state = String(importStatus?.state ?? "queued");
          const isTerminal = ["completed", "failed", "cancelled"].includes(
            state
          );
          const pct = Math.max(
            0,
            Math.min(
              100,
              Number(
                importStatus?.progress ?? (state === "completed" ? 100 : 0)
              )
            )
          );
          return (
            <Dialog
              open={Boolean(importJobId)}
              onOpenChange={(open) => {
                if (!open && isTerminal) setImportJobId(null);
              }}
            >
              <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => {
                  if (!isTerminal) e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {isTerminal ? (
                      <CheckCircleIcon
                        aria-hidden="true"
                        className={`h-5 w-5 ${
                          state === "completed"
                            ? "text-primary"
                            : "text-amber-500"
                        }`}
                      />
                    ) : (
                      <ArrowPathIcon
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin text-primary"
                      />
                    )}
                    {state === "completed"
                      ? "Import complete"
                      : state === "failed"
                        ? "Import failed"
                        : state === "cancelled"
                          ? "Import cancelled"
                          : "Importing your audience…"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {typeof importStatus?.processedRows === "number"
                      ? `${importStatus.processedRows.toLocaleString()} processed`
                      : "Preparing…"}
                    {typeof importStatus?.createdCount === "number"
                      ? ` · ${importStatus.createdCount.toLocaleString()} created`
                      : ""}
                    {typeof importStatus?.updatedCount === "number"
                      ? ` · ${importStatus.updatedCount.toLocaleString()} updated`
                      : ""}
                    {typeof importStatus?.errorCount === "number" &&
                    importStatus.errorCount > 0
                      ? ` · ${importStatus.errorCount.toLocaleString()} errors`
                      : ""}
                  </p>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  {importStatus && (importStatus.errorCount ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => downloadImportErrorsMutation.mutate()}
                      disabled={downloadImportErrorsMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      Download errors
                    </button>
                  ) : null}
                  {isTerminal ? (
                    <button
                      type="button"
                      onClick={() => setImportJobId(null)}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cancelImportMutation.mutate()}
                      disabled={cancelImportMutation.isPending}
                      className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      Cancel import
                    </button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {importStep === "complete" && importResult && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircleIcon
              className="mb-6 h-16 w-16 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-2xl font-semibold">Import Complete</h2>
            <p className="mt-3 text-(--color-text-muted)">
              Successfully imported {importResult.success.toLocaleString()}{" "}
              profiles
              {importResult.failed > 0 && ` · ${importResult.failed} failed`}
            </p>
            <div className="mt-10 flex gap-3">
              <button
                onClick={resetImport}
                className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-medium hover:bg-(--color-card)"
              >
                Import More
              </button>
              {importJobId && importResult.failed > 0 && (
                <button
                  onClick={() => downloadImportErrorsMutation.mutate()}
                  disabled={downloadImportErrorsMutation.isPending}
                  className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-medium hover:bg-(--color-card) disabled:opacity-50"
                >
                  Download errors
                </button>
              )}
              <Link
                href="/audience"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View Audience
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
