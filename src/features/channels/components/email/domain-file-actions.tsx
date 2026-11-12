"use client";

import { Copy01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { buildDnsCsv, dnsCsvFilename } from "../../utils/dns-records-csv";
import { recordName, recordValue, zoneFile } from "../../utils/dns-view";
import type { DnsRecordRow } from "../../utils/domain-dns";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";

function saveText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Every record at once. Most DNS providers can import a zone file, which turns
 * six pastes into one upload, so that is offered first; the CSV is for sending
 * to whoever manages the DNS.
 */
export function DomainFileActions({
  domain,
  records,
  orgName,
}: {
  domain: string;
  records: DnsRecordRow[];
  /** Leads the exported CSV's filename. */
  orgName?: string;
}) {
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(zoneFile(domain, records));
      toast.success(
        `All ${String(records.length)} records copied as a zone file`
      );
    } catch {
      toast.error("Copy failed. Use Download instead.");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={copyAll}>
        <Icon icon={Copy01Icon} className="size-3.5" />
        Copy all
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          saveText(
            `${domain}.zone.txt`,
            zoneFile(domain, records),
            "text/plain;charset=utf-8;"
          );
          toast.success(
            "Zone file downloaded. Import it at your DNS provider."
          );
        }}
      >
        <Icon icon={Download01Icon} className="size-3.5" />
        Download zone file
      </Button>
      <Button
        variant="outline"
        size="sm"
        title="A spreadsheet of the records, to send to whoever manages your DNS"
        onClick={() =>
          saveText(
            dnsCsvFilename(orgName, domain),
            buildDnsCsv(
              records.map((r) => ({
                type: r.type,
                name: recordName(r, domain),
                value: recordValue(r),
              }))
            ),
            "text/csv;charset=utf-8;"
          )
        }
      >
        Export CSV
      </Button>
    </>
  );
}
