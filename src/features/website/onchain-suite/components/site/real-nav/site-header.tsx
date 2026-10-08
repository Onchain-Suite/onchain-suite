"use client";

import {
  BellAlertIcon,
  BellIcon,
  BoltIcon,
  CalculatorIcon,
  CodeBracketIcon,
  PaperAirplaneIcon,
  PuzzlePieceIcon,
  ScaleIcon,
  ShareIcon,
  SignalIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

import "./site-header.css";
import OnchainLogo from "./brand-icon";
import { ACCENT, DOCS } from "./nav-data";

// Our loaded fonts (brand.md / design.md). NsShell sets --font-instrument-sans
// and --font-geist-mono on the wrapper; this navbar renders outside `.ns`, so it
// references them directly for its prose and mono labels.
const SANS =
  "var(--font-instrument-sans), 'Instrument Sans', ui-sans-serif, system-ui, sans-serif";
const MONO =
  "var(--font-geist-mono), var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

/* ---------------- menu data ---------------- */

type MenuItem = {
  icon?: string;
  brand?: string;
  label: string;
  desc?: string;
  href: string;
  external?: boolean;
};

const PLATFORM: MenuItem[] = [
  {
    icon: "monitor",
    label: "Monitor & Normalise",
    desc: "Real-time on-chain events, one shape",
    href: "/#platform",
  },
  {
    icon: "automations",
    label: "Automations",
    desc: "Flows that fire on wallet activity",
    href: "/#automations",
  },
  {
    icon: "intelligence",
    label: "Intelligence",
    desc: "Ask your on-chain data anything",
    href: "/#intelligence",
  },
  {
    icon: "channels",
    label: "Channels",
    desc: "In-app push, email, and more",
    href: "/#channels",
  },
  {
    icon: "audience",
    label: "Audience",
    desc: "Wallet-first profiles and segments",
    href: DOCS.audience,
    external: true,
  },
  {
    icon: "campaigns",
    label: "Campaigns",
    desc: "On-demand sends to on-chain segments",
    href: DOCS.campaigns,
    external: true,
  },
  {
    icon: "compare",
    label: "Compare",
    desc: "OnchainSuite vs Klaviyo, Braze, and more",
    href: "/compare",
  },
  {
    icon: "tools",
    label: "Tools",
    desc: "Free churn and wallet LTV calculators",
    href: "/tools",
  },
];

const DEV_GUIDES = [
  {
    tag: "Guide",
    title: "Getting started",
    desc: "Set up your workspace and send in minutes",
    href: DOCS.gettingStarted,
  },
  {
    tag: "Guide",
    title: "Your first campaign",
    desc: "From on-chain segment to send",
    href: DOCS.firstCampaign,
  },
  {
    tag: "Guide",
    title: "In-app push",
    desc: "Drop-in wallet notifications",
    href: DOCS.inAppPush,
  },
];

const DEV_INTEGRATIONS: MenuItem[] = [
  {
    icon: "push",
    label: "In-app notifications",
    desc: "Wallet-based push",
    href: DOCS.inAppPush,
    external: true,
  },
  {
    icon: "wallet",
    label: "Wallet & contract data",
    desc: "On-chain event sources",
    href: DOCS.walletData,
    external: true,
  },
  {
    icon: "plug",
    label: "Third-party connections",
    desc: "Plug into your stack",
    href: DOCS.thirdParty,
    external: true,
  },
  {
    icon: "webhook",
    label: "Webhook events",
    desc: "Real-time event stream",
    href: DOCS.webhookEvents,
    external: true,
  },
];

const DEV_BUILD: MenuItem[] = [
  { brand: "nextjs", label: "Next.js", href: DOCS.inAppPush, external: true },
  { brand: "react", label: "React", href: DOCS.inAppPush, external: true },
  { brand: "node", label: "Node.js", href: DOCS.api, external: true },
  { icon: "api", label: "REST API", href: DOCS.api, external: true },
  { icon: "webhook", label: "Webhooks", href: DOCS.webhooks, external: true },
];

/* ---------------- icons ---------------- */

// Functional nav icons use Heroicons (house convention: heroicons only). The
// Next.js/React/Node chips below stay as brand marks - Heroicons has no logos.
const LINE_ICONS: Record<string, typeof SignalIcon> = {
  monitor: SignalIcon,
  automations: BoltIcon,
  intelligence: SparklesIcon,
  channels: BellIcon,
  audience: UsersIcon,
  campaigns: PaperAirplaneIcon,
  push: BellAlertIcon,
  wallet: WalletIcon,
  plug: PuzzlePieceIcon,
  webhook: ShareIcon,
  api: CodeBracketIcon,
  compare: ScaleIcon,
  tools: CalculatorIcon,
};

function LineIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = LINE_ICONS[name] ?? SignalIcon;
  return <Icon aria-hidden="true" style={{ width: size, height: size }} />;
}

function BrandIcon({ name, size = 20 }: { name: string; size?: number }) {
  if (name === "nextjs")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#000" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="Instrument Sans, sans-serif"
        >
          N
        </text>
      </svg>
    );
  if (name === "react")
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="#61DAFB"
        strokeWidth="1"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="1.8" fill="#61DAFB" stroke="none" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" />
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="4.2"
          transform="rotate(60 12 12)"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="4.2"
          transform="rotate(120 12 12)"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2 21 7 21 17 12 22 3 17 3 7Z" fill="#539E43" />
    </svg>
  );
}

function IconTile({
  children,
  size = 34,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: `color-mix(in oklab, ${ACCENT} 11%, #fff)`,
        border: `1px solid color-mix(in oklab, ${ACCENT} 22%, #fff)`,
        color: ACCENT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      {children}
    </span>
  );
}

/* ---------------- menu rows ---------------- */

function MenuLink({ item, onNav }: { item: MenuItem; onNav: () => void }) {
  return (
    <a
      href={item.href}
      {...(item.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      onClick={onNav}
      className="ocs-menu-item"
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <IconTile>
        {item.brand ? (
          <BrandIcon name={item.brand} />
        ) : (
          <LineIcon name={item.icon ?? "monitor"} />
        )}
      </IconTile>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#1A1A17",
          }}
        >
          {item.label}
        </span>
        {item.desc && (
          <span
            style={{
              display: "block",
              fontSize: 12.5,
              color: "#8A93A6",
              marginTop: 1,
            }}
          >
            {item.desc}
          </span>
        )}
      </span>
    </a>
  );
}

function FeaturedInApp({ onNav }: { onNav: () => void }) {
  return (
    <a
      href={DOCS.inAppPush}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNav}
      className="ocs-card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: 14,
        padding: 16,
        border: `1px solid color-mix(in oklab,${ACCENT} 30%,#DCE7F5)`,
        background: `radial-gradient(120% 80% at 100% 0%, color-mix(in oklab,#2F94FF 7%,#fff), transparent 60%), color-mix(in oklab,${ACCENT} 6%,#fff)`,
        boxShadow: "0 1px 2px rgba(26,24,20,.04)",
      }}
    >
      <div>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".04em",
            color: "#fff",
            background: ACCENT,
            padding: "2px 8px",
            borderRadius: 999,
            fontFamily: MONO,
          }}
        >
          NEW
        </span>
        <div
          style={{
            marginTop: 9,
            fontSize: 15,
            fontWeight: 700,
            color: "#1A1A17",
          }}
        >
          In-app notifications
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 12.5,
            lineHeight: 1.45,
            color: "#51607A",
          }}
        >
          Wallet-based push reaching 100% of connected wallets. No extra
          identifier.
        </div>
      </div>

      {/* mini push-toast preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "#fff",
          border: "1px solid #DCE7F5",
          borderRadius: 10,
          padding: "9px 11px",
          boxShadow: "0 6px 16px -10px rgba(26,24,20,.25)",
        }}
      >
        <IconTile size={28}>
          <LineIcon name="push" size={15} />
        </IconTile>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A17" }}>
            OnchainSuite
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#8A93A6",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Your stake dropped. Top up?
          </div>
        </div>
      </div>

      <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>
        Read the guide →
      </span>
    </a>
  );
}

function PlatformPanel({ onNav }: { onNav: () => void }) {
  return (
    <div style={{ width: 800, maxWidth: "100%", padding: 12 }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            alignContent: "start",
          }}
        >
          {PLATFORM.map((it) => (
            <MenuLink key={it.label} item={it} onNav={onNav} />
          ))}
        </div>
        <FeaturedInApp onNav={onNav} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "12px 12px 4px",
          marginTop: 8,
          borderTop: "1px solid #E3ECF8",
        }}
      >
        <Link
          href="/#top"
          onClick={onNav}
          className="ocs-link-muted"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          See how it works →
        </Link>
        <a
          href={DOCS.home}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNav}
          className="ocs-link-muted"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          Read the docs ↗
        </a>
      </div>
    </div>
  );
}

function DevelopersPanel({ onNav }: { onNav: () => void }) {
  return (
    <div style={{ width: 860, maxWidth: "100%", padding: 16 }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24 }}
      >
        {/* Guides */}
        <div>
          <div style={menuHeading}>Best practices</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DEV_GUIDES.map((g) => (
              <a
                key={g.title}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNav}
                className="ocs-card-hover"
                style={{
                  display: "block",
                  border: "1px solid #E3ECF8",
                  borderRadius: 12,
                  background: "#fff",
                  padding: "12px 14px",
                  boxShadow: "0 1px 2px rgba(26,24,20,.03)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 600,
                    color: ACCENT,
                    background: `color-mix(in oklab,${ACCENT} 8%,#fff)`,
                    border: `1px solid color-mix(in oklab,${ACCENT} 20%,#fff)`,
                    padding: "1px 7px",
                    borderRadius: 999,
                    marginBottom: 7,
                  }}
                >
                  {g.tag}
                </span>
                <div
                  style={{ fontSize: 14.5, fontWeight: 600, color: "#1A1A17" }}
                >
                  {g.title}
                </div>
                <div style={{ fontSize: 12.5, color: "#8A93A6", marginTop: 2 }}>
                  {g.desc}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div>
          <div style={menuHeading}>Integrations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {DEV_INTEGRATIONS.map((it) => (
              <MenuLink key={it.label} item={it} onNav={onNav} />
            ))}
          </div>
        </div>
      </div>

      {/* Build with */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid #E3ECF8",
        }}
      >
        <div style={{ ...menuHeading, marginBottom: 10 }}>Build with</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DEV_BUILD.map((b) => (
            <a
              key={b.label}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNav}
              className="ocs-chip-hover"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                border: "1px solid #DCE7F5",
                borderRadius: 10,
                background: "#fff",
                padding: "8px 13px",
                boxShadow: "0 1px 2px rgba(26,24,20,.03)",
              }}
            >
              {b.brand ? (
                <BrandIcon name={b.brand} size={18} />
              ) : (
                <span style={{ color: ACCENT, display: "flex" }}>
                  <LineIcon name={b.icon ?? "api"} size={18} />
                </span>
              )}
              <span
                style={{ fontSize: 13.5, fontWeight: 600, color: "#3A3A34" }}
              >
                {b.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const menuHeading = {
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  color: "#A6AFC0",
  fontWeight: 600,
  padding: "0 12px 8px",
};

/* ---------------- header ---------------- */

type MenuId = "platform" | "developers";

export default function SiteHeader() {
  const [open, setOpen] = useState<MenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const openMenu = (id: MenuId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(id);
  };
  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };
  const closeAll = () => {
    setOpen(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Show the nav's "Connect With Sales" only after the hero CTA scrolls out of view.
  // On pages without a hero CTA (no sentinel), show it immediately.
  useEffect(() => {
    const sentinel = document.getElementById("ocs-cta-sentinel");
    if (!sentinel) {
      setShowCta(true);
      return;
    }
    const update = () =>
      setShowCta(sentinel.getBoundingClientRect().bottom < 72);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node))
        setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const Trigger = ({ id, label }: { id: MenuId; label: string }) => (
    <button
      className={`ocs-nav-trigger${open === id ? " open" : ""}`}
      aria-expanded={open === id}
      onMouseEnter={() => openMenu(id)}
      onMouseLeave={scheduleClose}
      onClick={() => openMenu(id)}
    >
      {label}
      <span
        className={`ocs-nav-caret${open === id ? " open" : ""}`}
        style={{ fontSize: 10 }}
      >
        ▾
      </span>
    </button>
  );

  return (
    <header
      ref={headerRef}
      style={{
        fontFamily: SANS,
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: scrolled ? "12px 16px 0" : "0",
        background: scrolled ? "transparent" : "rgba(250,250,248,.78)",
        backdropFilter: scrolled ? "none" : "saturate(140%) blur(10px)",
        WebkitBackdropFilter: scrolled ? "none" : "saturate(140%) blur(10px)",
        borderBottom: scrolled ? "1px solid transparent" : "1px solid #DCE7F5",
        transition:
          "padding .32s ease, background .32s ease, border-color .32s ease",
      }}
    >
      <nav
        style={{
          position: "relative",
          maxWidth: scrolled ? 1240 : 1320,
          margin: "0 auto",
          height: scrolled ? 58 : 64,
          padding: scrolled ? "0 14px 0 22px" : "0 32px",
          display: "flex",
          alignItems: "center",
          gap: 28,
          background: scrolled ? "rgba(255,255,255,.82)" : "transparent",
          backdropFilter: scrolled ? "saturate(160%) blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(160%) blur(14px)" : "none",
          border: scrolled ? "1px solid #DCE7F5" : "1px solid transparent",
          borderRadius: scrolled ? 18 : 0,
          boxShadow: scrolled
            ? "0 1px 2px rgba(26,24,20,.04),0 20px 44px -26px rgba(26,24,20,.22)"
            : "none",
          transition:
            "max-width .32s ease, height .32s ease, padding .32s ease, background .32s ease, border-color .32s ease, border-radius .32s ease, box-shadow .32s ease",
        }}
        data-pad
      >
        <Link
          href="/"
          onClick={closeAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flex: "none",
          }}
        >
          <OnchainLogo size={26} gradientId="ocsLogoNav" />
          <span
            style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.01em" }}
          >
            OnchainSuite
          </span>
        </Link>

        {/* desktop links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginLeft: 14,
          }}
          data-navlinks
        >
          <Trigger id="platform" label="Platform" />
          <Trigger id="developers" label="Developers" />
          <Link href="/pricing" className="ocs-navlink" onClick={closeAll}>
            Pricing
          </Link>
          <Link href="/blog" className="ocs-navlink" onClick={closeAll}>
            Blog
          </Link>
          <Link href="/team" className="ocs-navlink" onClick={closeAll}>
            Team
          </Link>
        </div>

        {/* right side */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <a
            href="/early-access"
            onClick={closeAll}
            className="ocs-btn-primary"
            aria-hidden={!showCta}
            tabIndex={showCta ? 0 : -1}
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: "#fff",
              background: ACCENT,
              padding: "9px 16px",
              borderRadius: 9,
              whiteSpace: "nowrap",
              boxShadow: `0 1px 2px rgba(0,0,0,.08),0 1px 3px color-mix(in oklab,${ACCENT} 30%,transparent)`,
              opacity: showCta ? 1 : 0,
              transform: showCta ? "none" : "translateY(-4px)",
              pointerEvents: showCta ? "auto" : "none",
              transition: "opacity .28s ease, transform .28s ease",
            }}
          >
            Connect With Sales
          </a>
          <button
            className="ocs-hamburger"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  width: 16,
                  height: 2,
                  background: "#1A1A17",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  width: 16,
                  height: 2,
                  background: "#1A1A17",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  width: 16,
                  height: 2,
                  background: "#1A1A17",
                  borderRadius: 2,
                }}
              />
            </span>
          </button>
        </div>

        {/* mega-menu panel */}
        {open && (
          <div
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              left: 32,
              right: 32,
              display: "flex",
              justifyContent: "flex-start",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
                background: "#fff",
                border: "1px solid #DCE7F5",
                borderRadius: 18,
                boxShadow:
                  "0 1px 2px rgba(26,24,20,.05),0 30px 60px -28px rgba(26,24,20,.30)",
                animation: "ocsFadeIn .16s ease both",
              }}
            >
              {open === "platform" ? (
                <PlatformPanel onNav={closeAll} />
              ) : (
                <DevelopersPanel onNav={closeAll} />
              )}
            </div>
          </div>
        )}
      </nav>

      {/* mobile panel */}
      {mobileOpen && (
        <div
          style={{
            borderTop: "1px solid #DCE7F5",
            background: "rgba(250,250,248,.97)",
            padding: "12px 18px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "calc(100vh - 64px)",
            overflowY: "auto",
          }}
        >
          <div style={mobileHeading}>Platform</div>
          {PLATFORM.map((m) => (
            <a
              key={m.label}
              href={m.href}
              {...(m.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="ocs-menu-item"
              onClick={closeAll}
              style={{ fontSize: 15, fontWeight: 600, color: "#1A1A17" }}
            >
              {m.label}
            </a>
          ))}
          <div style={mobileHeading}>Developers</div>
          {DEV_INTEGRATIONS.map((m) => (
            <a
              key={m.label}
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ocs-menu-item"
              onClick={closeAll}
              style={{ fontSize: 15, fontWeight: 600, color: "#1A1A17" }}
            >
              {m.label}
            </a>
          ))}
          <div
            style={{ height: 1, background: "#DCE7F5", margin: "8px 12px" }}
          />
          <Link
            href="/pricing"
            className="ocs-menu-item"
            onClick={closeAll}
            style={{ fontSize: 15, fontWeight: 600, color: "#1A1A17" }}
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="ocs-menu-item"
            onClick={closeAll}
            style={{ fontSize: 15, fontWeight: 600, color: "#1A1A17" }}
          >
            Blog
          </Link>
          <Link
            href="/team"
            className="ocs-menu-item"
            onClick={closeAll}
            style={{ fontSize: 15, fontWeight: 600, color: "#1A1A17" }}
          >
            Team
          </Link>
        </div>
      )}
    </header>
  );
}

const mobileHeading = {
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  color: "#A6AFC0",
  padding: "10px 12px 4px",
};
