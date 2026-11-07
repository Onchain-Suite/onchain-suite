"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AvailableSmsNumber,
  SmsNumberType,
} from "@/features/integrations/connections.service";
import { connectionsService } from "@/features/integrations/connections.service";
import {
  CONNECTIONS_PREFIX,
  useConnection,
} from "@/features/integrations/hooks/use-connections";

/** Countries offered first. Twilio sells in more; the server checks each one. */
const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "ES", name: "Spain" },
  { code: "PL", name: "Poland" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
];

const TYPES: ReadonlyArray<{ value: SmsNumberType; label: string }> = [
  { value: "local", label: "Local" },
  { value: "mobile", label: "Mobile" },
  { value: "tollfree", label: "Toll-free" },
];

/** Area codes exist for North American numbers; elsewhere the field is noise. */
const hasAreaCode = (country: string) => country === "US" || country === "CA";

export const smsManagedKey = (orgId: string | null) =>
  [...CONNECTIONS_PREFIX, "sms", "managed", orgId] as const;

/**
 * "No Twilio account? We'll set one up." Shown only before SMS is connected, and
 * only when this server can do it. Picking a number creates the workspace's own
 * Twilio account, buys the number and connects it, replies webhook included.
 */
export function SmsManagedSetup() {
  const { organizationId, canManage, connection } = useConnection("sms");
  const [open, setOpen] = useState(false);

  const status = useQuery({
    queryKey: smsManagedKey(organizationId),
    enabled: canManage && Boolean(organizationId),
    retry: false,
    staleTime: 60_000,
    queryFn: () =>
      connectionsService.smsManagedStatus(organizationId ?? undefined),
  });

  // A server without the route (404) or without our account reads as "off".
  if (!status.data?.enabled || status.data.connected || connection) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          No Twilio account?
        </h3>
        <p className="text-xs text-muted-foreground">
          Pick a number and we&apos;ll create the account, buy the number and
          connect it for you. Replies and STOP are wired up automatically.
        </p>
      </div>
      <Button size="sm" onClick={() => setOpen(true)}>
        Get a number
      </Button>
      <SmsNumberDialog
        open={open}
        onOpenChange={setOpen}
        organizationId={organizationId}
      />
    </div>
  );
}

function SmsNumberDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}) {
  const qc = useQueryClient();
  const [country, setCountry] = useState("US");
  const [type, setType] = useState<SmsNumberType>("local");
  const [areaCode, setAreaCode] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: () =>
      connectionsService.smsManagedNumbers(
        {
          country,
          type,
          ...(hasAreaCode(country) && areaCode.trim()
            ? { areaCode: areaCode.trim() }
            : {}),
        },
        organizationId ?? undefined
      ),
    onMutate: () => setPicked(null),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't search numbers."),
  });

  const setUp = useMutation({
    mutationFn: (phoneNumber: string) =>
      connectionsService.smsManagedSetUp(
        phoneNumber,
        organizationId ?? undefined
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: CONNECTIONS_PREFIX }).catch(
        () => undefined
      );
      toast.success(
        result.reused
          ? `Reconnected your number ${result.phoneNumber}`
          : `${result.phoneNumber} is ready to send`
      );
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't set up SMS."),
  });

  // The search answer belongs to the filters it was made with; changing a
  // filter hides it rather than letting an old list be bought from.
  const resetResults = () => {
    search.reset();
    setPicked(null);
  };

  const numbers: AvailableSmsNumber[] = search.data ?? [];
  const busy = setUp.isPending;

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Get an SMS number</DialogTitle>
          <DialogDescription>
            Choose where your contacts are. A number in their country delivers
            best and costs them nothing extra to reply to.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sms-country">Country</Label>
            <Select
              value={country}
              onValueChange={(v) => {
                setCountry(v);
                resetResults();
              }}
            >
              <SelectTrigger id="sms-country" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sms-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as SmsNumberType);
                resetResults();
              }}
            >
              <SelectTrigger id="sms-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasAreaCode(country) ? (
            <div className="space-y-1.5">
              <Label htmlFor="sms-area">Area code</Label>
              <Input
                id="sms-area"
                inputMode="numeric"
                placeholder="Any"
                maxLength={5}
                value={areaCode}
                onChange={(e) => {
                  setAreaCode(e.target.value.replace(/\D/g, ""));
                  resetResults();
                }}
                className="h-9"
              />
            </div>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={search.isPending || busy}
          onClick={() => search.mutate()}
        >
          {search.isPending ? "Searching..." : "Search numbers"}
        </Button>

        {search.isSuccess && numbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No numbers of that type are available there. Try another type or
            area code.
          </p>
        ) : null}

        {numbers.length > 0 ? (
          <ul
            role="radiogroup"
            aria-label="Available numbers"
            className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border"
          >
            {numbers.map((n) => {
              const selected = picked === n.phoneNumber;
              const place = [n.locality, n.region].filter(Boolean).join(", ");
              return (
                <li key={n.phoneNumber}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPicked(n.phoneNumber)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium tabular-nums text-foreground">
                      {n.friendlyName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {place || n.isoCountry}
                      {n.mms ? " · MMS" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {country === "US" || country === "CA" ? (
          <p className="text-xs text-muted-foreground">
            US carriers block marketing texts from unregistered numbers. Before
            texting US phones, the number needs A2P 10DLC registration (local)
            or toll-free verification.
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!picked || busy}
            onClick={() => picked && setUp.mutate(picked)}
          >
            {busy ? "Setting up..." : picked ? `Get ${picked}` : "Get number"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
