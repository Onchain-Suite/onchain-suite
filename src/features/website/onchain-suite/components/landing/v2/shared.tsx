"use client";

import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  BellIcon,
  BoltIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  CreditCardIcon,
  LinkIcon,
  PaperAirplaneIcon,
  RocketLaunchIcon,
  RssIcon,
  SignalIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";

export const SIGNUP = "/early-access";
export const DOCS_URL = "https://docs.onchainsuite.com";

const LOGO_SRC =
  "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1761095341/full_logo_horizontal_coloured_dark_kpiv6u.png";

export function Logo({
  height = 28,
  className,
}: {
  height?: number;
  /** When set, sizing is left to the classes (responsive heights) instead of
   *  the inline `height` style; `height` still provides the intrinsic ratio. */
  className?: string;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Onchain Suite"
      width={Math.round(height * 5.4)}
      height={height}
      priority
      className={className ? `${className} w-auto` : "w-auto"}
      style={className ? { width: "auto" } : { height, width: "auto" }}
    />
  );
}

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

function MenuItem({
  icon: Icon,
  title,
  desc,
  href,
  onClick,
}: {
  icon: IconType;
  title: string;
  desc: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-[color:var(--acc-soft)]"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: "color-mix(in oklab, var(--acc) 12%, var(--surface))",
          color: "var(--acc)",
        }}
      >
        <Icon className="h-4 w-4" aria-hidden={true} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold t-ink">{title}</span>
        <span className="block text-[11.5px] leading-snug t-muted">{desc}</span>
      </span>
    </Link>
  );
}

const PLATFORM_ITEMS: {
  icon: IconType;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    icon: SignalIcon,
    title: "Monitor & Normalize",
    desc: "Real-time on-chain events, one shape",
    href: "/#monitor",
  },
  {
    icon: BoltIcon,
    title: "Automations",
    desc: "Flows that fire on wallet activity",
    href: "/#automations",
  },
  {
    icon: SparklesIcon,
    title: "Intelligence",
    desc: "Ask your on-chain data anything",
    href: "/#intelligence",
  },
  {
    icon: BellIcon,
    title: "Channels",
    desc: "In-app push, email, and more",
    href: "/#channels",
  },
  {
    icon: UserGroupIcon,
    title: "Audience",
    desc: "Wallet-first profiles and segments",
    href: "/early-access",
  },
  {
    icon: PaperAirplaneIcon,
    title: "Campaigns",
    desc: "On-demand sends to on-chain segments",
    href: "/early-access",
  },
];

function PlatformMenu() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PLATFORM_ITEMS.map((it) => (
          <MenuItem key={it.title} {...it} />
        ))}
      </div>
      <Link
        href="/#channels"
        className="group flex flex-col rounded-2xl border p-4 transition-colors"
        style={{
          borderColor: "color-mix(in oklab, var(--acc) 25%, var(--line))",
          background: "var(--acc-soft)",
        }}
      >
        <span
          className="mono w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: "var(--acc)" }}
        >
          NEW
        </span>
        <span className="mt-2.5 text-[15px] font-semibold t-ink">
          In-app notifications
        </span>
        <span className="mt-1 text-[12.5px] leading-snug t-muted">
          Wallet-based push reaching 100% of connected wallets. No extra
          identifier.
        </span>
        <span
          className="mt-3 flex items-center gap-2.5 rounded-xl border bg-[color:var(--surface)] p-2.5"
          style={{ borderColor: "var(--line)" }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--acc) 14%, var(--surface))",
              color: "var(--acc)",
            }}
          >
            <BellIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold t-ink">
              OnchainSuite
            </span>
            <span className="block truncate text-[11.5px] t-muted">
              Your stake dropped. Top up?
            </span>
          </span>
        </span>
        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold t-acc">
          Read the guide
          <ArrowRightIcon
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </div>
  );
}

const DEV_GUIDES = [
  {
    title: "Getting started",
    desc: "Set up your workspace and send in minutes",
    href: "/early-access",
  },
  {
    title: "Your first campaign",
    desc: "From on-chain segment to send",
    href: "/early-access",
  },
  {
    title: "In-app push",
    desc: "Drop-in wallet notifications",
    href: "/#developer",
  },
];
const DEV_INTEGRATIONS: {
  icon: IconType;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    icon: BellIcon,
    title: "In-app notifications",
    desc: "Wallet-based push",
    href: "/#channels",
  },
  {
    icon: CreditCardIcon,
    title: "Wallet & contract data",
    desc: "On-chain event sources",
    href: "/#monitor",
  },
  {
    icon: LinkIcon,
    title: "Third-party connections",
    desc: "Plug into your stack",
    href: "/#integrations",
  },
  {
    icon: RssIcon,
    title: "Webhook events",
    desc: "Real-time event stream",
    href: "/#developer",
  },
];
const BUILD_WITH = ["Next.js", "React", "Node.js", "REST API", "Webhooks"];

function DevelopersMenu() {
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.16em] t-muted2">
            Best practices
          </div>
          <div className="space-y-2">
            {DEV_GUIDES.map((g) => (
              <Link
                key={g.title}
                href={g.href}
                className="block rounded-xl border p-3 transition-colors hover:border-[color:var(--acc)] hover:bg-[color:var(--acc-soft)]"
                style={{ borderColor: "var(--line-2)" }}
              >
                <span
                  className="mono inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold t-acc"
                  style={{ background: "var(--acc-soft)" }}
                >
                  Guide
                </span>
                <span className="mt-1.5 block text-[14px] font-semibold t-ink">
                  {g.title}
                </span>
                <span className="block text-[12.5px] t-muted">{g.desc}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.16em] t-muted2">
            Integrations
          </div>
          <div className="space-y-0.5">
            {DEV_INTEGRATIONS.map((it) => (
              <MenuItem key={it.title} {...it} />
            ))}
          </div>
        </div>
      </div>
      <div
        className="mt-5 border-t pt-4"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="mono mb-2.5 text-[10px] uppercase tracking-[0.16em] t-muted2">
          Build with
        </div>
        <div className="flex flex-wrap gap-2">
          {BUILD_WITH.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium t-ink2"
              style={{ borderColor: "var(--line)" }}
            >
              {b === "REST API" ? (
                <CodeBracketIcon className="h-4 w-4 t-acc" aria-hidden="true" />
              ) : b === "Webhooks" ? (
                <RssIcon className="h-4 w-4 t-acc" aria-hidden="true" />
              ) : (
                <RocketLaunchIcon
                  className="h-4 w-4 t-muted2"
                  aria-hidden="true"
                />
              )}
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type MenuId = "platform" | "developers";

export function Nav({ ctaWatchesHero = false }: { ctaWatchesHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // While the hero (which has its own CTA) is on screen, the nav CTA stays
  // hidden; it fades in once the user scrolls past the hero. Defaults to the
  // prop so the first paint is correct on both the landing page and pages
  // without a hero (pricing, legal, …).
  const [heroInView, setHeroInView] = useState(ctaWatchesHero);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!ctaWatchesHero) return;
    const hero = document.querySelector("[data-landing-hero]");
    if (!hero) {
      setHeroInView(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      // offset the sticky nav height so the CTA appears as the hero slides under it
      { rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [ctaWatchesHero]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // While the mobile menu is open: lock body scroll, and auto-close if the
  // viewport grows past the md breakpoint (where the desktop nav takes over).
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = prevOverflow;
      mq.removeEventListener("change", onChange);
    };
  }, [mobileOpen]);

  const triggerCls =
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors";

  return (
    <header
      className="sticky top-0 z-50"
      onMouseLeave={() => setOpenMenu(null)}
      style={{
        paddingTop: scrolled ? 12 : 0,
        transition: "padding .35s cubic-bezier(.2,.7,.2,1)",
      }}
    >
      <nav
        className="relative z-10 mx-auto flex items-center gap-4 md:gap-7"
        style={{
          // min() keeps the scrolled pill inset from the viewport edges on
          // phones (the max-width transition falls back to a snap there).
          maxWidth: scrolled ? "min(940px, calc(100% - 24px))" : 1320,
          height: scrolled ? 64 : 86,
          padding: scrolled ? "0 14px 0 18px" : "0 28px",
          background: scrolled
            ? "color-mix(in oklab, var(--surface) 88%, transparent)"
            : "transparent",
          backdropFilter: scrolled ? "saturate(150%) blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(150%) blur(14px)" : "none",
          border: scrolled ? "1px solid var(--line)" : "1px solid transparent",
          borderRadius: scrolled ? 999 : 0,
          boxShadow: scrolled
            ? "0 10px 40px -16px rgba(26,24,20,0.22)"
            : "none",
          transition:
            "max-width .35s cubic-bezier(.2,.7,.2,1), height .35s cubic-bezier(.2,.7,.2,1), padding .35s, background .35s, border-color .35s, border-radius .35s, box-shadow .35s",
        }}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center"
          aria-label="OnchainSuite home"
        >
          {/* smaller on phones so logo + hamburger never overflow ~360px */}
          <Logo
            height={52}
            className={
              scrolled ? "h-8 w-auto sm:h-10" : "h-9 w-auto sm:h-[52px]"
            }
          />
        </Link>
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
          {(["platform", "developers"] as MenuId[]).map((id) => (
            <button
              key={id}
              type="button"
              onMouseEnter={() => setOpenMenu(id)}
              onFocus={() => setOpenMenu(id)}
              aria-expanded={openMenu === id}
              className={triggerCls}
              style={{
                color: openMenu === id ? "var(--acc)" : "var(--muted)",
                background: openMenu === id ? "var(--acc-soft)" : "transparent",
              }}
            >
              {id === "platform" ? "Platform" : "Developers"}
              <ChevronDownIcon
                className="h-3.5 w-3.5 transition-transform"
                style={{
                  transform: openMenu === id ? "rotate(180deg)" : "none",
                }}
                aria-hidden="true"
              />
            </button>
          ))}
          <Link
            href="/pricing"
            onMouseEnter={() => setOpenMenu(null)}
            className="rounded-full px-3 py-1.5 text-[13.5px] font-medium t-muted transition-colors hover:bg-[color:var(--acc-soft)] hover:text-[color:var(--acc)]"
          >
            Pricing
          </Link>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setOpenMenu(null)}
            className="rounded-full px-3 py-1.5 text-[13.5px] font-medium t-muted transition-colors hover:bg-[color:var(--acc-soft)] hover:text-[color:var(--acc)]"
          >
            Docs
          </a>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {/* Sign in — temporarily hidden, functionality preserved.
          <Link href="/auth/signin" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          */}
          <Link
            href={SIGNUP}
            className={`btn btn-primary nav-cta${heroInView ? " nav-cta-hidden" : ""}`}
            aria-hidden={heroInView}
            tabIndex={heroInView ? -1 : undefined}
          >
            Get early access
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors md:hidden"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            {mobileOpen ? (
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* mobile dropdown menu — same links as the desktop mega-menus + CTA */}
      {mobileOpen ? (
        <div className="mobile-menu absolute inset-x-0 top-full z-20 px-3 pt-2 md:hidden">
          <div
            className="max-h-[calc(100dvh-110px)] overflow-y-auto rounded-2xl border p-4 shadow-[0_30px_80px_-30px_rgba(26,24,20,0.35)]"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.16em] t-muted2">
              Platform
            </div>
            <div className="grid grid-cols-1 gap-0.5 min-[480px]:grid-cols-2">
              {PLATFORM_ITEMS.map((it) => (
                <MenuItem
                  key={it.title}
                  {...it}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
            <div className="mono mb-1.5 mt-4 text-[10px] uppercase tracking-[0.16em] t-muted2">
              Developers
            </div>
            <div className="grid grid-cols-1 gap-0.5 min-[480px]:grid-cols-2">
              {DEV_INTEGRATIONS.map((it) => (
                <MenuItem
                  key={it.title}
                  {...it}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
            <div
              className="mt-4 grid grid-cols-2 gap-2 border-t pt-4"
              style={{ borderColor: "var(--line)" }}
            >
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="btn btn-ghost w-full"
              >
                Pricing
              </Link>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="btn btn-ghost w-full"
              >
                Docs
                <ArrowTopRightOnSquareIcon
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </a>
            </div>
            <Link
              href={SIGNUP}
              onClick={() => setMobileOpen(false)}
              className="btn btn-primary mt-2.5 w-full"
            >
              Get early access
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* hover mega-menu */}
      <AnimatePresence>
        {openMenu ? (
          <motion.div
            key={openMenu}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-x-0 top-full hidden justify-center px-4 md:flex"
          >
            {/* pt bridges the gap so hover stays continuous */}
            <div
              className="w-full pt-2"
              style={{ maxWidth: openMenu === "platform" ? 720 : 640 }}
            >
              <div
                className="rounded-2xl border p-4 shadow-[0_30px_80px_-30px_rgba(26,24,20,0.3)]"
                style={{
                  borderColor: "var(--line)",
                  background:
                    "color-mix(in oklab, var(--surface) 96%, transparent)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {openMenu === "platform" ? (
                  <PlatformMenu />
                ) : (
                  <DevelopersMenu />
                )}
                <div
                  className="mt-5 flex items-center gap-5 border-t pt-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <Link
                    href="/#monitor"
                    className="inline-flex items-center gap-1 text-[13px] font-semibold t-acc"
                  >
                    See how it works
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13px] font-semibold t-muted transition-colors hover:t-ink"
                  >
                    Read the docs
                    <ArrowTopRightOnSquareIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function Heading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal>
        <span className="eyebrow">{eyebrow}</span>
      </Reveal>
      <Reveal delay={0.05}>
        <h2
          className="mt-4 font-semibold tracking-tight t-ink"
          style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)", lineHeight: 1.1 }}
        >
          {title}
        </h2>
      </Reveal>
      {sub ? (
        <Reveal delay={0.1}>
          <p className="mt-4 text-[16px] leading-relaxed t-muted">{sub}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

const X_URL = "https://x.com/0nchainSuite";
const LINKEDIN_URL = "https://www.linkedin.com/company/onchainsuite/";
const EMAIL_URL = "mailto:onchainsuite@gmail.com";

const FOOTER: { h: string; links: [string, string][] }[] = [
  {
    h: "Product",
    links: [
      ["Campaigns", "/campaigns"],
      ["Automations", "/automations"],
      ["Audience", "/audience"],
      ["Intelligence", "/intelligence"],
      ["Integrations", "/settings?tab=integrations"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    h: "Company",
    links: [
      ["About", DOCS_URL],
      ["Blog", DOCS_URL],
      ["Careers", DOCS_URL],
    ],
  },
  {
    h: "Resources",
    links: [
      ["Docs", DOCS_URL],
      ["API", DOCS_URL],
      ["SDK", DOCS_URL],
      ["Changelog", DOCS_URL],
    ],
  },
  {
    h: "Connect",
    links: [
      ["X", X_URL],
      ["LinkedIn", LINKEDIN_URL],
      ["Discord", DOCS_URL],
      ["Email", EMAIL_URL],
    ],
  },
];

/** Renders an internal Link or an external anchor depending on the href. */
function FooterLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const external = /^(https?:|mailto:)/.test(href);
  if (external) {
    return (
      <a
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t py-14" style={{ borderColor: "var(--line)" }}>
      {/* phones: link columns pair up 2×2 under the logo; md+: original 5-col row */}
      <div className="wrap grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.5fr_repeat(4,1fr)] md:gap-10">
        <div className="col-span-2 md:col-span-1">
          <Logo height={50} />
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed t-muted">
            The behavior-triggered retention platform for Web3.
          </p>
        </div>
        {FOOTER.map((col) => (
          <div key={col.h}>
            <div className="mono mb-3 text-[11px] uppercase tracking-[0.14em] t-muted2">
              {col.h}
            </div>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <FooterLink
                    href={href}
                    className="text-[13.5px] t-muted transition-colors hover:text-[color:var(--acc)]"
                  >
                    {label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        className="wrap mt-10 flex flex-col items-center justify-between gap-3 border-t pt-8 text-[12.5px] t-muted2 sm:flex-row"
        style={{ borderColor: "var(--line)" }}
      >
        <span>© {year} OnchainSuite Incorporated</span>
        <div className="flex items-center gap-5">
          <Link
            href="/legal#privacy"
            className="transition-colors hover:text-[color:var(--acc)]"
          >
            Privacy
          </Link>
          <Link
            href="/legal#terms"
            className="transition-colors hover:text-[color:var(--acc)]"
          >
            Terms
          </Link>
          <Link
            href="/legal#compliance"
            className="transition-colors hover:text-[color:var(--acc)]"
          >
            Compliance
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Shared page chrome for every marketing route (scope + nav + footer). */
export function PageShell({
  children,
  navCtaWatchesHero = false,
}: {
  children: ReactNode;
  /** Hide the nav CTA while the landing hero (with its own CTA) is in view. */
  navCtaWatchesHero?: boolean;
}) {
  return (
    <div className="ocs2 min-h-screen">
      <Nav ctaWatchesHero={navCtaWatchesHero} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
