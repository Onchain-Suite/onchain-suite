"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { profileReady, type ProjectProfile } from "../../constants/guided";
import { DEFAULT_CHAIN } from "../../data/chains";
import { useSupportedChains } from "../../hooks/use-supported-chains";
import { classify } from "../../utils/contract-input";
import {
  KNOWN_SECTOR_LABELS,
  sectorGroupOf,
  shortSectorLabel,
  WEB2_SECTOR_OPTIONS,
  WEB3_SECTOR_OPTIONS,
} from "../../utils/sector";
import { ObSelect } from "./ob-select";

type SectorTab = "web3" | "web2";

const chipClass = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs transition-colors ${
    on
      ? "border-primary bg-primary/10 text-primary font-medium"
      : "border-border text-foreground hover:border-primary/40 hover:bg-muted/50"
  }`;

/**
 * Step 1 - the project. Name, website and sector qualify the account; the website is what the
 * indexer looks the project up by when no address is given. Sector is a Web3 / Web2 tag picker so
 * the options are visible at a glance. The contract is optional, and the classifier runs locally
 * to say what we recognised without fetching anything.
 */
export function StepProject({
  value,
  onChange,
  onEnter,
}: {
  value: ProjectProfile;
  onChange: (p: ProjectProfile) => void;
  onEnter: () => void;
}) {
  const [sectorOther, setSectorOther] = useState<boolean>(
    Boolean(value.sector) && !KNOWN_SECTOR_LABELS.has(value.sector)
  );
  // Which tag group is on screen. Start on the side the saved sector belongs to.
  const [group, setGroup] = useState<SectorTab>(
    sectorGroupOf(value.sector) === "web2" ? "web2" : "web3"
  );
  const supportedChains = useSupportedChains();

  const set = (k: keyof ProjectProfile) => (e: { target: { value: string } }) =>
    onChange({ ...value, [k]: e.target.value });

  const guess = classify(value.contract);
  const options = group === "web3" ? WEB3_SECTOR_OPTIONS : WEB2_SECTOR_OPTIONS;

  // Enter moves on from any single-line field once the required three are filled: a form with
  // several inputs and no visible submit button would otherwise do nothing on Enter.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && profileReady(value)) {
      e.preventDefault();
      onEnter();
    }
  };

  const pickSector = (label: string) => {
    setSectorOther(false);
    onChange({ ...value, sector: label });
  };

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Tell us about your project
      </h1>
      <p className="text-muted-foreground mt-3">
        Name, website and sector are all we need. The rest is optional.
      </p>

      <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ob-name">Project name</Label>
            <Input
              id="ob-name"
              required
              autoComplete="organization"
              value={value.name}
              onChange={set("name")}
              placeholder="Your project"
              onKeyDown={onKeyDown}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-web">Website</Label>
            <Input
              id="ob-web"
              required
              inputMode="url"
              autoComplete="url"
              value={value.website}
              onChange={set("website")}
              placeholder="yourproject.xyz"
              onKeyDown={onKeyDown}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Sector</Label>
            {/* Web3 / Web2 as tags, so the options are easy to see and switch between. */}
            <div
              className="bg-muted inline-flex rounded-lg p-0.5"
              role="tablist"
              aria-label="Sector type"
            >
              {(["web3", "web2"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={group === g}
                  onClick={() => {
                    setGroup(g);
                    // Web2 projects have no contract to index, so drop any stray value.
                    if (g === "web2" && value.contract) {
                      onChange({ ...value, contract: "" });
                    }
                  }}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    group === g
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "web3" ? "Web3" : "Web2"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={!sectorOther && value.sector === o.label}
                onClick={() => pickSector(o.label)}
                className={chipClass(!sectorOther && value.sector === o.label)}
              >
                {shortSectorLabel(o)}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={sectorOther}
              onClick={() => {
                setSectorOther(true);
                onChange({ ...value, sector: "" });
              }}
              className={chipClass(sectorOther)}
            >
              Other
            </button>
          </div>

          {sectorOther ? (
            <Input
              autoFocus
              value={value.sector}
              onChange={set("sector")}
              onKeyDown={onKeyDown}
              placeholder="Which sector are you in?"
              aria-label="Your sector"
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              Helps us suggest the contracts and events to track.
            </p>
          )}
        </div>

        {/* Contract + its chain, Web3 only (a Web2 project has none). The chain is chosen right on
            the address, and both go to the backend so it indexes and looks onchain for contracts. */}
        {group !== "web2" ? (
          <div className="space-y-2">
            <Label htmlFor="ob-contract">
              Contract address{" "}
              <span className="text-muted-foreground font-normal">
                Optional
              </span>
            </Label>
            <div className="flex items-start gap-2">
              <ObSelect
                aria-label="Chain"
                value={value.chains[0] ?? DEFAULT_CHAIN}
                onChange={(v) => onChange({ ...value, chains: [v] })}
                options={supportedChains.map((chain) => ({
                  value: chain.key,
                  label: chain.label,
                  logo: chain.logo,
                }))}
              />
              <Input
                id="ob-contract"
                autoComplete="off"
                spellCheck={false}
                value={value.contract}
                onChange={set("contract")}
                onKeyDown={onKeyDown}
                placeholder="0x…"
                className="flex-1 font-mono"
                aria-describedby="ob-contract-hint"
              />
            </div>
            <p className="text-muted-foreground text-xs" id="ob-contract-hint">
              {guess.form === "empty" || guess.form === "unknown" ? (
                "If not, we find it from the website on the chain you pick."
              ) : (
                <>
                  <b className="text-foreground">{guess.label}.</b> Indexed
                  first.
                </>
              )}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="ob-desc">
            What does it do?{" "}
            <span className="text-muted-foreground font-normal">Optional</span>
          </Label>
          <Textarea
            id="ob-desc"
            rows={3}
            value={value.description}
            onChange={set("description")}
            placeholder="A lending market on Base for long-tail assets"
          />
        </div>
      </form>
    </>
  );
}
