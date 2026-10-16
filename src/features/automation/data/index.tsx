import {
  ArrowsRightLeftIcon,
  BellAlertIcon,
  BoltIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  CircleStackIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  LinkIcon,
  QueueListIcon,
  RocketLaunchIcon,
  TagIcon,
  UserMinusIcon,
  UserPlusIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import React from "react";

import { LIBRARY_EMAIL_TEMPLATES } from "@/features/templates/library-templates";

// The automation Send-email action reuses the production Email Library
// templates so its fallback options match what users see in the email section
// (full branded HTML bodies + onchain merge variables), not throwaway stubs.
export const emailTemplates = LIBRARY_EMAIL_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  subject: template.subject,
  category: template.category,
  previewText: template.previewText,
  body: template.html,
}));

// Last-resort fallback for the trigger contract picker - used only when both
// `GET /automations/builder/project-contracts` and the org's project settings
// return no contracts.
export const mockContracts = [
  {
    address: "0x8d35...12cf8",
    name: "Pudgy Penguins",
    chain: "Ethereum",
    users: 714,
  },
  { address: "0x49cf...A28B", name: "Clone X", chain: "Ethereum", users: 342 },
  { address: "0x3Bf2...5e9D", name: "Base Bridge", chain: "Base", users: 1247 },
];

// Fallback event list - used only when the on-chain event catalog
// (`GET /automations/builder/onchain/catalog`) is unavailable.
export const eventTypes = [
  "Transfer",
  "Mint",
  "Bridge",
  "Swap",
  "Approval",
  "Stake",
];

// Icons intentionally carry size only (no text color) so they inherit the
// section/menu accent they're rendered in (currentColor). See CLAUDE.md §5.
const catalogIcon = (Icon: typeof BoltIcon) => (
  <Icon aria-hidden="true" className="h-5 w-5" />
);

// Static fallback trigger catalog - mirrors the shape the backend
// `GET /automations/builder/triggers` returns, so the left palette shows a
// full 6 on-chain / 9 off-chain split even before (or without) that call.
export const triggerNodes = [
  // On-chain (6) - fire from wallet activity, get a contract/event config.
  {
    type: "onchain_event",
    label: "On-chain event",
    description: "Any contract interaction you choose",
    icon: catalogIcon(BoltIcon),
  },
  {
    type: "holder_acquired",
    label: "Token acquired",
    description: "A wallet acquires your token or NFT",
    icon: catalogIcon(WalletIcon),
  },
  {
    type: "swap_completed",
    label: "Swap completed",
    description: "A wallet swaps on a supported DEX",
    icon: catalogIcon(ArrowsRightLeftIcon),
  },
  {
    type: "liquidity_added",
    label: "Liquidity added",
    description: "A wallet provides liquidity to a pool",
    icon: catalogIcon(CircleStackIcon),
  },
  {
    type: "governance_activity",
    label: "Governance activity",
    description: "A wallet votes or creates a proposal",
    icon: catalogIcon(BuildingLibraryIcon),
  },
  {
    type: "liquidation_detected",
    label: "Liquidation risk",
    description: "A position approaches liquidation",
    icon: catalogIcon(ExclamationTriangleIcon),
  },
  // Off-chain (9) - fire from CRM / engagement events, no contract needed.
  {
    type: "segment_entered",
    label: "Entered segment",
    description: "A wallet joins a segment",
    icon: catalogIcon(UserPlusIcon),
  },
  {
    type: "segment_exited",
    label: "Left segment",
    description: "A wallet leaves a segment",
    icon: catalogIcon(UserMinusIcon),
  },
  {
    type: "list_joined",
    label: "Joined list",
    description: "A contact is added to a list",
    icon: catalogIcon(QueueListIcon),
  },
  {
    type: "form_submitted",
    label: "Submitted form",
    description: "A wallet completes a hosted form",
    icon: catalogIcon(DocumentTextIcon),
  },
  {
    type: "email_opened",
    label: "Opened email",
    description: "A contact opens one of your emails",
    icon: catalogIcon(EnvelopeOpenIcon),
  },
  {
    type: "email_clicked",
    label: "Clicked email",
    description: "A contact clicks a link in an email",
    icon: catalogIcon(CursorArrowRaysIcon),
  },
  {
    type: "tag_added",
    label: "Tag added",
    description: "A tag is applied to a contact",
    icon: catalogIcon(TagIcon),
  },
  {
    type: "campaign_completed",
    label: "Completed campaign",
    description: "A contact finishes a campaign",
    icon: catalogIcon(FlagIcon),
  },
  {
    type: "health_threshold",
    label: "Contact Score Threshold",
    description: "A contact score crosses your threshold",
    icon: catalogIcon(ChartBarIcon),
  },
];

// Static fallback action catalog - the 8 send/flow steps offered in the "+"
// insert popover and the placeholder selector.
export const actionNodes = [
  {
    type: "send_email",
    label: "Send email",
    description: "Send an email to the wallet",
    icon: catalogIcon(EnvelopeIcon),
  },
  {
    type: "send_inapp",
    label: "Send in-app",
    description: "Send an in-app push notification",
    icon: catalogIcon(BellAlertIcon),
  },
  {
    type: "wait",
    label: "Wait",
    description: "Wait for a period of time",
    icon: catalogIcon(ClockIcon),
  },
  {
    type: "branch",
    label: "Branch",
    description: "Split based on a condition",
    icon: catalogIcon(ArrowsRightLeftIcon),
  },
  {
    type: "add_tag",
    label: "Add tag",
    description: "Tag the matched contact",
    icon: catalogIcon(TagIcon),
  },
  {
    type: "add_to_list",
    label: "Add to list",
    description: "Add the contact to a list",
    icon: catalogIcon(QueueListIcon),
  },
  {
    type: "webhook",
    label: "Webhook",
    description: "Call an external URL",
    icon: catalogIcon(LinkIcon),
  },
  {
    type: "dispatch_campaign",
    label: "Dispatch campaign",
    description: "Trigger an existing campaign",
    icon: catalogIcon(RocketLaunchIcon),
  },
];
