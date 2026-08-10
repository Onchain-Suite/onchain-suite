"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import { ContractAddressList } from "@/features/settings/components/account/contract-address-list";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import {
  type ProjectSettingsFormData,
  projectSettingsService,
  type SupportedChain,
} from "@/features/settings/project-settings.service";

const contractEntrySchema = z.object({
  chain: z.string().min(1, "Chain is required"),
  address: z.string().min(1, "Address is required"),
  label: z.string().optional().or(z.literal("")),
});

const walletEntrySchema = z.object({
  address: z.string().min(1, "Wallet address is required"),
  label: z.string().optional().or(z.literal("")),
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Must be a valid E.164 phone number (e.g., +1234567890)"
    )
    .optional()
    .or(z.literal("")),
  taxId: z
    .string()
    .regex(
      /^[A-Z0-9-]{5,20}$/,
      "Invalid Tax ID format (alphanumeric & hyphens, 5-20 chars)"
    )
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .min(1, "Address is required")
    .optional()
    .or(z.literal("")),
  timezone: z.string().optional(),
  tokenTicker: z
    .string()
    .max(16, "Token ticker is too long")
    .optional()
    .or(z.literal("")),
  primaryChains: z.array(z.string()).optional(),
  contractAddresses: z.array(contractEntrySchema).optional(),
  treasuryWallets: z.array(walletEntrySchema).optional(),
  teamWallets: z.array(walletEntrySchema).optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const toProjectSettingsFormData = (
  values: Partial<CompanyFormValues> | ProjectSettingsFormData
): ProjectSettingsFormData => ({
  name: values.name ?? "",
  email: values.email ?? "",
  phone: values.phone ?? "",
  taxId: values.taxId ?? "",
  address: values.address ?? "",
  timezone: values.timezone ?? "UTC",
  tokenTicker: values.tokenTicker ?? "",
  primaryChains: values.primaryChains ?? [],
  contractAddresses: (values.contractAddresses ?? []).map((row) => ({
    chain: row.chain ?? "",
    address: row.address,
    label: row.label ?? "",
  })),
  treasuryWallets: (values.treasuryWallets ?? []).map((row) => ({
    address: row.address,
    label: row.label ?? "",
  })),
  teamWallets: (values.teamWallets ?? []).map((row) => ({
    address: row.address,
    label: row.label ?? "",
  })),
});

export default function CompanyEditForm() {
  const { data: session } = authClient.useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectSettingsFormData | null>(null);
  const [chainToAdd, setChainToAdd] = useState<string>("");
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      taxId: "",
      address: "",
      timezone: "UTC",
      tokenTicker: "",
      primaryChains: [],
      contractAddresses: [],
      treasuryWallets: [],
      teamWallets: [],
    },
  });

  const {
    fields: contractFields,
    append: appendContract,
    remove: removeContract,
  } = useFieldArray({
    control: form.control,
    name: "contractAddresses",
  });

  const mainnetChains = useMemo(
    () => supportedChains.filter((c) => !c.testnet),
    [supportedChains]
  );
  const testnetChains = useMemo(
    () => supportedChains.filter((c) => c.testnet),
    [supportedChains]
  );
  // slug (or alias) → human label, for chips and the read-only list.
  const chainLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of supportedChains) {
      map.set(c.slug, c.label);
      for (const alias of c.aliases ?? []) map.set(alias, c.label);
    }
    return (slug: string) => map.get(slug) ?? slug;
  }, [supportedChains]);
  // set of every accepted chain identifier, to drop stale/unsupported values.
  const supportedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const c of supportedChains) {
      set.add(c.slug);
      for (const alias of c.aliases ?? []) set.add(alias);
    }
    return set;
  }, [supportedChains]);

  const primaryChains = useWatch({
    control: form.control,
    name: "primaryChains",
  });
  const primaryChainsLabel = useMemo(() => {
    const list = Array.isArray(primaryChains) ? primaryChains : [];
    if (list.length === 0) return "";
    return list.map((s) => chainLabel(s)).join(", ");
  }, [primaryChains, chainLabel]);

  const organizationId = useMemo(() => {
    const selected = selectedOrgId?.trim();
    if (selected) return selected;
    const active = session?.session?.activeOrganizationId;
    return typeof active === "string" && active.trim().length > 0
      ? active.trim()
      : null;
  }, [selectedOrgId, session?.session?.activeOrganizationId]);

  useEffect(() => {
    const syncSelectedOrgId = () => {
      setSelectedOrgId(getSelectedOrganizationId());
    };

    syncSelectedOrgId();
    window.addEventListener("onchain:org-changed", syncSelectedOrgId);
    return () =>
      window.removeEventListener("onchain:org-changed", syncSelectedOrgId);
  }, []);

  useEffect(() => {
    async function fetchOrg() {
      if (!organizationId) {
        setLoading(false);
        return;
      }
      try {
        const initialData = toProjectSettingsFormData(
          await projectSettingsService.getProjectSettings(organizationId)
        );
        setData(initialData);
        form.reset(initialData);
      } catch (error) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 400 && !organizationId) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load project settings";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, [form, organizationId]);

  // Supported chains drive the chain pickers (single source of truth) so the
  // PUT never returns UNSUPPORTED_CHAINS.
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    projectSettingsService
      .getSupportedChains(organizationId)
      .then((chains) => {
        if (cancelled) return;
        setSupportedChains(chains);
        setChainToAdd((cur) =>
          cur
            ? cur
            : (chains.find((c) => !c.testnet)?.slug ?? chains[0]?.slug ?? "")
        );
      })
      .catch(() => {
        /* non-fatal: pickers just stay empty until reachable */
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const onSubmit = async (values: CompanyFormValues) => {
    if (!organizationId) {
      toast.error("No active organization selected");
      return;
    }
    const previousData = data;
    const nextValues = toProjectSettingsFormData(values);
    // Drop any stale/unsupported chains so the backend never rejects with
    // UNSUPPORTED_CHAINS (only filter once the registry has loaded).
    if (supportedKeys.size > 0) {
      nextValues.primaryChains = nextValues.primaryChains.filter((s) =>
        supportedKeys.has(s)
      );
      nextValues.contractAddresses = nextValues.contractAddresses.filter(
        (row) => !row.chain || supportedKeys.has(row.chain)
      );
    }
    // Optimistic update
    setData(nextValues);
    setIsEditing(false);

    try {
      const saved = await projectSettingsService.saveProjectSettings(
        nextValues,
        organizationId
      );
      const normalizedSaved = toProjectSettingsFormData(saved);
      setData(normalizedSaved);
      form.reset(normalizedSaved);
      toast.success("Project settings updated successfully");
    } catch (error) {
      setData(previousData);
      form.reset(previousData ?? undefined);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update project settings";
      toast.error(message);
      setIsEditing(true); // Re-open edit mode on failure
    }
  };

  if (loading) return <Skeleton className="h-75 w-full rounded-xl" />;

  return (
    <SettingsSectionCard
      title="Project settings"
      description="Manage protocol identity, chains, and contract addresses."
      badge={data?.name ? `Protocol: ${data.name}` : "No project name set"}
      defaultOpen
      className="bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80"
    >
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form
            key="edit-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Protocol Name <span className="text-red-500">*</span>
                </Label>
                <Input {...form.register("name")} placeholder="Acme Inc." />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Billing Email</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  placeholder="billing@acme.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Token Ticker</Label>
                <Input
                  {...form.register("tokenTicker")}
                  placeholder="$SUITE"
                  autoCapitalize="characters"
                />
                {form.formState.errors.tokenTicker && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.tokenTicker.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Primary Chains</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={chainToAdd} onValueChange={setChainToAdd}>
                    <SelectTrigger className="sm:w-56">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainnetChains.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>Mainnet</SelectLabel>
                          {mainnetChains.map((chain) => (
                            <SelectItem key={chain.slug} value={chain.slug}>
                              {chain.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {testnetChains.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>Testnet</SelectLabel>
                          {testnetChains.map((chain) => (
                            <SelectItem key={chain.slug} value={chain.slug}>
                              {chain.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const current = form.getValues("primaryChains") ?? [];
                      if (!current.includes(chainToAdd)) {
                        form.setValue(
                          "primaryChains",
                          [...current, chainToAdd],
                          {
                            shouldDirty: true,
                          }
                        );
                      }
                    }}
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    Add chain
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.getValues("primaryChains") ?? []).map((chain) => (
                    <span
                      key={chain}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {chainLabel(chain)}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const current = form.getValues("primaryChains") ?? [];
                          form.setValue(
                            "primaryChains",
                            current.filter((c) => c !== chain),
                            { shouldDirty: true }
                          );
                        }}
                        aria-label={`Remove ${chain}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(form.getValues("primaryChains") ?? []).length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Select one or more chains
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tax ID / VAT Number</Label>
                <Input {...form.register("taxId")} placeholder="US-123456789" />
                {form.formState.errors.taxId && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.taxId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input
                  {...form.register("address")}
                  placeholder="123 Market St, San Francisco, CA 94103"
                />
                {form.formState.errors.address && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Contract addresses
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Indexed into the on-chain intelligence pipeline.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    appendContract({
                      chain: mainnetChains[0]?.slug ?? chainToAdd ?? "",
                      address: "",
                      label: "",
                    })
                  }
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  Add contract
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {contractFields.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No contracts added
                  </div>
                ) : (
                  contractFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-3 md:grid-cols-12"
                    >
                      <div className="md:col-span-3">
                        <Label className="sr-only">Chain</Label>
                        <Select
                          onValueChange={(val) =>
                            form.setValue(
                              `contractAddresses.${idx}.chain`,
                              val,
                              { shouldDirty: true }
                            )
                          }
                          defaultValue={form.getValues(
                            `contractAddresses.${idx}.chain`
                          )}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Network" />
                          </SelectTrigger>
                          <SelectContent>
                            {mainnetChains.length > 0 ? (
                              <SelectGroup>
                                <SelectLabel>Mainnet</SelectLabel>
                                {mainnetChains.map((net) => (
                                  <SelectItem key={net.slug} value={net.slug}>
                                    {net.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ) : null}
                            {testnetChains.length > 0 ? (
                              <SelectGroup>
                                <SelectLabel>Testnet</SelectLabel>
                                {testnetChains.map((net) => (
                                  <SelectItem key={net.slug} value={net.slug}>
                                    {net.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ) : null}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-5">
                        <Label className="sr-only">Address</Label>
                        <Input
                          {...form.register(`contractAddresses.${idx}.address`)}
                          placeholder="0x… or base58…"
                          className="h-11"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="sr-only">Label</Label>
                        <Input
                          {...form.register(`contractAddresses.${idx}.label`)}
                          placeholder="Main Token"
                          className="h-11"
                        />
                      </div>
                      <div className="flex items-center justify-end md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContract(idx)}
                          aria-label="Remove contract"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  form.reset(data ?? undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <ArrowPathIcon
                    className="h-4 w-4 animate-spin mr-2"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="view-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Project / Protocol Name
                </p>
                <p className="text-base font-medium">{data?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Token Ticker
                </p>
                <p className="text-base">
                  {(() => {
                    const v = data?.tokenTicker;
                    if (isNonEmptyString(v)) return v;
                    return (
                      <span className="text-muted-foreground/50 italic">-</span>
                    );
                  })()}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Primary Chains
                </p>
                <p className="text-base">
                  {primaryChainsLabel.length > 0 ? (
                    primaryChainsLabel
                  ) : (
                    <span className="text-muted-foreground/50 italic">-</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Billing Email
                </p>
                <p className="text-base">
                  {(() => {
                    const email = data?.email;
                    if (isNonEmptyString(email)) return email;
                    return (
                      <span className="text-muted-foreground/50 italic">-</span>
                    );
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tax ID
                </p>
                <p className="font-mono bg-muted/50 px-2 py-0.5 rounded text-sm w-fit">
                  {(() => {
                    const taxId = data?.taxId;
                    if (isNonEmptyString(taxId)) return taxId;
                    return "-";
                  })()}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Address
                </p>
                <p className="text-base">
                  {(() => {
                    const address = data?.address;
                    if (isNonEmptyString(address)) return address;
                    return (
                      <span className="text-muted-foreground/50 italic">-</span>
                    );
                  })()}
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Contract addresses
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {data?.contractAddresses?.length ?? 0} in the pipeline
                  </span>
                </div>
                <ContractAddressList
                  contracts={data?.contractAddresses ?? []}
                  chains={supportedChains}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsSectionCard>
  );
}
