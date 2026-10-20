"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  organizationOptions,
  SECTOR_OTHER_VALUE,
  web2Options,
} from "../../constants";
import { profileReady, type ProjectProfile } from "../../constants/guided";
import { classify } from "../../utils/contract-input";

// The Web3 list drops its own "Other" entry: the picker has a single free-text "Other" at the
// end that covers Web3 and Web2 alike (mirrors the original organization-setup step).
const web3SectorOptions = organizationOptions.filter(
  (o) => o.id !== "other-web3-innovator"
);
const KNOWN_SECTOR_LABELS = new Set([
  ...web3SectorOptions.map((o) => o.label),
  ...web2Options.map((o) => o.label),
]);

/**
 * Step 1 - the project. Name, website and sector qualify the account; the website is what the
 * indexer looks the project up by when no address is given. The contract is optional, and the
 * classifier runs locally to say what we recognised without fetching anything.
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

  const set = (k: keyof ProjectProfile) => (e: { target: { value: string } }) =>
    onChange({ ...value, [k]: e.target.value });

  const guess = classify(value.contract);

  // Enter moves on from any single-line field once the required three are filled: a form with
  // several inputs and no visible submit button would otherwise do nothing on Enter.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && profileReady(value)) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Tell us about your project
      </h1>
      <p className="text-muted-foreground mt-3">
        Name, website and sector are all we need. The rest is optional.
      </p>

      <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ob-name">Project name</Label>
            <Input
              id="ob-name"
              required
              autoComplete="organization"
              value={value.name}
              onChange={set("name")}
              placeholder="Acme"
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
              placeholder="acme.xyz"
              onKeyDown={onKeyDown}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ob-sector">Sector</Label>
            <Select
              value={sectorOther ? SECTOR_OTHER_VALUE : value.sector}
              onValueChange={(v) => {
                if (v === SECTOR_OTHER_VALUE) {
                  setSectorOther(true);
                  onChange({ ...value, sector: "" });
                } else {
                  setSectorOther(false);
                  onChange({ ...value, sector: v });
                }
              }}
            >
              <SelectTrigger id="ob-sector" className="w-full">
                <SelectValue placeholder="Choose a sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Web3</SelectLabel>
                  {web3SectorOptions.map((option) => (
                    <SelectItem key={option.id} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Web2</SelectLabel>
                  {web2Options.map((option) => (
                    <SelectItem key={option.id} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectItem value={SECTOR_OTHER_VALUE}>
                    Other (tell us)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
                Helps us suggest what to track.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ob-contract">
              Contract address{" "}
              <span className="text-muted-foreground font-normal">
                Optional
              </span>
            </Label>
            <Input
              id="ob-contract"
              autoComplete="off"
              spellCheck={false}
              value={value.contract}
              onChange={set("contract")}
              onKeyDown={onKeyDown}
              placeholder="0x…"
              className="font-mono"
              aria-describedby="ob-contract-hint"
            />
            <p className="text-muted-foreground text-xs" id="ob-contract-hint">
              {guess.form === "empty" || guess.form === "unknown" ? (
                "If not, we find it from the website."
              ) : (
                <>
                  <b className="text-foreground">{guess.label}.</b> Indexed
                  first.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-desc">
            What does it do?{" "}
            <span className="text-muted-foreground font-normal">Optional</span>
          </Label>
          <Input
            id="ob-desc"
            value={value.description}
            onChange={set("description")}
            onKeyDown={onKeyDown}
            placeholder="A lending market on Base for long-tail assets"
          />
        </div>
      </form>
    </>
  );
}
