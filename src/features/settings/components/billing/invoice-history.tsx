import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { isJsonObject } from "@/lib/utils";

import { fadeInUp, staggerContainer } from "../../utils";
import { billingService } from "@/features/billing/billing.service";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const InvoiceHistory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const invoicesQuery = useQuery({
    queryKey: ["billing", "invoices", { page: 1, limit: 10 }],
    queryFn: () => billingService.listInvoices({ page: 1, limit: 10 }),
    enabled: isOpen,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const invoicesData: unknown = invoicesQuery.data;
  const itemsRaw = Array.isArray(invoicesData)
    ? invoicesData
    : isJsonObject(invoicesData)
      ? Array.isArray(invoicesData.items)
        ? invoicesData.items
        : Array.isArray(invoicesData.data)
          ? invoicesData.data
          : undefined
      : undefined;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const [latestInvoice] = items;

  const formatMoney = (inv: unknown) => {
    const obj = isJsonObject(inv) ? inv : {};
    const { amount } = obj;
    const currency =
      typeof obj.currency === "string" ? obj.currency.toUpperCase() : "";
    if (typeof amount === "number")
      return `${currency} ${amount.toFixed(2)}`.trim();
    if (typeof amount === "string") return `${currency} ${amount}`.trim();
    return "-";
  };

  const formatDate = (inv: unknown) => {
    const obj = isJsonObject(inv) ? inv : {};
    const v = obj.issuedAt ?? obj.createdAt ?? obj.date;
    if (!v) return "-";
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  };

  const onDownload = async (invoiceId: string) => {
    try {
      const res = await billingService.getInvoiceDownloadUrl(invoiceId);
      const url =
        isJsonObject(res) && typeof res.url === "string"
          ? res.url
          : isJsonObject(res) && typeof res.downloadUrl === "string"
            ? res.downloadUrl
            : null;
      if (!url) {
        toast.error("No download link available for this invoice.");
        return;
      }
      window.open(String(url), "_blank", "noopener,noreferrer");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to download invoice";
      toast.error(message);
    }
  };

  return (
    <motion.section
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <SettingsSectionCard
        title="Invoices"
        description="View and download your billing history."
        icon={<DocumentTextIcon className="h-5 w-5" aria-hidden="true" />}
        badge={`${items.length} invoice${items.length === 1 ? "" : "s"} available`}
        onOpenChange={setIsOpen}
        collapsedPreview={
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Latest invoice
              </p>
              <p className="mt-1 text-sm text-foreground">
                {isOpen
                  ? items.length > 0
                    ? formatDate(latestInvoice)
                    : "No invoices yet"
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Latest amount
              </p>
              <p className="mt-1 text-sm text-foreground">
                {isOpen
                  ? items.length > 0
                    ? formatMoney(latestInvoice)
                    : "-"
                  : "-"}
              </p>
            </div>
          </div>
        }
      >
        <motion.div variants={fadeInUp}>
          {!isOpen ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Expand this section to load live invoices.
            </div>
          ) : invoicesQuery.isLoading ? (
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-4 gap-4 border-b border-border/40 bg-muted/50 px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 justify-self-end" />
                </div>
                {["a", "b", "c"].map((key) => (
                  <div
                    key={key}
                    className="grid grid-cols-4 items-center gap-4 border-b border-border/40 px-6 py-4 last:border-0"
                  >
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-8 justify-self-end rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ) : invoicesQuery.isError ? (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load invoices.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              No invoices yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-4 gap-4 border-b border-border/40 bg-muted/50 px-6 py-4 text-sm font-medium text-muted-foreground">
                  <div>Invoice</div>
                  <div>Date</div>
                  <div>Amount</div>
                  <div className="text-right">Download</div>
                </div>
                {items.map((invoice, idx: number) => (
                  <motion.div
                    key={String(
                      (isJsonObject(invoice) ? invoice.id : undefined) ?? idx
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="grid grid-cols-4 items-center gap-4 border-b border-border/40 px-6 py-4 last:border-0 hover:bg-muted/50"
                  >
                    <div className="font-medium text-foreground">
                      {(() => {
                        const obj = isJsonObject(invoice) ? invoice : undefined;
                        const number = obj?.number;
                        if (typeof number === "string" && number.length > 0) {
                          return number;
                        }
                        const id = obj?.id;
                        if (typeof id === "string" && id.length > 0) {
                          return id;
                        }
                        return "-";
                      })()}
                    </div>
                    <div className="text-muted-foreground">
                      {formatDate(invoice)}
                    </div>
                    <div className="text-foreground">
                      {formatMoney(invoice)}
                    </div>
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/50 hover:bg-primary/10 hover:text-primary"
                        onClick={() =>
                          onDownload(
                            String(isJsonObject(invoice) ? invoice.id : "")
                          )
                        }
                      >
                        <ArrowDownTrayIcon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </SettingsSectionCard>
    </motion.section>
  );
};

export default InvoiceHistory;
