"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  InformationCircleIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export type BuilderTab = "builder" | "stats";

interface BuilderBarProps {
  name: string;
  status: string;
  isNew: boolean;
  tab: BuilderTab;
  /** Steps still to finish before it can go live; 0 when ready. */
  todo: number;
  issuesOpen: boolean;
  hasSteps: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  checking: boolean;
  saving: boolean;
  publishing: boolean;
  toggling: boolean;
  onName: (name: string) => void;
  onNameCommit: () => void;
  onTab: (tab: BuilderTab) => void;
  onToggleIssues: () => void;
  onCheck: () => void;
  onSave: () => void;
  onPublish: () => void;
  onPause: () => void;
  onTurnOn: () => void;
}

const BADGE: Record<string, { cls: string; text: string }> = {
  active: { cls: "ab-badge--live", text: "Live" },
  paused: { cls: "ab-badge--paused", text: "Paused" },
};

/**
 * The builder's one-row bar, as in the reference Loop builder: back, the name
 * (edited in place), where it stands, then the view tabs and the actions.
 * Edits save themselves, so "Save draft" only appears before the first save.
 */
export function BuilderBar(p: BuilderBarProps) {
  const badge = BADGE[p.status] ?? { cls: "ab-badge--draft", text: "Draft" };
  const live = p.status === "active";
  return (
    <div className="ab-bar">
      <Link href="/automations" className="ab-back">
        <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
        Automations
      </Link>
      <span className="ab-sep" />
      <input
        className="ab-name"
        value={p.name}
        aria-label="Automation name"
        placeholder="Untitled automation"
        title={p.name}
        style={{ width: `${Math.min(34, Math.max(12, p.name.length + 2))}ch` }}
        onChange={(e) => p.onName(e.target.value)}
        onBlur={p.onNameCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <span className={`ab-badge ${badge.cls}`}>{badge.text}</span>
      {!p.isNew && p.saveState !== "idle" && (
        <span className="ab-saved">
          {p.saveState === "saving" ? (
            "Saving…"
          ) : p.saveState === "error" ? (
            "Not saved"
          ) : (
            <>
              <CheckIcon aria-hidden="true" className="h-3 w-3" />
              Saved
            </>
          )}
        </span>
      )}
      <span className="ab-spacer" />
      <div className="ab-tabs" role="tablist" aria-label="View">
        <button
          type="button"
          role="tab"
          aria-selected={p.tab === "builder"}
          onClick={() => p.onTab("builder")}
        >
          Builder
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={p.tab === "stats"}
          onClick={() => p.onTab("stats")}
        >
          Stats
        </button>
      </div>
      {p.hasSteps && !p.isNew && (
        <Button
          variant="outline"
          size="sm"
          onClick={p.onCheck}
          disabled={p.checking}
        >
          <ShieldCheckIcon
            aria-hidden="true"
            className={p.checking ? "animate-pulse" : ""}
          />
          {p.checking ? "Checking…" : "Check flow"}
        </Button>
      )}
      {p.todo > 0 ? (
        <button
          type="button"
          className="ab-todos"
          aria-expanded={p.issuesOpen}
          onClick={p.onToggleIssues}
        >
          <InformationCircleIcon aria-hidden="true" className="h-3.5 w-3.5" />
          {p.todo} to finish
        </button>
      ) : p.hasSteps ? (
        <span className="ab-ready">
          <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Ready
        </span>
      ) : null}
      {p.isNew && (
        <Button
          variant="outline"
          size="sm"
          onClick={p.onSave}
          disabled={p.saving}
        >
          {p.saving && (
            <ArrowPathIcon aria-hidden="true" className="animate-spin" />
          )}
          Save draft
        </Button>
      )}
      {!p.isNew &&
        (live ? (
          <Button
            variant="outline"
            size="sm"
            onClick={p.onPause}
            disabled={p.toggling}
          >
            <PauseIcon aria-hidden="true" />
            Pause
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={p.onTurnOn}
            disabled={p.toggling}
          >
            <PlayIcon aria-hidden="true" />
            Turn on
          </Button>
        ))}
      <Button
        size="sm"
        onClick={p.onPublish}
        disabled={p.saving || p.publishing}
        title="Save and make these changes live. The running automation only follows the published version."
      >
        {(p.saving || p.publishing) && (
          <ArrowPathIcon aria-hidden="true" className="animate-spin" />
        )}
        Publish
      </Button>
    </div>
  );
}
