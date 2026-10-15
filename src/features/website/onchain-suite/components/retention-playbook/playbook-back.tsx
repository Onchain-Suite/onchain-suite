import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { UI } from "@/onchain-suite-website/data/retention-playbook";
import { landingPath } from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * Top of a playbook page: back to the landing page, where the other two
 * playbooks are, and the "Prepared for" label a sent link carries.
 */
export function PlaybookBack({ client }: { client: string | null }) {
  return (
    <div className="rp-back">
      <Link href={landingPath(client)} className="rp-back-link">
        <ArrowLeftIcon className="rp-icon-sm" aria-hidden="true" />
        {UI.allPlaybooks}
      </Link>
      {client && (
        <p className="pill rp-back-client">
          {UI.preparedFor} {client}
        </p>
      )}
    </div>
  );
}
