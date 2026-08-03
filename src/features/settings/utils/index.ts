import {
  BuildingOffice2Icon,
  CodeBracketIcon,
  CreditCardIcon,
  GiftIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const modalSlideUp = {
  initial: { opacity: 0, y: 40, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
};

export const tabs = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "account", label: "Account", icon: BuildingOffice2Icon },
  { id: "billing", label: "Billing", icon: CreditCardIcon },
  { id: "integrations", label: "Integrations", icon: CodeBracketIcon },
  { id: "rewards", label: "Rewards", icon: GiftIcon },
];

export const senders = [
  {
    email: "hello@onchain.suite",
    name: "OnchainSuite",
    status: "verified",
    domain: "onchain.suite",
    dkim: true,
    spf: true,
  },
  {
    email: "support@onchain.suite",
    name: "Support Team",
    status: "verified",
    domain: "onchain.suite",
    dkim: true,
    spf: true,
  },
  {
    email: "noreply@onchain.suite",
    name: "No Reply",
    status: "pending",
    domain: "onchain.suite",
    dkim: false,
    spf: true,
  },
  {
    email: "alerts@crypto.co",
    name: "Crypto Alerts",
    status: "failed",
    domain: "crypto.co",
    dkim: false,
    spf: false,
  },
];

export const lists = [
  { name: "All Subscribers", count: 12847, created: "Jan 12, 2024" },
  { name: "Newsletter", count: 8234, created: "Feb 3, 2024" },
  { name: "Product Updates", count: 5621, created: "Mar 15, 2024" },
  { name: "Whale Alerts", count: 892, created: "Apr 22, 2024" },
];

export const teamMembers = [
  {
    name: "Jason Chen",
    email: "jason@onchain.suite",
    role: "Owner",
    avatar: "J",
    twoFA: true,
    lastActive: "Now",
  },
  {
    name: "Sarah Kim",
    email: "sarah@onchain.suite",
    role: "Admin",
    avatar: "S",
    twoFA: true,
    lastActive: "2h ago",
  },
  {
    name: "Mike Rodriguez",
    email: "mike@onchain.suite",
    role: "Editor",
    avatar: "M",
    twoFA: false,
    lastActive: "1d ago",
  },
  {
    name: "Emily Zhang",
    email: "emily@onchain.suite",
    role: "Viewer",
    avatar: "E",
    twoFA: true,
    lastActive: "3d ago",
  },
];

export const invoices = [
  {
    id: "INV-2024-012",
    date: "Dec 1, 2024",
    amount: "$299.00",
    status: "paid",
  },
  {
    id: "INV-2024-011",
    date: "Nov 1, 2024",
    amount: "$299.00",
    status: "paid",
  },
  {
    id: "INV-2024-010",
    date: "Oct 1, 2024",
    amount: "$299.00",
    status: "paid",
  },
  {
    id: "INV-2024-009",
    date: "Sep 1, 2024",
    amount: "$249.00",
    status: "paid",
  },
];

export const integrationsList = [
  { name: "Zapier", desc: "Automate workflows", connected: true },
  { name: "Segment", desc: "Customer data platform", connected: false },
  { name: "Slack", desc: "Team notifications", connected: true },
  { name: "Discord", desc: "Community alerts", connected: false },
  { name: "Telegram", desc: "Bot messaging", connected: false },
  { name: "Shopify", desc: "E-commerce sync", connected: false },
];

export const webhooks = [
  {
    url: "https://api.myapp.com/webhooks/onchain",
    events: ["email.sent", "email.opened"],
    status: "active",
    lastTriggered: "2 min ago",
  },
  {
    url: "https://hooks.zapier.com/abc123",
    events: ["subscriber.created"],
    status: "active",
    lastTriggered: "1h ago",
  },
];
