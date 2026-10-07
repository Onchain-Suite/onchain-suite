"use client";
/* eslint-disable */
/* OnchainSuite website, merged into one React component.
   Generated from the site-redesign branch (commit 517cef1): every page and component of the Next.js site,
   routed in memory (addresses show as #/pricing), with styles embedded and images loaded from
   /site. Default export: <App />. Needs react and react-dom 18 or later. */
import { useEffect as useEffect6, useSyncExternalStore, useEffect, useEffect as useEffect2, useEffect as useEffect3, useState, useEffect as useEffect4, useRef, useState as useState2, useEffect as useEffect5, useState as useState4, createContext, useContext, useState as useState3, useState as useState5, useState as useState6, useState as useState7, useState as useState8, useState as useState9, useState as useState10, useState as useState11 } from "react";

import NextLink from "next/link";
import { usePathname as __useNextPathname } from "next/navigation";
function usePathname() { return __useNextPathname() || "/"; }
function navigate(href) { if (typeof window !== "undefined") window.location.assign(href); }
function notFound() { return null; }
// single/App.jsx

// app/ns.css
var ns_default = "";

// app/globals.css
var globals_default = "";

// components/Spotlight.jsx
function Spotlight() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;
    const onMove = (e) => {
      const target = e.target;
      const card = target?.closest(".ocs-spotlight");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}

// single/link.jsx
function Link({ href, children, onClick, ...rest }) {
  if (typeof href === "string" && href.startsWith("/")) {
    return <NextLink href={href} onClick={onClick} {...rest}>{children}</NextLink>;
  }
  return <a href={href} onClick={onClick} {...rest}>{children}</a>;
}

// lib/data.js
var ACCENT = "#1727E0";
var ACCENT_HOVER = "#1320B8";
var OK = "#2BC48A";
var SITE_URL = "https://www.onchainsuite.com";
var DOCS_URL = "https://docs.onchainsuite.com";
var APP_URL = "https://app.onchainsuite.com";
var CAL_LINK = "onchainsuite/15min";
var CAL_URL = `https://cal.com/${CAL_LINK}`;
var COMPANY = {
  legalName: "OnchainSuite Ltd",
  shortName: "OnchainSuite",
  number: "17370357",
  office: "31 Nash Square, Birmingham, United Kingdom, B42 2EX",
  incorporated: "30 July 2026",
  icoApplication: "C2013999",
  jurisdiction: "England and Wales",
  privacyEmail: "privacy@onchainsuite.com",
  dpoEmail: "dpo@onchainsuite.com",
  legalEmail: "legal@onchainsuite.com",
  securityEmail: "security@onchainsuite.com"
};
var LEGAL_UPDATED = "11 August 2026";
var DOCS = {
  home: DOCS_URL,
  gettingStarted: `${DOCS_URL}/getting-started/overview`,
  firstCampaign: `${DOCS_URL}/getting-started/send-your-first-campaign`,
  audience: `${DOCS_URL}/audience/overview`,
  campaigns: `${DOCS_URL}/campaigns/overview`,
  automation: `${DOCS_URL}/automation/overview`,
  intelligence: `${DOCS_URL}/intelligence/overview`,
  api: `${DOCS_URL}/api/overview`,
  webhooks: `${DOCS_URL}/api/webhooks`,
  integrations: `${DOCS_URL}/integrations/overview`,
  inAppPush: `${DOCS_URL}/integrations/in-app-notifications`,
  walletData: `${DOCS_URL}/integrations/wallet-and-contract-data`,
  thirdParty: `${DOCS_URL}/integrations/third-party-connections`,
  webhookEvents: `${DOCS_URL}/integrations/webhook-events`
};
var FOOTER_COLS = [
  {
    title: "Platform",
    items: [
      { label: "Segments", href: DOCS.audience, external: true },
      { label: "Campaigns", href: DOCS.campaigns, external: true },
      { label: "Automations", href: "/#automations" },
      { label: "Onchain analytics", href: "/#intelligence" },
      { label: "Identity resolution", href: "/#platform" },
      { label: "Deliverability", href: "/#channels" }
    ]
  },
  {
    title: "Developers",
    items: [
      { label: "Documentation", href: DOCS.home, external: true },
      { label: "API reference", href: DOCS.api, external: true },
      { label: "Webhooks", href: DOCS.webhooks, external: true },
      { label: "SDKs", href: DOCS.gettingStarted, external: true },
      { label: "Changelog", href: DOCS.home, external: true },
      { label: "Status", href: DOCS.home, external: true }
    ]
  },
  {
    title: "Free tools",
    items: [
      { label: "Cost per acquisition", href: "/tools/cost-per-acquisition" },
      { label: "Dormant wallet reactivation", href: "/tools/dormant-wallet-reactivation" },
      { label: "Wallet reachability score", href: "/tools/wallet-reachability-score" },
      { label: "Wallet churn rate", href: "/tools/wallet-churn-rate" },
      { label: "All tools", href: "/tools", accent: true }
    ]
  }
];

// components/ns/CalBooking.jsx
var NS = "15min";
var CONFIG = { layout: "month_view", useSlotsViewOnSmallScreen: "true" };
function loadCal() {
  const w = window;
  if (w.Cal) return;
  (function(C, A, L3) {
    const p3 = (a, ar) => {
      a.q.push(ar);
    };
    const d = C.document;
    C.Cal = C.Cal || (function(...ar) {
      const cal = C.Cal;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L3) {
        const api = function(...a) {
          p3(api, a);
        };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === "string") {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p3(cal.ns[namespace], ar);
          p3(cal, ["initNamespace", namespace]);
        } else p3(cal, ar);
        return;
      }
      p3(cal, ar);
    });
  })(window, "https://app.cal.com/embed/embed.js", "init");
  const Cal = w.Cal;
  Cal("init", NS, { origin: "https://app.cal.com" });
  Cal.config = Cal.config || {};
  Cal.config.forwardQueryParams = true;
  Cal.ns[NS]("ui", { hideEventTypeDetails: false, layout: "month_view" });
}
function CalBooking() {
  useEffect2(() => {
    loadCal();
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target?.closest?.("a[href]");
      if (!a) return;
      const href = (a.getAttribute("href") || "").replace(/^#(?=\/)/, "");
      if (!(href === "/early-access" || href.startsWith("/early-access?") || a.hasAttribute("data-book"))) return;
      const Cal = window.Cal;
      if (!Cal?.ns?.[NS]) return;
      e.preventDefault();
      Cal.ns[NS]("modal", { calLink: CAL_LINK, config: CONFIG });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

// components/ns/Sprite.jsx
var MARK = "M1047.3 2518.32c483.09,-45.16 860.34,-436.64 860.34,-912.94 0,-478.08 -380.11,-870.73 -866.11,-913.4 -49.69,-7.76 -87.72,-50.73 -87.72,-102.61l0 -136.1c0,-60.31 48.9,-109.22 109.22,-109.22l181.92 0c29.12,0 52.92,-23.8 52.92,-52.92l0 -238.22c0,-29.12 -23.81,-52.92 -52.92,-52.92l-238.22 0c-29.12,0 -52.92,23.8 -52.92,52.92l0 187.39c0,54.97 -40.64,100.47 -93.48,108.09 -483.09,45.16 -860.33,436.64 -860.33,912.94 0,478.09 380.1,870.7 866.1,913.4 49.69,7.76 87.72,50.74 87.72,102.61l0 136.1c0,60.32 -48.9,109.22 -109.22,109.22l-181.92 0c-29.12,0 -52.92,23.81 -52.92,52.92l0 238.22c0,29.12 23.8,52.93 52.92,52.93l238.22 0c29.12,0 52.92,-23.81 52.92,-52.93l0 -187.39c0,-54.96 40.64,-100.46 93.48,-108.09zm1.24 -346.95c-50.78,4.64 -94.72,-34.55 -94.72,-85.85l0 -192.27c0,-37.58 -29.35,-58.33 -66.22,-62.21 -298.33,-31.36 -530.02,-274.63 -530.02,-569.7 0,-285.58 217.23,-522.31 501.69,-565.99 2.73,-0.25 5.48,-0.39 8.27,-0.39 47.66,0 86.28,38.61 86.28,86.26l0 192.27c0,37.57 29.36,58.33 66.23,62.2 298.32,31.36 530.02,274.63 530.02,569.7 0,285.59 -217.28,522.37 -501.52,565.98z";
function Sprite() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false"><defs>
  <linearGradient id="mg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#1727E0" /><stop offset="1" stopColor="#4F8BFF" /></linearGradient>
  <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2F94FF" stopOpacity=".28" /><stop offset="1" stopColor="#2F94FF" stopOpacity="0" /></linearGradient>
  <symbol id="ocs-mark" viewBox="0 0 1908 2867"><path d={MARK} /></symbol>
  <symbol id="i-down" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" /></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
  <symbol id="i-return" viewBox="0 0 24 24"><path d="M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 0 10h-3" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
  <symbol id="i-text" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h13" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 12l9-9M17 6l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
  <symbol id="a-home" viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-camp" viewBox="0 0 16 16"><path d="M2.5 6v4h2l5 3V3l-5 3z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M12 6.5c.7.8.7 2.2 0 3" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-aud" viewBox="0 0 16 16"><circle cx="6" cy="6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 13.5c.6-2.4 2.3-3.6 4.5-3.6s3.9 1.2 4.5 3.6M10.8 3.6a2.4 2.4 0 1 1 0 4.8M12.2 10.2c1.2.5 1.9 1.6 2.2 3.3" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-brain" viewBox="0 0 16 16"><path d="M6 2.5a2 2 0 0 0-2 2 2 2 0 0 0-1.5 3.2A2.2 2.2 0 0 0 4 11.5a2 2 0 0 0 2 2V2.5zM10 2.5a2 2 0 0 1 2 2 2 2 0 0 1 1.5 3.2A2.2 2.2 0 0 1 12 11.5a2 2 0 0 1-2 2V2.5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></symbol>
  <symbol id="a-dash" viewBox="0 0 16 16"><path d="M2 2v12h12M4.5 10.5l3-3 2 2 4-4.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-data" viewBox="0 0 16 16"><ellipse cx="8" cy="4" rx="5" ry="2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-mail" viewBox="0 0 16 16"><rect x="2" y="3.5" width="12" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2.5 4.5L8 9l5.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-phone" viewBox="0 0 16 16"><rect x="4.5" y="1.5" width="7" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 12.2h2" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-at" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.6 8v1a1.7 1.7 0 0 0 3.4 0V8a6 6 0 1 0-2.4 4.8" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-bolt" viewBox="0 0 16 16"><path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></symbol>
  <symbol id="a-wait" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 4.5V8l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
  <symbol id="a-check" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.2 8.2l1.9 1.9 3.7-3.9" fill="none" stroke="currentColor" strokeWidth="1.4" /></symbol>
  <symbol id="a-spark" viewBox="0 0 16 16"><path d="M8 1.5l1.3 3.6L13 6.5 9.3 7.8 8 11.5 6.7 7.8 3 6.5l3.7-1.4zM12.5 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></symbol>
  <symbol id="a-up" viewBox="0 0 16 16"><path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></symbol>
  <symbol id="a-seg" viewBox="0 0 16 16"><circle cx="6" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 13.5c.6-2.4 2.3-3.6 4.5-3.6s3.9 1.2 4.5 3.6M11 4v5M8.5 6.5h5" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
</defs></svg>;
}

// components/ns/MobileMenu.jsx
function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect3(() => setOpen(false), [path]);
  useEffect3(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return <>
      <button type="button" className="btn menu-btn" aria-expanded={open} aria-controls="mmenu" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
      </button>
      {open && <div className="mmenu" id="mmenu">
          {links.map((l) => l.href.startsWith("http") ? <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a> : <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          <Link className="btn solid lg" href="/early-access" onClick={() => setOpen(false)}>Book a walkthrough</Link>
        </div>}
    </>;
}

// components/ns/NavMenu.jsx
var RESOURCES = [
  { href: "/compare", title: "Compare", desc: "OnchainSuite next to the tools you already use, fairly.", icon: "cmp" },
  { href: "/tools", title: "Free tools", desc: "Calculators for churn, reachability and lifetime value.", icon: "tool" },
  { href: null, title: "Blog", desc: "Lifecycle marketing for blockchain companies.", icon: "blog", soon: true },
  { href: DOCS_URL, title: "Docs", desc: "Guides for setting up, sending and building on the API.", icon: "docs", external: true }
];
var ICONS = {
  cmp: <path d="M3 4h4v9H3zM9 7h4v6H9z" />,
  tool: <><rect x="3" y="2.5" width="10" height="11" rx="1.5" /><path d="M5.5 5.5h5M5.5 8h1M8 8h1M10.5 8h0M5.5 10.5h1M8 10.5h1" /></>,
  blog: <path d="M3.5 3.5h9M3.5 6.5h9M3.5 9.5h6M3.5 12.5h4" />,
  docs: <><path d="M4 2.5h6l2.5 2.5v8.5H4z" /><path d="M9.5 2.5V5H12" /></>
};
function NavMenu() {
  const [open, setOpen] = useState2(false);
  const wrap5 = useRef(null);
  const timer = useRef(null);
  const path = usePathname();
  useEffect4(() => setOpen(false), [path]);
  useEffect4(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e) => {
      if (wrap5.current && !wrap5.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);
  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const leave = () => {
    timer.current = setTimeout(() => setOpen(false), 140);
  };
  return <nav className="links" aria-label="Main">
      <div className="dd" ref={wrap5} onMouseEnter={enter} onMouseLeave={leave}>
        <button type="button" className="dd-btn" aria-expanded={open} aria-controls="dd-res" onClick={() => setOpen((o) => !o)}>
          Resources<svg aria-hidden="true"><use href="#i-down" /></svg>
        </button>
        <div className={"dd-panel" + (open ? " open" : "")} id="dd-res" role="menu" hidden={!open}>
          {RESOURCES.map((r) => {
    const inner = <>
                <span className="dd-ic"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{ICONS[r.icon]}</svg></span>
                <span><b>{r.title}{r.soon && <em>Soon</em>}</b><small>{r.desc}</small></span>
              </>;
    if (!r.href) return <div key={r.title} className="dd-item off" role="menuitem" aria-disabled="true">{inner}</div>;
    return r.external ? <a key={r.title} className="dd-item" role="menuitem" href={r.href} target="_blank" rel="noreferrer">{inner}</a> : <Link key={r.title} className="dd-item" role="menuitem" href={r.href}>{inner}</Link>;
  })}
        </div>
      </div>
      <a href={DOCS_URL} target="_blank" rel="noreferrer">Developers</a>
      <Link href="/pricing" aria-current={path === "/pricing" ? "page" : void 0}>Pricing</Link>
    </nav>;
}

// components/ns/SiteMotion.jsx

// components/ns/motion.js
function kit() {
  var off = [];
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HAS_IO = "IntersectionObserver" in window;
  var ANIM = !RM && HAS_IO;
  function listen(t, type2, fn, opt) {
    t.addEventListener(type2, fn, opt);
    off.push(function() {
      t.removeEventListener(type2, fn, opt);
    });
  }
  function every(fn, ms) {
    var id = setInterval(fn, ms);
    off.push(function() {
      clearInterval(id);
    });
    return id;
  }
  function observe(cb, opt) {
    var o = new IntersectionObserver(cb, opt);
    off.push(function() {
      o.disconnect();
    });
    return o;
  }
  var vh = window.innerHeight;
  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  function sleep(ms) {
    return new Promise(function(r) {
      setTimeout(r, ANIM ? ms : 0);
    });
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function ease(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function fmt3(v, dec) {
    return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US");
  }
  function countUp(el, dur) {
    var to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
    if (!ANIM) {
      el.textContent = fmt3(to, dec) + suf;
      return;
    }
    var t0 = performance.now();
    dur = dur || 1100;
    (function f3(t) {
      var p3 = Math.min(1, (t - t0) / dur);
      el.textContent = fmt3(to * ease(p3), dec) + suf;
      if (p3 < 1) requestAnimationFrame(f3);
    })(t0);
  }
  function hide(el, y) {
    el.style.opacity = 0;
    el.style.transform = "translateY(" + (y == null ? 6 : y) + "px)";
  }
  function show(el, ms) {
    ms = ms || 380;
    el.style.transition = "opacity " + ms + "ms, transform " + ms + "ms cubic-bezier(.2,.8,.2,1)";
    el.style.opacity = 1;
    el.style.transform = "none";
  }
  function type(el, text, speed) {
    return new Promise(function(done) {
      if (!ANIM) {
        el.textContent = text;
        return done();
      }
      el.textContent = "";
      el.classList.add("caret");
      var i = 0;
      (function step() {
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(step, speed || 32);
        } else {
          setTimeout(function() {
            el.classList.remove("caret");
            done();
          }, 260);
        }
      })();
    });
  }
  function onView(el, fn, thr) {
    if (!ANIM) {
      fn();
      return;
    }
    var io = observe(function(es) {
      es.forEach(function(e) {
        if (e.isIntersecting) {
          io.disconnect();
          fn();
        }
      });
    }, { threshold: thr == null ? 0.35 : thr });
    io.observe(el);
  }
  return { off, ANIM, listen, every, observe, $, $$, sleep, clamp, ease, fmt: fmt3, countUp, hide, show, type, onView, vh };
}
function runScenes(K) {
  var off = K.off, ANIM = K.ANIM, listen = K.listen, every = K.every, observe = K.observe, $ = K.$, $$ = K.$$, sleep = K.sleep, clamp = K.clamp, ease = K.ease, fmt3 = K.fmt, countUp = K.countUp, hide = K.hide, show = K.show, type = K.type, onView = K.onView, vh = K.vh;
  var scenes = {
    audience: function(root) {
      var rows = $$("[data-rows] tbody tr", root), drawer = $("[data-drawer]", root), pick = $("[data-pick]", root), h = $("[data-health]", drawer);
      if (ANIM) {
        rows.forEach(function(r) {
          hide(r, 6);
        });
        h.dataset.count = "61";
        h.textContent = "0";
      } else {
        drawer.classList.add("open");
        pick.classList.add("hl");
      }
      return async function() {
        for (var i = 0; i < rows.length; i++) {
          show(rows[i], 320);
          await sleep(85);
        }
        await sleep(500);
        pick.classList.add("hl");
        await sleep(450);
        drawer.classList.add("open");
        await sleep(350);
        h.dataset.count = "61";
        countUp(h, 900);
      };
    },
    lanes: function(root) {
      var ev = $$("[data-ev]", root);
      if (ANIM) ev.forEach(function(e) {
        hide(e, 4);
      });
      return async function() {
        for (var i = 0; i < ev.length; i++) {
          show(ev[i]);
          await sleep(260);
        }
      };
    },
    health: function(root) {
      var h = $("[data-health]", root);
      h.dataset.count = "61";
      if (ANIM) h.textContent = "0";
      return function() {
        countUp(h, 1e3);
      };
    },
    segment: function(root) {
      var t = $("[data-type]", root), gen = $("[data-gen]", root), rules = $$("[data-rule]", root), c = $("[data-seg-count]", root), wl = $$("[data-wl] > div", root);
      var text = t.dataset.type;
      c.dataset.count = "1204";
      if (ANIM) {
        t.textContent = "";
        rules.forEach(function(r) {
          hide(r, 6);
        });
        wl.forEach(function(w) {
          hide(w, 4);
        });
        c.textContent = "0";
      } else {
        t.textContent = text;
      }
      return async function() {
        await type(t, text, 28);
        gen.style.transition = "transform .12s";
        gen.style.transform = "scale(.94)";
        await sleep(140);
        gen.style.transform = "none";
        await sleep(250);
        for (var i = 0; i < rules.length; i++) {
          show(rules[i]);
          await sleep(260);
        }
        countUp(c, 1200);
        await sleep(500);
        for (var j = 0; j < wl.length; j++) {
          show(wl[j]);
          await sleep(160);
        }
      };
    },
    avatars: function() {
      return function() {
      };
    },
    loop: function(root) {
      var nodes = $$("[data-n]", root), conns = $$("[data-c]", root), tok = $("[data-token]", root), cv = $("[data-cv]", root);
      if (ANIM) {
        nodes.forEach(function(n) {
          hide(n, 8);
        });
        conns.forEach(function(c) {
          c.style.transform = "scaleY(0)";
        });
      }
      return async function() {
        for (var i = 0; i < nodes.length; i++) {
          show(nodes[i], 360);
          await sleep(260);
          if (conns[i]) {
            conns[i].style.transition = "transform .3s ease";
            conns[i].style.transform = "scaleY(1)";
            await sleep(200);
          }
        }
        if (!ANIM || !tok.animate) return;
        var cr = cv.getBoundingClientRect();
        var stops = nodes.slice(0, 4).map(function(n2) {
          var r = n2.getBoundingClientRect();
          return r.top - cr.top + r.height / 2 - 5;
        });
        var exitR = nodes[4].getBoundingClientRect();
        stops.push(exitR.top - cr.top + exitR.height / 2 - 5);
        var kf = [];
        var n = stops.length;
        stops.forEach(function(y, i2) {
          var o = i2 / (n - 1);
          kf.push({ top: y + "px", opacity: i2 === 0 ? 0 : 1, offset: Math.max(0, o - 0.06) });
          kf.push({ top: y + "px", opacity: i2 === n - 1 ? 0 : 1, offset: o });
        });
        kf[0].offset = 0;
        kf[kf.length - 1].offset = 1;
        tok.animate(kf, { duration: 6e3, iterations: Infinity, easing: "ease-in-out" });
      };
    },
    entries: function(root) {
      var chip = $("[data-flip]", root), note = $("[data-flipnote]", root);
      return async function() {
        await sleep(1800);
        chip.className = "u-chip g";
        chip.innerHTML = "<i></i>Completed";
        note.textContent = "Push → bought a pack";
        chip.animate && chip.animate([{ transform: "scale(.9)" }, { transform: "scale(1)" }], 260);
      };
    },
    mcp: function(root) {
      var bub = $("[data-bub]", root), msg = $("[data-msg]", root), steps = $$("[data-steps] span", root), stream = $("[data-stream]", root), ans = $("[data-ans]", root), rows = $$("[data-rows2] tr", root);
      if (ANIM) {
        hide(bub, 8);
        hide(msg, 6);
        steps.forEach(function(s) {
          hide(s, 4);
        });
        stream.style.clipPath = "inset(0 100% 0 0)";
        hide(ans, 8);
        rows.forEach(function(r) {
          hide(r, 4);
        });
      }
      return async function() {
        show(bub);
        await sleep(500);
        show(msg);
        await sleep(250);
        for (var i = 0; i < steps.length; i++) {
          show(steps[i]);
          await sleep(420);
        }
        stream.style.transition = "clip-path 1.1s linear";
        stream.style.clipPath = "inset(0 0 0 0)";
        await sleep(1100);
        show(ans, 420);
        await sleep(250);
        for (var j = 0; j < rows.length; j++) {
          show(rows[j], 280);
          await sleep(120);
        }
      };
    },
    cycle: function(root) {
      var tabs = $$(".split3 span", root), panes = $$(".cyc > div", root), k = 0;
      return function() {
        if (!ANIM) return;
        every(function() {
          k = (k + 1) % 3;
          tabs.forEach(function(t, i) {
            t.classList.toggle("on", i === k);
          });
          panes.forEach(function(p3, i) {
            p3.classList.toggle("on", i === k);
          });
        }, 2600);
      };
    },
    life: function(root) {
      var counts = $$("[data-count]", root), segs = $$("[data-lbar] span", root);
      if (ANIM) {
        counts.forEach(function(c) {
          c.textContent = "0";
        });
        segs.forEach(function(s) {
          s.style.transform = "scaleX(0)";
        });
      }
      return async function() {
        counts.forEach(function(c) {
          countUp(c, 1300);
        });
        for (var i = 0; i < segs.length; i++) {
          segs[i].style.transition = "transform .45s cubic-bezier(.2,.8,.2,1)";
          segs[i].style.transform = "scaleX(1)";
          await sleep(140);
        }
      };
    },
    hold: function(root) {
      var s = root.querySelector("span");
      if (ANIM) s.style.transform = "scaleX(0)";
      return function() {
        s.style.transition = "transform 1s cubic-bezier(.2,.8,.2,1)";
        s.style.transform = "scaleX(1)";
      };
    },
    onb: function(root) {
      var t = $("[data-type]", root), found = $$("[data-found] > div", root), hold = $("[data-holders]", root);
      var text = t.dataset.type;
      hold.dataset.count = "746";
      if (ANIM) {
        t.textContent = "";
        found.forEach(function(f3) {
          hide(f3, 6);
        });
        hold.textContent = "0";
      } else {
        t.textContent = text;
      }
      return async function() {
        await type(t, text, 55);
        await sleep(300);
        for (var i = 0; i < found.length; i++) {
          show(found[i]);
          await sleep(320);
        }
        countUp(hold, 900);
      };
    },
    nomail: function(root) {
      var esp = $(".side.esp", root), ocs = $(".side.ocs", root), sends = $$(".tapsend", root);
      return function() {
        if (!ANIM) return;
        (async function run() {
          esp.classList.add("off");
          ocs.classList.add("off");
          esp.classList.remove("err");
          await sleep(900);
          sends[0].classList.add("press");
          await sleep(140);
          sends[0].classList.remove("press");
          esp.classList.remove("off");
          esp.classList.add("err");
          esp.classList.remove("shake");
          void esp.offsetWidth;
          esp.classList.add("shake");
          await sleep(1100);
          sends[1].classList.add("press");
          await sleep(140);
          sends[1].classList.remove("press");
          ocs.classList.remove("off");
          await sleep(4200);
          run();
        })();
      };
    },
    code: function(root) {
      var lines = $$(".ln", root);
      if (ANIM) root.classList.add("prep");
      return async function() {
        for (var i = 0; i < lines.length; i++) {
          lines[i].classList.add("on");
          await sleep(lines[i].textContent.trim() ? 170 : 60);
        }
      };
    },
    tl: function(root) {
      var bar = $(".tl-bar", root);
      if (ANIM) bar.style.setProperty("--p", 0);
      return function() {
        var t0 = performance.now();
        (function f3(t) {
          var p3 = Math.min(1, (t - t0) / 1600);
          bar.style.setProperty("--p", ease(p3));
          if (p3 < 1) requestAnimationFrame(f3);
        })(t0);
      };
    }
  };
  $$("[data-scene]").forEach(function(el) {
    var make = scenes[el.dataset.scene];
    if (!make) return;
    var play = make(el);
    onView(el, play, el.classList.contains("vis") ? 0.3 : 0.5);
  });
}
function initSite() {
  var K = kit(), off = K.off, ANIM = K.ANIM, listen = K.listen, every = K.every, observe = K.observe, $ = K.$, $$ = K.$$, sleep = K.sleep, clamp = K.clamp, ease = K.ease, fmt3 = K.fmt, countUp = K.countUp, hide = K.hide, show = K.show, type = K.type, onView = K.onView, vh = K.vh;
  if (ANIM) {
    var io = observe(function(es) {
      es.forEach(function(e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = Array.prototype.filter.call(el.parentElement.children, function(x) {
          return x.classList.contains("rv");
        });
        el.style.transitionDelay = Math.max(0, sibs.indexOf(el)) * 70 + "ms";
        el.classList.add("rv-in");
        el.classList.remove("rv-pre");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function(el) {
      if (el.getBoundingClientRect().top > vh * 0.92) {
        el.classList.add("rv-pre");
        io.observe(el);
      }
    });
  }
  $$("[data-count]").forEach(function(el) {
    if (el.closest("[data-scene]") || el.closest("#hKpis") || el.closest("[data-nocount]")) return;
    if (ANIM) el.textContent = "0";
    onView(el, function() {
      countUp(el, 1200);
    }, 0.6);
  });
  if (!document.getElementById("hero")) runScenes(K);
  var nav = document.getElementById("nav"), darks = $$("[data-dark]"), tk = false;
  function navFrame() {
    tk = false;
    var dark = darks.some(function(d) {
      var r = d.getBoundingClientRect();
      return r.top <= 30 && r.bottom >= 30;
    });
    if (nav) nav.classList.toggle("is-dark", dark);
  }
  listen(window, "scroll", function() {
    if (!tk) {
      tk = true;
      requestAnimationFrame(navFrame);
    }
  }, { passive: true });
  navFrame();
  return function() {
    off.forEach(function(f3) {
      f3();
    });
  };
}
function initHome() {
  var K = kit(), off = K.off, ANIM = K.ANIM, listen = K.listen, every = K.every, observe = K.observe, $ = K.$, $$ = K.$$, sleep = K.sleep, clamp = K.clamp, ease = K.ease, fmt3 = K.fmt, countUp = K.countUp, hide = K.hide, show = K.show, type = K.type, onView = K.onView, vh = K.vh;
  (function() {
    var ask = $("#hAsk"), go = $("#hGo");
    var kpis = $$("#hKpis b[data-count]"), sparks = $$("#hKpis .u-spark path.l"), feed = $$("#hFeed > div");
    if (ANIM) {
      feed.forEach(function(r) {
        hide(r, 8);
      });
      sparks.forEach(function(p3) {
        var L3 = p3.getTotalLength();
        p3.style.strokeDasharray = L3;
        p3.style.strokeDashoffset = L3;
      });
      kpis.forEach(function(b) {
        b.textContent = "0";
      });
    }
    function whenRisen(el, fn) {
      if (!ANIM) {
        fn();
        return;
      }
      var io = observe(function(es) {
        es.forEach(function(e) {
          if (e.isIntersecting) {
            io.disconnect();
            fn();
          }
        });
      }, { rootMargin: "0px 0px -50% 0px", threshold: 0 });
      io.observe(el);
    }
    whenRisen($(".hero-win"), async function() {
      await sleep(250);
      kpis.forEach(function(b) {
        countUp(b, 1400);
      });
      sparks.forEach(function(p3) {
        p3.style.transition = "stroke-dashoffset 1.4s ease";
        p3.style.strokeDashoffset = 0;
      });
      await sleep(450);
      for (var i = 0; i < feed.length; i++) {
        show(feed[i]);
        await sleep(200);
      }
      await sleep(300);
      await type(ask, "Wallets that opened but never clicked", 38);
      go.classList.add("press");
      await sleep(160);
      go.classList.remove("press");
    });
  })();
  runScenes(K);
  (function() {
    var steps = $$("[data-onb-step]"), panes = $$(".onb-pane");
    if (!steps.length || !panes.length) return;
    var cur = 0, locked = 0;
    function setStep(k) {
      if (k === cur) return;
      cur = k;
      steps.forEach(function(b, i) {
        b.classList.toggle("on", i === k);
        b.setAttribute("aria-pressed", i === k ? "true" : "false");
      });
      panes.forEach(function(p3, i) {
        p3.classList.toggle("on", i === k);
      });
      var pane = panes[k];
      if (pane && !pane.dataset.played) {
        pane.dataset.played = "1";
        $$(".u-link, .onb-ch", pane).forEach(function(r, i) {
          if (ANIM) {
            hide(r, 6);
            setTimeout(function() {
              show(r, 360);
            }, 120 + i * 160);
          }
        });
        var m = $(".onb-meter i", pane);
        if (m) {
          m.style.transform = "scaleX(0)";
          setTimeout(function() {
            m.style.transition = "transform 1s cubic-bezier(.2,.8,.2,1)";
            m.style.transform = "scaleX(.645)";
          }, 500);
        }
      }
    }
    steps.forEach(function(b, i) {
      listen(b, "click", function() {
        locked = Date.now();
        setStep(i);
      });
    });
    function onScroll() {
      if (Date.now() - locked < 900) return;
      var line = window.innerHeight * 0.55, k = 0;
      steps.forEach(function(b, i) {
        if (b.getBoundingClientRect().top < line) k = i;
      });
      setStep(k);
    }
    listen(window, "scroll", onScroll, { passive: true });
  })();
  var laneA = $("#laneA"), laneB = $("#laneB"), pillsG = $("#pills"), glow = $("#cGlow");
  var LA = laneA.getTotalLength(), LB = laneB.getTotalLength();
  var NS2 = "http://www.w3.org/2000/svg";
  var pills = [{ t: "Signed up", l: laneA, L: LA, f0: 0.44, s: 0 }, { t: "Finished setup", l: laneA, L: LA, f0: 0.22, s: 0.1 }, { t: "Deposited 12,400", l: laneB, L: LB, f0: 0.44, s: 0.05 }, { t: "Withdrew 9,800", l: laneB, L: LB, f0: 0.22, s: 0.15 }];
  pills.forEach(function(p3) {
    var g = document.createElementNS(NS2, "g"), w = p3.t.length * 7.4 + 32;
    var r = document.createElementNS(NS2, "rect");
    r.setAttribute("x", -w / 2);
    r.setAttribute("y", -14);
    r.setAttribute("width", w);
    r.setAttribute("height", 28);
    r.setAttribute("rx", 7);
    r.setAttribute("fill", "#14161B");
    r.setAttribute("stroke", "#2C2F35");
    var tx = document.createElementNS(NS2, "text");
    tx.setAttribute("y", 4.5);
    tx.setAttribute("fill", "#D8DAE0");
    tx.textContent = p3.t;
    g.appendChild(r);
    g.appendChild(tx);
    pillsG.appendChild(g);
    p3.g = g;
  });
  var recLines = $$(".rec-line");
  function concept(p3) {
    pills.forEach(function(x) {
      var e = ease(clamp((p3 - x.s) / 0.45, 0, 1)), f3 = x.f0 + (1 - x.f0) * e, pt = x.l.getPointAtLength(f3 * x.L);
      x.g.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ")");
      x.g.setAttribute("opacity", f3 > 0.97 ? 0 : f3 > 0.9 ? (0.97 - f3) / 0.07 : 1);
    });
    var TH = { "0": 0.52, "1": 0.48, "2": 0.58, "3": 0.66 };
    recLines.forEach(function(el) {
      el.classList.toggle("on", p3 >= TH[el.dataset.rl]);
    });
    glow.setAttribute("opacity", (0.35 + 0.65 * p3).toFixed(2));
  }
  var words = $$("#stmtQ span");
  var heroCopy = $("#heroCopy"), heroWin = $(".hero-win"), sats = $$(".sat");
  var rail = $$("#rail a"), chaps = ["c1", "c2", "c3", "c4", "c5"].map(function(id) {
    return document.getElementById(id);
  }).filter(Boolean);
  var cPin = $("#conceptPin"), sPin = $("#stmtPin");
  function pinProgress(el) {
    var r = el.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : r.top < 0 ? 1 : 0;
  }
  var ticking = false;
  function frame() {
    ticking = false;
    vh = window.innerHeight;
    var line = vh * 0.4, cur = "c1";
    chaps.forEach(function(el) {
      if (el.getBoundingClientRect().top < line) cur = el.id;
    });
    rail.forEach(function(a) {
      a.classList.toggle("on", a.getAttribute("href") === "#" + cur);
    });
    if (!ANIM) {
      concept(1);
      words.forEach(function(w) {
        w.classList.add("on");
      });
      return;
    }
    var wr = heroWin.getBoundingClientRect(), cr = heroCopy.getBoundingClientRect();
    var cover = clamp((cr.bottom - wr.top) / Math.max(1, cr.height), 0, 1);
    heroCopy.style.opacity = (1 - cover * 0.85).toFixed(3);
    heroCopy.style.filter = cover > 0.02 ? "blur(" + (cover * 6).toFixed(1) + "px)" : "none";
    var sp = clamp((vh - wr.top) / (vh * 0.85), 0, 1), q = ease(clamp((sp - 0.2) / 0.55, 0, 1));
    sats.forEach(function(s) {
      s.style.opacity = q.toFixed(3);
      s.style.transform = "translate(" + (+s.dataset.sx * (1 - q)).toFixed(1) + "px," + (+s.dataset.sy * (1 - q)).toFixed(1) + "px) scale(" + (0.92 + 0.08 * q).toFixed(3) + ")";
    });
    concept(pinProgress(cPin));
    var sp2 = pinProgress(sPin), lit = Math.round(clamp((sp2 - 0.05) / 0.75, 0, 1) * words.length);
    words.forEach(function(w, i) {
      w.classList.toggle("on", i < lit);
    });
  }
  listen(window, "scroll", function() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }, { passive: true });
  listen(window, "resize", function() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  });
  frame();
  return function() {
    off.forEach(function(f3) {
      f3();
    });
  };
}

// components/ns/SiteMotion.jsx
function SiteMotion() {
  const path = usePathname();
  useEffect5(() => initSite(), [path]);
  return null;
}
function HomeMotion() {
  useEffect5(() => initHome(), []);
  return null;
}

// components/ns/SiteChrome.jsx
var NAV_LINKS = [
  { href: "/compare", label: "Compare" },
  { href: "/tools", label: "Free tools" },
  { href: DOCS_URL, label: "Developers" },
  { href: "/pricing", label: "Pricing" }
];
var DOC = "https://docs.onchainsuite.com";
var FOOT = [
  [
    { title: "Platform", items: [
      { label: "Audience", href: "/platform/audience" },
      { label: "Segments", href: "/platform/segments" },
      { label: "Loops", href: "/platform/loops" },
      { label: "Intelligence MCP", href: "/platform/intelligence-mcp", tag: "New" },
      { label: "How we use data", href: "/platform/data" },
      { label: "Pricing", href: "/pricing" }
    ] },
    { title: "Company", items: [
      { label: "Team", href: "/team" },
      { label: "Our hypothesis", href: "/hypothesis" },
      { label: "Refer a team", href: "/refer", tag: "New" }
    ] }
  ],
  [
    { title: "OnchainSuite for", items: [
      { label: "Blockchain companies", href: "/for/blockchain-companies" },
      { label: "Mainstream companies", href: "/for/mainstream-companies" }
    ] },
    { title: "Switching from", items: [
      { label: "Klaviyo", href: "/compare/klaviyo" },
      { label: "Customer.io", href: "/compare/customer-io" },
      { label: "Braze", href: "/compare/braze" },
      { label: "Brevo", href: "/compare/brevo" },
      { label: "SendGrid", href: "/compare/sendgrid" },
      { label: "Dotdigital", href: "/compare/dotdigital" },
      { label: "EmailOctopus", href: "/compare/emailoctopus" }
    ] }
  ],
  [
    { title: "Integrations", items: [
      { label: "In-app SDK", href: `${DOC}/integrations/in-app-notifications` },
      { label: "Mobile push", href: `${DOC}/integrations/in-app-notifications` },
      { label: "Server API", href: `${DOC}/integrations/server-api` },
      { label: "Webhooks", href: `${DOC}/api/webhooks` },
      { label: "Custom events", href: `${DOC}/integrations/custom-events` },
      { label: "Forms", href: `${DOC}/integrations/forms` },
      { label: "Wallet and contract data", href: `${DOC}/integrations/wallet-and-contract-data` },
      { label: "CSV and JSON import", href: `${DOC}/audience/imports-and-exports` }
    ] }
  ],
  [
    { title: "Resources", items: [
      { label: "Compare", href: "/compare" },
      { label: "Free tools", href: "/tools" },
      { label: "Docs", href: DOC },
      { label: "Help centre", href: `${DOC}/help/faq` },
      { label: "Troubleshooting", href: `${DOC}/help/troubleshooting` },
      { label: "Hire an expert", href: "/pricing#cmp-h" },
      { label: "Trust centre", href: "/platform/data" }
    ] },
    { title: "Legal", items: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Data processing agreement", href: "/dpa" },
      { label: "Sub-processors", href: "/subprocessors" },
      { label: "Cookies", href: "/cookies" }
    ] }
  ]
];
var slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
var tagged = (href, label) => {
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}source=footer_${slug(label)}${hash ? "#" + hash : ""}`;
};
function Logo({ dark = false }) {
  return <Link className="logo" href="/" aria-label="OnchainSuite home">
      <svg className="mark" aria-hidden="true"><use href="#ocs-mark" fill={dark ? "#FFFFFF" : "url(#mg)"} /></svg>
      OnchainSuite
    </Link>;
}
function SiteChrome({ children }) {
  return <div className="ns">
      <Sprite />
      <div className="bar"><Link href="/#platform"><b>OnchainSuite v2.7</b> adds lifecycle stages, health scores and holdouts<span>→</span></Link></div>
      <header className="nav" id="nav">
        <div className="nav-in">
          <Logo />
          <NavMenu />
          <div className="acts">
            <a className="btn" href={APP_URL}>Sign in</a>
            <Link className="btn solid" href="/early-access">Book a walkthrough</Link>
            <MobileMenu links={NAV_LINKS} />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="dark" data-dark>
        <div className="wrap" style={{ border: 0 }}>
          <div className="foot">
            <div><Logo dark /></div>
            {FOOT.map((col, ci) => <div key={ci} className="foot-col">
                {col.map((g) => <div key={g.title} className="foot-g">
                    <h6>{g.title}</h6>
                    {g.items.map((l) => {
    const inner = <>{l.label}{l.tag && <em className="foot-tag">{l.tag}</em>}</>;
    return l.href.startsWith("http") ? <a key={l.label} href={tagged(l.href, l.label)} target="_blank" rel="noreferrer">{inner}<span className="foot-ext" aria-hidden="true">↗</span></a> : <Link key={l.label} href={tagged(l.href, l.label)}>{inner}</Link>;
  })}
                  </div>)}
              </div>)}
          </div>
          <div className="trust-row">
            <span className="trust-b"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l5.5 2v4c0 3.4-2.3 6-5.5 7-3.2-1-5.5-3.6-5.5-7v-4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 8.2l1.7 1.7 3.3-3.6" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>UK GDPR compliant</span>
            <span className="trust-b"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5 6.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.3" /></svg>Registered with the ICO</span>
          </div>
          <div className="legal">
            <span>{COMPANY.legalName}, company number 17370357, registered in {COMPANY.jurisdiction}.</span>
            <span>We read public blockchain data and never hold funds or private keys.</span>
          </div>
        </div>
      </footer>
      <SiteMotion />
      <CalBooking />
    </div>;
}

// components/ns/CloseArt.jsx
var B = "#1727E0";
var O = "#FF6828";
var N = "#010F31";
var L = "#DEE0E3";
var T = "#585D65";
var G = "#17A66B";
var R = "#E5484D";
var f = { fontFamily: "Instrument Sans, Inter, sans-serif" };
var mono = { fontFamily: "Geist Mono, JetBrains Mono, monospace" };
var WALLET_ROWS = [
  { name: "Josh Miller", ini: "JM", av: "#3B6BFF", score: 82, color: G, stage: "Active", bg: "#E9F7F0" },
  { name: "0x9a2e…e41", ini: "?", av: "#9DA1A8", score: 38, color: R, stage: "At risk", bg: "#FDECEC", wallet: true },
  { name: "Sarah Bennett", ini: "S", av: "#B54FD8", score: 61, color: O, stage: "Watch", bg: "#FFF1EA" }
];
var PEOPLE_ROWS = [
  { name: "Olivia Hughes", ini: "OH", av: "#3B6BFF", score: 82, color: G, stage: "Active", bg: "#E9F7F0" },
  { name: "Daniel Price", ini: "DP", av: "#9DA1A8", score: 38, color: R, stage: "At risk", bg: "#FDECEC", wallet: true },
  { name: "Megan Ward", ini: "MW", av: "#B54FD8", score: 61, color: O, stage: "Watch", bg: "#FFF1EA" }
];
var STEPS = [
  { x: 28, w: 96, label: "Health below 40", fill: "#FFF1EA", stroke: "#FFD2BD", color: O },
  { x: 134, w: 90, label: "Email + in-app", fill: "#EEF0FF", stroke: "#C9D0FF", color: B },
  { x: 234, w: 174, label: "Stops when they deposit", fill: "#E9F7F0", stroke: "#BFE8D3", color: G }
];
function CloseArt({ mainstream = false }) {
  const ROWS2 = mainstream ? PEOPLE_ROWS : WALLET_ROWS;
  const steps = mainstream ? STEPS.map((x, i) => i === 1 ? { ...x, label: "Email" } : i === 2 ? { ...x, label: "Stops when they upgrade" } : x) : STEPS;
  return <div className="tool-art close-art rv" aria-hidden="true">
      <svg viewBox="0 0 432 330" preserveAspectRatio="xMidYMid meet" style={f}>
        <rect x={16} y={18} width={400} height={180} rx={12} fill="#fff" stroke={L} />
        <text x={32} y={44} fontSize={13} fontWeight={600} fill={N}>Customers about to leave</text>
        <rect x={334} y={30} width={68} height={20} rx={10} fill="#F5F6F7" /><text x={368} y={44} fontSize={10.5} fill={T} textAnchor="middle">This week</text>
        <line x1={16} y1={60} x2={416} y2={60} stroke={L} />
        {ROWS2.map((r, i) => {
    const y = 68 + i * 42;
    return <g key={r.name} className="ta-pop" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
              {r.wallet && <rect x={22} y={y} width={388} height={36} rx={8} fill="#FFF7F7" className="pa-pulse" />}
              <circle cx={44} cy={y + 18} r={11} fill={r.av} />
              <text x={44} y={y + 22} fontSize={9} fill="#fff" textAnchor="middle" fontWeight={600}>{r.ini}</text>
              <text x={62} y={y + 22} fontSize={12} fill={N} fontWeight={500} style={r.name.startsWith("0x") ? mono : f}>{r.name}</text>
              <text x={196} y={y + 22} fontSize={12} fill={r.color} fontWeight={600} textAnchor="end">{r.score}</text>
              <rect x={206} y={y + 14} width={96} height={7} rx={3.5} fill="#ECEDEF" />
              <rect x={206} y={y + 14} width={96 * r.score / 100} height={7} rx={3.5} fill={r.color} className="ta-grow" style={{ animationDelay: `${0.35 + i * 0.15}s` }} />
              <rect x={318} y={y + 7} width={78} height={22} rx={11} fill={r.bg} />
              <text x={357} y={y + 22} fontSize={11} fill={r.color} fontWeight={500} textAnchor="middle">{r.stage}</text>
            </g>;
  })}
        <path d="M216 198 V230" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
        <path d="M211 225 L216 231 L221 225" fill="none" stroke="#C9D0FF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <g className="ta-pop" style={{ animationDelay: "0.8s" }}>
          <rect x={16} y={234} width={400} height={80} rx={12} fill="#fff" stroke={L} />
          <text x={28} y={256} fontSize={12} fontWeight={600} fill={N}>Loop: reach them before they leave</text>
          {steps.map((s, i) => <g key={s.label} className="ta-pop" style={{ animationDelay: `${1 + i * 0.2}s` }}>
              <rect x={s.x} y={270} width={s.w} height={30} rx={8} fill={s.fill} stroke={s.stroke} />
              <text x={i === 2 ? s.x + 30 : s.x + s.w / 2} y={289} fontSize={11} fill={s.color} fontWeight={500} textAnchor={i === 2 ? "start" : "middle"}>{s.label}</text>
              {i === 2 && <path d={`M${s.x + 12} 284l3 3 6-7`} fill="none" stroke={G} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              {i < 2 && <path d={`M${s.x + s.w + 2} 285 H${s.x + s.w + 10}`} stroke="#B3B5BA" strokeWidth={1.5} />}
            </g>)}
        </g>
      </svg>
    </div>;
}

// components/ns/HomeBody.jsx
function HomeBody() {
  return <>

<div className="wrap">
  
  <section className="hero" id="hero">
    <div className="hero-copy" id="heroCopy">
      <a className="pill load" style={{ animationDelay: ".05s" }} href="#concept">Meet the Lifecycle Intelligence Engine <span>›</span></a>
      <h1 className="h1 load" style={{ animationDelay: ".12s" }}>Retention built on what your users do.</h1>
      <p className="sub load" style={{ animationDelay: ".22s" }}>On-chain for blockchain companies.<br />In your product for everyone else.</p>
      <div className="ctas load" style={{ animationDelay: ".32s" }}><a className="btn lg" href="/pricing">See pricing</a><a className="btn solid lg" href="/early-access">Book a walkthrough</a></div>
    </div>
    <div className="hero-stage" id="heroStage">
      <div className="sat s1" data-sx="160" data-sy="40"><div className="u u-card" style={{ padding: "12px 14px", boxShadow: "0 18px 40px -20px rgba(16,24,40,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "13px" }}><svg width="14" height="14" style={{ color: "#1727E0" }}><use href="#a-bolt" /></svg>Dormant 30d win-back<span className="u-chip g" style={{ marginLeft: "auto" }}><i />Live</span></div>
        <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#585D65" }}><span><b style={{ color: "#010F31", fontSize: "16px", display: "block" }}>978</b>entries · 30d</span><span><b style={{ color: "#010F31", fontSize: "16px", display: "block" }}>74</b>converted on-chain</span></div></div></div>
      <div className="sat s2" data-sx="140" data-sy="-60"><div className="u u-card" style={{ padding: "12px 14px", boxShadow: "0 18px 40px -20px rgba(16,24,40,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "13px" }}><svg width="14" height="14" style={{ color: "#1727E0" }}><use href="#a-dash" /></svg>Dashboard<span className="u-chip" style={{ marginLeft: "auto", background: "#F5F6F7", color: "#585D65" }}>30d</span></div>
        <div style={{ display: "grid", gap: "8px", marginTop: "10px", fontSize: "11.5px", color: "#585D65" }}>
          <span>Wallets reached<span style={{ display: "flex", alignItems: "baseline", gap: "6px" }}><b style={{ color: "#010F31", fontSize: "16px" }}>18,204</b><span style={{ color: "#1727E0" }}>↗ 12.4%</span></span></span>
          <span>On-chain conversions<span style={{ display: "flex", alignItems: "baseline", gap: "6px" }}><b style={{ color: "#010F31", fontSize: "16px" }}>1,164</b><span style={{ color: "#1727E0" }}>↗ 22.8%</span></span></span></div>
        <svg className="u-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><path className="a" d="M0 28 L12 27 L25 24 L37 25 L50 19 L62 17 L75 13 L87 11 L100 5 L100 34 L0 34Z" /><path className="l" d="M0 28 L12 27 L25 24 L37 25 L50 19 L62 17 L75 13 L87 11 L100 5" /></svg></div></div>
      <div className="sat s3" data-sx="-170" data-sy="60"><div className="u u-card" style={{ padding: "12px", boxShadow: "0 18px 40px -20px rgba(16,24,40,.3)" }}>
        <div style={{ font: "500 10.5px 'Geist Mono',monospace", color: "#1727E0", letterSpacing: ".04em" }}>IN-APP MESSAGE · 0x9a2e…e41</div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "9px" }}><span style={{ width: "30px", height: "30px", borderRadius: "7px", background: "#1727E0", display: "grid", placeItems: "center", flex: "none" }}><svg className="mark" style={{ width: "9px", height: "14px" }}><use href="#ocs-mark" fill="#fff" /></svg></span><div><b style={{ fontSize: "13px", display: "block" }}>212 USDC in rewards is waiting</b><span style={{ fontSize: "12px", color: "#585D65" }}>Claim it in one step.</span></div></div></div></div>

      <div className="hero-win"><div className="winbar" aria-hidden="true"><i /><i /><i /></div>
        <div className="u u-app" style={{ height: "calc(100% - 32px)" }} role="img" aria-label="OnchainSuite Home: a greeting, a question typed to the Intelligence MCP, four headline numbers and recent on-chain activity arriving.">
          <aside className="u-side"><div className="lg"><svg className="mark"><use href="#ocs-mark" fill="url(#mg)" /></svg></div><div className="u-nav on"><svg><use href="#a-home" /></svg>Home</div><div className="u-nav"><svg><use href="#a-camp" /></svg>Campaigns</div><div className="u-nav"><svg><use href="#a-aud" /></svg>Audience</div><div className="u-nav"><svg><use href="#a-brain" /></svg>Intelligence MCP</div><div className="u-nav"><svg><use href="#a-dash" /></svg>Dashboard</div><div className="u-nav"><svg><use href="#a-data" /></svg>Data</div><div className="u-user"><span className="u-av" style={{ background: "#E04E12" }}>EC</span><div><b>Emma Carter</b><small>Acme</small></div><span className="u-ver">v2.7</span></div></aside>
          <div className="u-main">
            <div className="u-top">Home / <b>Home</b><span className="u-search"><svg width="13" height="13"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" /></svg>Search…<kbd>⌘K</kbd></span></div>
            <div className="u-body">
              <div className="u-card" style={{ padding: "16px 18px" }}><div className="u-h" style={{ fontSize: "19px" }}>Good afternoon, Emma.</div><p className="u-p">Here is what moved across your workspace today.</p></div>
              <div className="u-ask"><svg><use href="#a-brain" /></svg><span className="t" id="hAsk" data-ph="Ask the Intelligence MCP anything, or describe a campaign to build…" /><span className="u-go" id="hGo"><svg width="14" height="14"><use href="#a-up" /></svg></span></div>
              <div className="u-stats" id="hKpis">
                <div className="u-card u-stat"><small>Active wallets</small><b data-count="128540">128,540</b><span>vs last 30d <span className="u-delta">▲ 12.4%</span></span><svg className="u-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><path className="a" d="M0 26 L14 24 L28 27 L42 21 L57 18 L71 15 L85 12 L100 6 L100 34 L0 34Z" /><path className="l" d="M0 26 L14 24 L28 27 L42 21 L57 18 L71 15 L85 12 L100 6" /></svg></div>
                <div className="u-card u-stat"><small>Messages sent</small><b data-count="12480">12,480</b><span>vs last 30d <span className="u-delta">▲ 4.1%</span></span><svg className="u-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><path className="a" d="M0 22 L14 20 L28 23 L42 18 L57 20 L71 15 L85 14 L100 13 L100 34 L0 34Z" /><path className="l" d="M0 22 L14 20 L28 23 L42 18 L57 20 L71 15 L85 14 L100 13" /></svg></div>
                <div className="u-card u-stat"><small>Open rate</small><b data-count="42.3" data-dec="1" data-suf="%">42.3%</b><span>vs last 30d <span className="u-delta">▲ 2.7%</span></span><svg className="u-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><path className="a" d="M0 21 L14 19 L28 22 L42 18 L57 21 L71 17 L85 18 L100 14 L100 34 L0 34Z" /><path className="l" d="M0 21 L14 19 L28 22 L42 18 L57 21 L71 17 L85 18 L100 14" /></svg></div>
                <div className="u-card u-stat"><small>Converted on-chain</small><b data-count="3921">3,921</b><span>vs last 30d <span className="u-delta">▲ 22.7%</span></span><svg className="u-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><path className="a" d="M0 26 L14 25 L28 27 L42 22 L57 21 L71 18 L85 15 L100 9 L100 34 L0 34Z" /><path className="l" d="M0 26 L14 25 L28 27 L42 22 L57 21 L71 18 L85 15 L100 9" /></svg></div>
              </div>
              <div style={{ fontWeight: "600", fontSize: "14px", marginTop: "2px" }}>Recent on-chain activity</div>
              <div className="u-card u-feed" id="hFeed">
                <div><i style={{ background: "#17A66B" }} /><b>Swap</b><span className="u-addr">0x24e6…2dae</span><span>swapped 4.2 ETH → USDC</span><span className="ch">Base</span><time>14:36 UTC</time></div>
                <div><i style={{ background: "#E8A317" }} /><b>Unstake</b><span className="u-addr">0x9352…a881</span><span>unstaked 12 ETH from the vault</span><span className="ch">Ethereum</span><time>14:12 UTC</time></div>
                <div><i style={{ background: "#2F94FF" }} /><b>Mint</b><span className="u-addr">0x5a8e…82d0</span><span>minted 3 items from Zora drop</span><span className="ch">Base</span><time>13:58 UTC</time></div>
                <div><i style={{ background: "#17A66B" }} /><b>Deposit</b><span className="u-addr">0x48cc…ef8d</span><span>first deposit of $1,840 USDC</span><span className="ch">Base</span><time>13:30 UTC</time></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div className="logos" aria-label="Paying customers">
    <div className="rv"><img src="/site/logos/predict-street.png" alt="" />Predict Street</div><div className="rv"><img src="/site/logos/yauga.jpg" alt="" />Yauga</div><div className="rv"><img src="/site/logos/rehitage.svg" alt="" />Rehitage</div><div className="rv"><img src="/site/logos/surgence.jpg" alt="" />Surgence Labs</div>
  </div>

  <section className="state" id="platform" aria-labelledby="platform-h">
    <h2 className="h2 rv" id="platform-h">The customer record your email tool never had. <span>OnchainSuite reads your app and your contracts, places every customer in a lifecycle stage, and shows you who needs a message before they leave.</span></h2>
  </section>
  <div className="plat">
    <div className="rail"><nav aria-label="Platform" id="rail">
      <a href="#c1" className="on">Know every customer</a><a href="#c2">Build audiences</a><a href="#c3">Run Loops</a><a href="#c4">Ask in plain English</a><a href="#c5">Retain and win back</a>
    </nav></div>
    <div>
      
      <article className="chap" id="c1">
        <div className="chap-h"><h3 className="h3 rv">Every customer sits on one record, with wallets, emails and app accounts side by side, <span>so you can see who each person is and how to reach them.</span></h3><a className="chap-more" href="/platform/audience">More on Audience →</a></div>
        <div className="vis live" data-scene="audience"><div className="stagebox"><div className="ui-pane u" role="img" aria-label="The Audience screen: contacts arrive one by one, then one wallet's record opens with its health score and reachable channels.">
          <div className="u-body" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}><div><div className="u-h">Audience</div><p className="u-p">Wallet-first identity. Segments are channel-aware, so reachable in-app is a different filter from has email.</p></div></div>
            <div className="u-stats"><div className="u-card u-stat"><small>Total contacts</small><b>48</b><span>40 with a wallet · 8 email-only</span></div><div className="u-card u-stat"><small>Email-reachable</small><b>40</b><span>have a linked email</span></div><div className="u-card u-stat"><small>Push-reachable</small><b>32</b><span>signed-in devices</span></div><div className="u-card u-stat"><small>Suppressed</small><b>3</b><span>unsubscribed or bounced</span></div></div>
            <div><span className="u-tabs"><span className="on">Contacts <i>48</i></span><span>Lists <i>4</i></span><span>Tags <i>5</i></span><span>Segments <i>7</i></span><span>Suppressed <i>3</i></span></span></div>
            <div className="u-card"><table className="u-tbl" data-rows><thead><tr><th>Contact</th><th>Reachable via</th><th>Email</th><th className="num">Lifetime</th><th>Last active</th></tr></thead><tbody>
              <tr><td>maya.eth <span className="u-addr">0x24e6…2dae</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span><span><svg><use href="#a-at" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">0.4 ETH</td><td>2h ago</td></tr>
              <tr data-pick><td><span className="u-addr">0x48cc…ef8d</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-addr">wallet1@gmail.com</td><td className="num">4.1 ETH</td><td>6d ago</td></tr>
              <tr><td><span className="u-addr">0x9352…a881</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">7.8 ETH</td><td>1d ago</td></tr>
              <tr><td>sora.eth <span className="u-addr">0x9188…b68d</span></td><td><span className="u-ch"><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">—</td><td className="num">11.5 ETH</td><td>12d ago</td></tr>
              <tr><td><span className="u-addr">0x5a8e…82d0</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span></span></td><td className="u-addr">wallet4@gmail.com</td><td className="num">15.2 ETH</td><td>48d ago</td></tr>
              <tr><td className="u-muted">No wallet <span className="u-chip n" style={{ height: "18px" }}>Email only</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span></span></td><td className="u-addr">subscriber5@example.com</td><td className="num u-muted">—</td><td>5h ago</td></tr>
              <tr><td>tunde.eth <span className="u-addr">0x0dda…08b3</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">22.6 ETH</td><td>2h ago</td></tr>
            </tbody></table></div>
          </div>
          <div className="u-drawer" data-drawer>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px" }}><svg width="15" height="15" style={{ color: "#1727E0" }}><use href="#a-at" /></svg>Wallet<span style={{ marginLeft: "auto", color: "#767B83" }}>✕</span></div>
            <span className="u-addr">0x48cc…ef8d</span>
            <div className="u-kv2"><div className="u-card"><small>Lifetime value</small><b>4.1 ETH</b></div><div className="u-card"><small>Home chain</small><b>Ethereum</b></div></div>
            <h6>Health</h6>
            <div className="u-card u-health"><div className="sc"><b data-health>61</b><span>Watch</span><em>Activated</em></div><ul><li><span>Active 6d ago</span><span>+38</span></li><li><span>Reachable on 2 channels</span><span>+12</span></li><li><span>4.1 ETH lifetime</span><span>+11</span></li></ul></div>
            <h6>Linked channels</h6>
            <div className="u-link"><span className="ic"><svg><use href="#a-mail" /></svg></span>Email<em className="u-addr">wallet1@gmail.com</em><svg className="ok"><use href="#a-check" /></svg></div>
            <div className="u-link"><span className="ic"><svg><use href="#a-phone" /></svg></span>In-app push<em>device signed in</em><svg className="ok"><use href="#a-check" /></svg></div>
            <div className="u-link"><span className="ic"><svg><use href="#a-at" /></svg></span>X<em>not linked</em></div>
          </div>
        </div></div></div>
        <div className="pair">
          <div><p className="h4 rv">What someone did in your app and on the chain is read together, <span>instead of being pieced together from two tools.</span></p>
            <div className="lanes" data-scene="lanes"><div className="lane"><h5>In your app</h5><div data-ev><span>Completed setup</span><em>3 July</em></div><div data-ev><span>Last opened the app</span><em>58 days ago</em></div></div>
              <div className="join">same customer</div>
              <div className="lane"><h5>On the chain</h5><div data-ev><span>Deposited 12,400 USDC</span><em>66 days ago</em></div><div data-ev><span className="warn">Withdrew 9,800 USDC</span><em>61 days ago</em></div></div></div></div>
          <div><p className="h4 rv">Each record shows which channels reach that person <span>and how healthy their relationship with you is.</span></p>
            <div className="mini pad u" data-scene="health" style={{ display: "grid", gap: "10px" }}>
              <div className="u-health" style={{ padding: "0" }}><div className="sc"><b data-health>61</b><span>Watch</span><em>Activated</em></div><ul><li><span>Active 6d ago</span><span>+38</span></li><li><span>Reachable on 2 channels</span><span>+12</span></li><li><span>4.1 ETH lifetime</span><span>+11</span></li></ul></div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}><span className="u-chip g"><i />Email</span><span className="u-chip g"><i />In-app push</span><span className="u-chip n">X not linked</span></div></div></div>
        </div>
      <div className="chap-bridge"><p className="bridge rv"><a href="#c2">Once everyone is on one record, you can choose who to talk to.<span aria-hidden="true">↓</span></a></p></div></article>

      
      <article className="chap" id="c2">
        <div className="chap-h"><h3 className="h3 rv">Describe an audience in a sentence and OnchainSuite writes the rules, <span>then shows a live count while you edit.</span></h3><a className="chap-more" href="/platform/segments">More on Segments →</a></div>
        <div className="vis live" data-scene="segment"><div className="stagebox"><div className="ui-pane u" style={{ background: "#FBFBFC" }} role="img" aria-label="The segment builder: a sentence is typed, rules for wallet balance over 10 and has not staked in 30 days appear, and a live preview counts up to 1,204 wallets.">
          <div className="u-body" style={{ padding: "18px 20px" }}><div className="u-seg">
            <div className="u-card" style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", fontSize: "14px" }}>New segment<span className="u-chip n">Draft</span></div>
              <div><p className="u-label">Describe your audience</p><div className="u-desc"><svg><use href="#a-spark" /></svg><span className="t" data-type="Base wallets over 10 ETH that have not staked in 30 days" /><span className="u-btn p" data-gen><svg><use href="#a-spark" /></svg>Generate</span></div>
                <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#767B83" }}>The prompt becomes editable rules below, so you can tweak anything by hand.</p></div>
              <div className="u-rule" data-rule><span>Where</span><span className="u-sel">Wallet balance</span><span className="u-sel">is greater than</span><span className="u-sel v">10</span><span style={{ color: "#767B83" }}>✕</span></div>
              <div className="u-rule" data-rule><span>And</span><span className="u-sel">Staked</span><span className="u-sel hot">has NOT done</span><span className="u-sel">last 30 days</span><span style={{ color: "#767B83" }}>✕</span></div>
              <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#585D65" }}><span>+ Add rule</span><span>+ Add group</span></div>
            </div>
            <div className="u-card"><div style={{ fontWeight: "600", fontSize: "14px" }}>Live preview</div>
              <div className="u-big" style={{ marginTop: "12px" }} data-seg-count>1,204</div><div style={{ fontSize: "11.5px", color: "#767B83" }}>matching wallets · updates as you edit</div>
              <div className="u-wl" data-wl><div><span className="ens-ic" style={{ background: "#E5484D" }} />maya.eth <span className="u-addr">0x1A2b…9F3e</span></div><div><span className="ens-ic" style={{ background: "#2F94FF" }} /><span className="u-addr">0x8Cc4…21aB</span></div><div><span className="ens-ic" style={{ background: "#E8A317" }} />leo.eth <span className="u-addr">0xF31d…77c0</span></div></div>
              <div style={{ marginTop: "14px" }}><span className="u-btn"><svg><use href="#a-camp" /></svg>Create campaign from segment</span></div></div>
          </div></div>
        </div></div></div>
        <div className="pair">
          <div><p className="h4 rv">You can find the people who stopped doing something, <span>which is where retention starts and where email tools see nothing.</span></p>
            <div className="rule">Wallet balance <b>&gt; 10 ETH</b><br />and has <b>not staked</b> in the last <b>30 days</b></div></div>
          <div><p className="h4 rv">You see how many wallets match and who they are <span>before you send anything.</span></p>
            <div className="mini pad u" data-scene="avatars" style={{ display: "flex", alignItems: "center", gap: "14px" }}><svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true"><circle className="ring" cx="43" cy="43" r="22" fill="none" stroke="#1727E0" strokeOpacity=".35" /><circle className="ring r2" cx="43" cy="43" r="22" fill="none" stroke="#1727E0" strokeOpacity=".35" /><circle cx="43" cy="43" r="18" fill="#F0F4FF" /><text x="43" y="47" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1727E0" fontFamily="Instrument Sans">1,204</text></svg>
              <div style={{ display: "grid", gap: "6px" }}><span className="u-chip b bob">maya.eth</span><span className="u-chip b bob d2">0x8Cc4…21aB</span><span className="u-chip b bob d3">leo.eth</span></div></div></div>
        </div>
      <div className="chap-bridge"><p className="bridge rv"><a href="#c3">An audience does nothing until something sends to it, and that is what Loops are for.<span aria-hidden="true">↓</span></a></p></div></article>

      
      <article className="chap" id="c3">
        <div className="chap-h"><h3 className="h3 rv">Loops start from something on the chain and stop the moment the customer acts. <span>A Loop is an automated customer journey that waits, sends by email or in-app, and ends when the action is recorded.</span></h3><a className="chap-more" href="/platform/loops">More on Loops →</a></div>
        <div className="vis live" data-scene="loop"><div className="stagebox"><div className="ui-pane u" style={{ background: "#FBFBFC" }} role="img" aria-label="The Loop builder for a dormant 30-day win-back: a goes dormant trigger, an email, a three-day wait and an in-app message draw in, and a customer moves through them.">
          <div className="u-top" style={{ gap: "12px" }}><span>← Loops</span><b style={{ fontSize: "14px" }}>Dormant 30d win-back</b><span className="u-chip g"><i />Ready</span><span>4 nodes · 0 issues</span></div>
          <div className="u-body" style={{ padding: "12px", height: "calc(100% - 44px)" }}><div className="u-flow">
            <div className="u-card u-pal"><h6>On-chain triggers · 6</h6>
              <div className="u-trig"><i>⚡</i><div><b>On-chain event</b><small>Wallet interacts with a contract</small></div></div>
              <div className="u-trig"><i>◇</i><div><b>Holder acquired</b><small>New wallet mints or buys in</small></div></div>
              <div className="u-trig"><i>⇄</i><div><b>Swap completed</b><small>DEX trade or token exchange</small></div></div>
              <div className="u-trig"><i>💧</i><div><b>Liquidity added</b><small>Deposits into your pools</small></div></div>
              <div className="u-trig"><i>⇣</i><div><b>Capital withdrawn</b><small>Burns, unstakes or withdraws</small></div></div></div>
            <div className="u-cv" data-cv><span className="u-token" data-token />
              <div className="u-node trig" data-n><span className="ic" style={{ background: "#FFE4D6", color: "#E04E12" }}><svg><use href="#a-bolt" /></svg></span><div><small>Trigger</small><b>Goes dormant</b></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-mail" /></svg></span><div><small>Send email</small><b>Email · "We miss you"</b><div className="d">Email or reusable template</div></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-wait" /></svg></span><div><small>Wait</small><b>Wait 3 days</b><div className="d">Pause before the next step</div></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-phone" /></svg></span><div><small>Send in-app</small><b>Push · "Your Hammers are waiting"</b><div className="d">Notification in your app</div></div></div>
              <div className="u-conn" data-c />
              <span className="u-exit" data-n>Exit flow</span>
            </div>
          </div></div>
        </div></div></div>
        <div className="pair">
          <div><p className="h4 rv">Six on-chain triggers sit next to the usual form, list and email ones, <span>so a Loop can start from a withdrawal as easily as a sign-up.</span></p>
            <div className="chips"><span className="bob"><i>⚡</i>Goes dormant</span><span className="bob d2"><i>⇣</i>Capital withdrawn</span><span className="bob d3"><i>◇</i>Holder acquired</span><span className="bob d4"><i>⇄</i>Swap completed</span><span className="bob d5"><i>💧</i>Liquidity added</span></div></div>
          <div><p className="h4 rv">Every entry is accounted for, <span>so you can see who completed, who is still waiting and who left.</span></p>
            <div className="mini u" data-scene="entries"><table className="u-tbl"><tbody>
              <tr><td>maya.eth</td><td><span className="u-chip g" data-st><i />Completed</span></td><td className="u-muted">Email → bought a pack</td><td className="u-muted">14 min ago</td></tr>
              <tr><td className="u-addr">0x3F4a…8a21</td><td><span className="u-chip b" data-flip><i />In flow</span></td><td className="u-muted" data-flipnote>Waiting · 1 hour</td><td className="u-muted">38 min ago</td></tr>
              <tr><td>leo.eth</td><td><span className="u-chip g"><i />Completed</span></td><td className="u-muted">Email → bought a pack</td><td className="u-muted">2h ago</td></tr>
              <tr><td className="u-addr">0x91Cb…4e07</td><td><span className="u-chip n"><i />Exited</span></td><td className="u-muted">Unsubscribed</td><td className="u-muted">5h ago</td></tr>
            </tbody></table></div></div>
        </div>
      <div className="chap-bridge"><p className="bridge rv"><a href="#c4">When you are not sure who needs a Loop, you can ask.<span aria-hidden="true">↓</span></a></p></div></article>

      
      <article className="chap" id="c4">
        <div className="chap-h"><h3 className="h3 rv">Ask your data a question in plain English, <span>and the Intelligence MCP turns it into a query across your app and your contracts, so nobody has to write SQL.</span></h3><a className="chap-more" href="/platform/intelligence-mcp">More on the Intelligence MCP →</a></div>
        <div className="vis live" data-scene="mcp"><div className="stagebox"><div className="ui-pane u" role="img" aria-label="The Intelligence MCP answering wallets that opened but never clicked: the question is sent, the answer streams in and a table of four wallets appears.">
          <div className="u-body" style={{ padding: "18px 20px", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="u-h">Intelligence MCP</div><span style={{ marginLeft: "auto", fontSize: "11.5px", color: "#767B83" }}>Last synced 1m ago · 746 wallets</span><span className="u-btn">Sync wallets</span></div>
            <div><span className="u-tabs" style={{ background: "none", padding: "0" }}><span style={{ boxShadow: "inset 0 -2px 0 #1727E0", borderRadius: "0", color: "#010F31" }}>Chat</span><span>Segments <i>7</i></span></span></div>
            <div className="u-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "420px" }}>
              <div className="u-bub" data-bub>Wallets that opened but never clicked</div>
              <div className="u-msg" data-msg><span className="bot"><svg><use href="#a-brain" /></svg></span><div>
                <div className="u-steps" data-steps><span><svg><use href="#a-check" /></svg>Read email and push engagement</span><span><svg><use href="#a-check" /></svg>Joined 746 wallets across both lanes</span></div>
                <div data-stream>Here&rsquo;s what I found for <b>&ldquo;Wallets that opened but never clicked&rdquo;</b>: the wallets that engaged, and how that engagement trends week over week.</div>
                <div className="u-ans" data-ans><div className="bar"><span className="on">Table</span><span>Chart</span><span>SQL</span></div>
                  <table className="u-tbl"><thead><tr><th>Wallet</th><th className="num">Opens</th><th className="num">Clicks</th><th className="num">Last seen</th></tr></thead><tbody data-rows2>
                    <tr><td><span className="ens-ic" style={{ background: "#E5484D" }} />maya.eth <span className="u-addr">0x1A2b…9F3e</span></td><td className="num">4</td><td className="num">0</td><td className="num">Jul 22</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#8E4FD8" }} /><span className="u-addr">0x50E8…F401</span></td><td className="num">3</td><td className="num">0</td><td className="num">Jul 21</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#D84FB5" }} />dami.eth <span className="u-addr">0xDD02…B2Cd</span></td><td className="num">3</td><td className="num">0</td><td className="num">Jul 21</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#17A66B" }} /><span className="u-addr">0xA27d…1e2F</span></td><td className="num">2</td><td className="num">0</td><td className="num">Jul 19</td></tr>
                  </tbody></table>
                  <div className="acts"><span className="u-btn"><svg><use href="#a-seg" /></svg>Save as segment</span><span className="u-btn"><svg><use href="#a-camp" /></svg>Create campaign</span><span className="u-btn" style={{ borderColor: "transparent" }}>Export CSV</span></div></div>
              </div></div>
            </div>
          </div>
        </div></div></div>
        <div className="pair">
          <div><p className="h4 rv">Every answer comes as a table, a chart and the SQL behind it, <span>so you can check the working.</span></p>
            <div data-scene="cycle"><div className="split3" aria-hidden="true"><span className="on">Table</span><span>Chart</span><span>SQL</span></div>
              <div className="cyc u" aria-hidden="true">
                <div className="on"><table className="u-tbl" style={{ fontSize: "12px" }}><tbody><tr><td>maya.eth</td><td className="num">4 opens</td><td className="num">0 clicks</td></tr><tr><td className="u-addr">0x50E8…F401</td><td className="num">3 opens</td><td className="num">0 clicks</td></tr></tbody></table></div>
                <div><div className="u-bars" style={{ height: "72px", padding: "6px 10px" }}><span style={{ height: "100%" }} /><span style={{ height: "75%" }} /><span style={{ height: "75%" }} /><span style={{ height: "50%" }} /></div></div>
                <div><pre className="u-sql" style={{ padding: "0" }}>SELECT wallet, opens, clicks{"\n"}FROM engagement WHERE opens &gt; 0{"\n"}AND clicks = 0</pre></div>
              </div></div></div>
          <div><p className="h4 rv">You can save an answer as a segment or turn it into a campaign, <span>and nothing runs until you approve it.</span></p>
            <div className="appr"><span className="btn">Save as segment</span><span className="btn approve-pulse">Create campaign</span><span>Waiting for your approval</span></div></div>
        </div>
      <div className="chap-bridge"><p className="bridge rv"><a href="#c5">A question tells you who is slipping today. Lifecycle stages show you every week.<span aria-hidden="true">↓</span></a></p></div></article>

      
      <article className="chap" id="c5">
        <div className="chap-h"><h3 className="h3 rv">See who is slipping before they leave, <span>because every customer sits in a lifecycle stage worked out from what they actually did.</span></h3></div>
        <div className="vis live short" data-scene="life"><div className="stagebox" style={{ height: "auto" }}><div className="u" style={{ display: "grid", gap: "12px" }} role="img" aria-label="The Dashboard: five headline numbers count up and the Lifecycle bar fills, showing 8 customers came back this week and 9 started slipping.">
          <div className="u-card u-kpis" style={{ boxShadow: "0 18px 40px -26px rgba(16,24,40,.3)" }}>
            <div><small>Wallets reached · 30d</small><b data-count="18204">18,204</b><span>↗ +12.4%</span></div><div><small>Email open rate · 30d</small><b data-count="42.3" data-dec="1" data-suf="%">42.3%</b><span>↗ +3.1pt</span></div><div><small>Push view rate · 30d</small><b data-count="90.6" data-dec="1" data-suf="%">90.6%</b><span>↗ +1.8pt</span></div><div><small>Active wallets · 30d</small><b data-count="9412">9,412</b><span>↗ +8.6%</span></div><div><small>On-chain conversions · 30d</small><b data-count="1164">1,164</b><span>↗ +22.8%</span></div></div>
          <div className="u-card u-life" style={{ boxShadow: "0 18px 40px -26px rgba(16,24,40,.3)" }}><div className="hd">Lifecycle<span>48 wallets, healthiest first</span></div>
            <div className="nums2"><div><b style={{ color: "#128355" }} data-count="8">8</b><small>came back this week</small></div><div><b style={{ color: "#E04E12" }} data-count="9">9</b><small>started slipping</small></div></div>
            <div className="u-lbar" data-lbar><span style={{ flex: "5", background: "#2F94FF" }} /><span style={{ flex: "14", background: "#1727E0" }} /><span style={{ flex: "12", background: "#17A66B" }} /><span style={{ flex: "8", background: "#128355" }} /><span style={{ flex: "1", background: "#FF8449" }} /><span style={{ flex: "8", background: "#E5484D" }} /></div>
            <div className="u-leg"><span><i style={{ background: "#2F94FF" }} />New<b>5</b></span><span><i style={{ background: "#1727E0" }} />Activated<b>14</b></span><span><i style={{ background: "#17A66B" }} />Engaged<b>12</b></span><span><i style={{ background: "#128355" }} />Reactivated<b>8</b></span><span><i style={{ background: "#FF8449" }} />At risk<b>1</b></span><span><i style={{ background: "#E5484D" }} />Dormant<b>8</b></span></div></div>
        </div></div></div>
        <div className="pair">
          <div><p className="h4 rv">You see who came back this week and who started slipping, <span>from the same records your Loops use.</span></p>
            <div className="nums"><div><b style={{ color: "var(--g)" }} data-count="8">8</b><span>came back</span></div><div><b style={{ color: "#C2410C" }} data-count="9">9</b><span>started slipping</span></div></div></div>
          <div><p className="h4 rv">You can hold a share of customers back from every campaign and Loop, <span>so the lift you report is real.</span></p>
            <div className="hold" data-scene="hold" aria-hidden="true"><span>Messaged</span><span>Held back</span></div></div>
        </div>
      <div className="chap-bridge"><p className="bridge rv"><a href="#onb-h">All of this starts from data you already hold.<span aria-hidden="true">↓</span></a></p></div></article>
    </div>
  </div>

  <section className="onb" aria-labelledby="onb-h">
    <div><h2 className="h2 rv" id="onb-h">You can be up and running without a data team, <span>because OnchainSuite finds your contracts and holders from your project&rsquo;s address.</span></h2>
      <ol className="steps onb-steps">
        <li className="rv"><button type="button" className="onb-step on" data-onb-step="0" aria-pressed="true"><i>01</i><b>Tell us where your community lives</b><span>A contract address, a project name or your website.</span></button></li>
        <li className="rv"><button type="button" className="onb-step" data-onb-step="1" aria-pressed="false"><i>02</i><b>Bring in the records you already hold</b><span>Email lists, app accounts and wallets, in whatever shape they are in.</span></button></li>
        <li className="rv"><button type="button" className="onb-step" data-onb-step="2" aria-pressed="false"><i>03</i><b>Connect a channel and send</b><span>Verify a sending domain for email, or add the SDK for in-app.</span></button></li>
      </ol>
      <div className="ctas" style={{ justifyContent: "flex-start", marginTop: "32px" }}><a className="btn solid" href="/early-access">Book a walkthrough</a></div><p className="bridge rv"><a href="#concept-h">Underneath every step sits one engine.<span aria-hidden="true">↓</span></a></p></div>
    <div className="onb-col"><div className="onb-stage"><div className="shot u onb-card" data-scene="onb" role="img" aria-label="Onboarding in three steps: point OnchainSuite at your contract, bring in the records you already hold, then connect email and in-app.">
      <div className="onb-pane on" data-pane="0">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><svg className="mark" style={{ width: "12px", height: "18px" }}><use href="#ocs-mark" fill="url(#mg)" /></svg><span style={{ display: "flex", gap: "4px" }}><i style={{ width: "14px", height: "4px", borderRadius: "2px", background: "#1727E0" }} /><i style={{ width: "6px", height: "4px", borderRadius: "2px", background: "#DEE0E3" }} /><i style={{ width: "6px", height: "4px", borderRadius: "2px", background: "#DEE0E3" }} /><i style={{ width: "6px", height: "4px", borderRadius: "2px", background: "#DEE0E3" }} /></span></div>
      <div style={{ fontSize: "22px", fontWeight: "600", letterSpacing: "-.01em", marginTop: "18px" }}>Where does your community live?</div>
      <div style={{ color: "#585D65", fontSize: "13px" }}>Give us anything that points at your project. We&rsquo;ll find the contract, the holders and the rest ourselves.</div>
      <div><p className="u-label" style={{ marginTop: "6px" }}>Contract address, project name or website</p><div className="u-sel v" style={{ height: "36px", borderColor: "#1727E0", boxShadow: "0 0 0 2px #E4EAFF" }}><span className="u-addr" data-type="0x3F4a…8a21" /></div>
        <p style={{ fontSize: "11.5px", color: "#767B83", margin: "6px 0 0" }}>We read the holder list and the contracts deployed alongside it. Nothing is sent anywhere.</p></div>
      <div data-found style={{ display: "grid", gap: "8px" }}>
        <div className="u-link"><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-data" /></svg></span>Acme Packs<em className="u-addr">ERC-721 · Base</em><svg className="ok"><use href="#a-check" /></svg></div>
        <div className="u-link"><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-data" /></svg></span>Acme Staking<em className="u-addr">Vault · Base</em><svg className="ok"><use href="#a-check" /></svg></div>
        <div className="u-link"><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-aud" /></svg></span>Holders found<em data-holders>746</em></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><span className="u-btn p">Continue</span></div>
</div>
      <div className="onb-pane" data-pane="1">
        <div className="onb-top"><svg className="mark" style={{ width: "12px", height: "18px" }}><use href="#ocs-mark" fill="url(#mg)" /></svg><span className="onb-dots"><i /><i className="on" /><i /></span></div>
        <div className="onb-h">Bring in the records you already hold</div>
        <div className="onb-p">Upload a file or connect a source. We link a row to a wallet only where you already hold that link.</div>
        <div className="onb-rows">
          <div className="u-link"><span className="ic"><svg><use href="#a-data" /></svg></span>subscribers.csv<em className="u-addr">4,812 rows</em><svg className="ok"><use href="#a-check" /></svg></div>
          <div className="u-link"><span className="ic"><img src="/site/integrations/googlesheets.svg" alt="" width={16} height={16} /></span>Season 2 waitlist<em>Google Sheets</em><svg className="ok"><use href="#a-check" /></svg></div>
          <div className="u-link"><span className="ic"><img src="/site/integrations/segment.svg" alt="" width={16} height={16} /></span>Product events<em>Segment</em><svg className="ok"><use href="#a-check" /></svg></div>
          <div className="u-link"><span className="ic"><img src="/site/integrations/privy.png" alt="" width={16} height={16} /></span>Wallet logins<em>Privy</em><svg className="ok"><use href="#a-check" /></svg></div>
        </div>
        <div className="onb-meter"><div><b>4,812</b> contacts imported, <b>3,104</b> linked to a wallet</div><span><i /></span></div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><span className="u-btn p">Continue</span></div>
      </div>
      <div className="onb-pane" data-pane="2">
        <div className="onb-top"><svg className="mark" style={{ width: "12px", height: "18px" }}><use href="#ocs-mark" fill="url(#mg)" /></svg><span className="onb-dots"><i /><i /><i className="on" /></span></div>
        <div className="onb-h">Connect a channel and send</div>
        <div className="onb-p">Verify a sending domain for email, add the SDK for in-app, or do both.</div>
        <div className="onb-ch">
          <div className="onb-chh"><span className="ic"><svg><use href="#a-mail" /></svg></span><b>Email</b><span className="u-chip g"><i />Verified</span></div>
          <div className="onb-dns"><span>SPF</span><svg className="ok"><use href="#a-check" /></svg><span>DKIM</span><svg className="ok"><use href="#a-check" /></svg><span>DMARC</span><svg className="ok"><use href="#a-check" /></svg><em className="u-addr">acme.xyz</em></div>
        </div>
        <div className="onb-ch">
          <div className="onb-chh"><span className="ic"><svg><use href="#a-phone" /></svg></span><b>In-app</b><span className="u-chip g"><i />Connected</span></div>
          <div className="onb-dns"><em className="u-addr">app.acme.xyz</em><span>First wallet seen 2 minutes ago</span></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><span className="u-btn p">Send your first campaign</span></div>
      </div>
    </div></div></div>
  </section>
</div>

<div className="dark" data-dark>
  <div className="wrap">
    <section className="concept" id="concept" aria-labelledby="concept-h"><div className="pin" id="conceptPin"><div className="pin-in" style={{ textAlign: "center" }}>
      
      <h2 className="giant" id="concept-h">Lifecycle Intelligence</h2>
      <p className="lede">The engine underneath OnchainSuite reads both lanes of your customer data and turns them into one record per person.</p>
      <svg className="lanesvg" viewBox="0 0 1200 300" role="img" aria-label="As you scroll, events from your app and from your contracts travel along two lanes and merge into one customer record that fills in and turns to at risk.">
        <defs>
          <linearGradient id="lA" x1="0" x2="1"><stop offset="0" stopColor="#3A3D45" stopOpacity="0" /><stop offset=".5" stopColor="#7C88FF" /><stop offset="1" stopColor="#C9CFFF" /></linearGradient>
          <linearGradient id="lB" x1="0" x2="1"><stop offset="0" stopColor="#3A3D45" stopOpacity="0" /><stop offset=".5" stopColor="#4F8BFF" /><stop offset="1" stopColor="#C9CFFF" /></linearGradient>
          <radialGradient id="glow"><stop offset="0" stopColor="#5865FF" stopOpacity=".55" /><stop offset="1" stopColor="#5865FF" stopOpacity="0" /></radialGradient>
        </defs>
        <circle id="cGlow" cx="900" cy="150" r="190" fill="url(#glow)" opacity=".4" />
        <path id="laneA" d="M0 60 H500 C640 60 690 150 800 150" fill="none" stroke="url(#lA)" strokeWidth="1.5" />
        <path id="laneB" d="M0 240 H500 C640 240 690 150 800 150" fill="none" stroke="url(#lB)" strokeWidth="1.5" />
        <g fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8C8F96"><text x="40" y="40">YOUR APP</text><text x="40" y="282">YOUR CONTRACTS</text></g>
        <g id="pills" fontFamily="Inter, sans-serif" fontSize="12.5" textAnchor="middle" />
        <g transform="translate(800 80)">
          <rect width="260" height="140" rx="14" fill="#FFFFFF" />
          <circle cx="34" cy="34" r="16" fill="#3B6BFF" /><text x="34" y="38.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill="#fff">JM</text>
          <text x="60" y="30" fontFamily="Inter, sans-serif" fontSize="14.5" fontWeight="600" fill="#1C1D1F">Josh Miller</text>
          <text x="60" y="48" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#75777C">0x667c…3fa1</text>
          <g fontFamily="Inter, sans-serif" fontSize="12" fill="#3B3D42">
            <text className="rec-line" data-rl="0" x="20" y="76">✓ Signed up · finished setup</text>
            <text className="rec-line" data-rl="1" x="20" y="96">✓ Deposited 12,400 USDC</text>
            <text className="rec-line" data-rl="2" x="20" y="116" fill="#B42318">✓ Withdrew 9,800 USDC</text>
          </g>
          <g className="rec-line" data-rl="3"><rect x="176" y="18" width="68" height="22" rx="6" fill="#FDEAEA" /><text x="210" y="33" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="600" fill="#B42318">At risk</text></g>
        </g>
      </svg>
    </div></div>
      <div className="five">
        <div className="rv"><svg aria-hidden="true"><use href="#i-layers" /></svg><p className="h4">Reads both lanes <span>at source, from your app and from your contracts.</span></p></div>
        <div className="rv"><svg aria-hidden="true"><use href="#i-text" /></svg><p className="h4">Speaks your language, <span>turning contract events into deposits, withdrawals and activations.</span></p></div>
        <div className="rv"><svg aria-hidden="true"><use href="#i-user" /></svg><p className="h4">Finds the customer <span>behind each action, by email, app account or wallet.</span></p></div>
        <div className="rv"><svg aria-hidden="true"><use href="#i-clock" /></svg><p className="h4">Starts from history, <span>with lending, perpetuals and real-world-asset records back to the first block.</span></p></div>
        <div className="rv"><svg aria-hidden="true"><use href="#i-key" /></svg><p className="h4">Never holds keys, <span>because our access to the chain is read-only.</span></p></div>
      </div><div className="concept-bridge"><p className="bridge rv dk"><a href="#nomail-h">Because a record can start from the wallet, even a customer with no email can be reached.<span aria-hidden="true">↓</span></a></p></div>
    </section>

    <section className="nomail dk-sec" aria-labelledby="nomail-h">
      <div className="nomail-bg" aria-hidden="true" />
      <div><h2 className="h2 rv" id="nomail-h">A wallet with no email address is still a customer you can reach.</h2>
        <div className="duo" data-scene="nomail">
          <div className="side esp"><h3>An email platform</h3><div className="to">To: 0x9a2e…e41</div><span className="tapsend">Send</span><div className="verd"><i>×</i>No address, so nothing is sent</div></div>
          <div className="vs" aria-hidden="true">VS</div>
          <div className="side ocs"><h3>OnchainSuite <span>in-app</span></h3><div className="to">To: 0x9a2e…e41</div><span className="tapsend">Send</span>
            <div className="push"><span className="ic"><svg className="mark" aria-hidden="true"><use href="#ocs-mark" fill="#FFFFFF" /></svg></span><b>212 USDC in rewards is waiting</b><span>Claim it in one step.</span><em>Claim rewards</em></div>
            <div className="verd"><i>✓</i>Shows the next time they open your app</div></div>
        </div>
        <p className="fine"><span><svg aria-hidden="true"><use href="#i-return" /></svg>Reaches customers who come back, not those who have gone for good.</span><span><svg aria-hidden="true"><use href="#i-lock" /></svg>A contact can exist with only a wallet.</span></p><p className="bridge rv dk"><a href="#stack-h">In-app and email are two ways in. Here is everything else that connects.<span aria-hidden="true">↓</span></a></p>
      </div>
    </section>

    <section className="stack dk-sec" aria-labelledby="stack-h">
      <h2 className="h2 rv" id="stack-h">Your chains, your lists and your sending all connect to OnchainSuite.</h2>
      <p className="rv">Bring the records you already hold, read the chains your product runs on, and send through infrastructure you can trust. Segment and Zapier open up the rest of your stack.</p>
      <div className="mq" aria-label="Connects directly to Ethereum, Base, Arbitrum, Optimism, Polygon, WalletConnect, Privy, Dynamic, Web3Auth, Segment, Zapier, Google Sheets, CSV import, Webhooks, AWS SES, Azure Communication Services, and through Segment or Zapier: Amplitude, Mixpanel, Firebase, Attio, HubSpot, Salesforce, PostHog, Intercom, Slack, Notion, Airtable, Stripe, Shopify">
        <div className="mq-row" aria-hidden="true"><span className="lg"><img src="/site/integrations/ethereum.svg" alt="" width={22} height={22} />Ethereum</span><span className="lg"><img src="/site/integrations/base.svg" alt="" width={22} height={22} />Base</span><span className="lg"><img src="/site/integrations/arbitrum.svg" alt="" width={22} height={22} />Arbitrum</span><span className="lg"><img src="/site/integrations/optimism.svg" alt="" width={22} height={22} />Optimism</span><span className="lg"><img src="/site/integrations/polygon.svg" alt="" width={22} height={22} />Polygon</span><span className="lg"><img src="/site/integrations/walletconnect.svg" alt="" width={22} height={22} />WalletConnect</span><span className="lg"><img src="/site/integrations/privy.png" alt="" width={22} height={22} />Privy</span><span className="lg"><img src="/site/integrations/dynamic.jpg" alt="" width={22} height={22} />Dynamic</span><span className="lg"><img src="/site/integrations/web3auth.png" alt="" width={22} height={22} />Web3Auth</span><span className="lg"><img src="/site/integrations/segment.svg" alt="" width={22} height={22} />Segment</span><span className="lg"><img src="/site/integrations/zapier.svg" alt="" width={22} height={22} />Zapier</span><span className="lg"><img src="/site/integrations/googlesheets.svg" alt="" width={22} height={22} />Google Sheets</span><span className="lg"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z M9.5 1.5V5H13" fill="none" stroke="#C9CCD3" strokeWidth="1.3" strokeLinejoin="round" /></svg>CSV import</span><span className="lg"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="11.5" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><circle cx="12" cy="11.5" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><circle cx="8" cy="4" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><path d="M7 5.8L4.9 9.7M9 5.8l2.1 3.9M6 11.5h4" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /></svg>Webhooks</span><span className="lg"><img src="/site/integrations/aws-ses.svg" alt="" width={22} height={22} />AWS SES</span><span className="lg"><img src="/site/integrations/azure.svg" alt="" width={22} height={22} />Azure Communication Services</span><span className="lg"><img src="/site/integrations/ethereum.svg" alt="" width={22} height={22} />Ethereum</span><span className="lg"><img src="/site/integrations/base.svg" alt="" width={22} height={22} />Base</span><span className="lg"><img src="/site/integrations/arbitrum.svg" alt="" width={22} height={22} />Arbitrum</span><span className="lg"><img src="/site/integrations/optimism.svg" alt="" width={22} height={22} />Optimism</span><span className="lg"><img src="/site/integrations/polygon.svg" alt="" width={22} height={22} />Polygon</span><span className="lg"><img src="/site/integrations/walletconnect.svg" alt="" width={22} height={22} />WalletConnect</span><span className="lg"><img src="/site/integrations/privy.png" alt="" width={22} height={22} />Privy</span><span className="lg"><img src="/site/integrations/dynamic.jpg" alt="" width={22} height={22} />Dynamic</span><span className="lg"><img src="/site/integrations/web3auth.png" alt="" width={22} height={22} />Web3Auth</span><span className="lg"><img src="/site/integrations/segment.svg" alt="" width={22} height={22} />Segment</span><span className="lg"><img src="/site/integrations/zapier.svg" alt="" width={22} height={22} />Zapier</span><span className="lg"><img src="/site/integrations/googlesheets.svg" alt="" width={22} height={22} />Google Sheets</span><span className="lg"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z M9.5 1.5V5H13" fill="none" stroke="#C9CCD3" strokeWidth="1.3" strokeLinejoin="round" /></svg>CSV import</span><span className="lg"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="11.5" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><circle cx="12" cy="11.5" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><circle cx="8" cy="4" r="2" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /><path d="M7 5.8L4.9 9.7M9 5.8l2.1 3.9M6 11.5h4" fill="none" stroke="#C9CCD3" strokeWidth="1.3" /></svg>Webhooks</span><span className="lg"><img src="/site/integrations/aws-ses.svg" alt="" width={22} height={22} />AWS SES</span><span className="lg"><img src="/site/integrations/azure.svg" alt="" width={22} height={22} />Azure Communication Services</span></div>
        <div className="mq-row rev" aria-hidden="true"><span className="lg"><img src="/site/integrations/amplitude.svg" alt="" width={22} height={22} />Amplitude</span><span className="lg"><img src="/site/integrations/mixpanel.svg" alt="" width={22} height={22} />Mixpanel</span><span className="lg"><img src="/site/integrations/firebase.svg" alt="" width={22} height={22} />Firebase</span><span className="lg"><img src="/site/integrations/attio.svg" alt="" width={22} height={22} />Attio</span><span className="lg"><img src="/site/integrations/hubspot.svg" alt="" width={22} height={22} />HubSpot</span><span className="lg"><img src="/site/integrations/salesforce.svg" alt="" width={22} height={22} />Salesforce</span><span className="lg"><img src="/site/integrations/posthog.svg" alt="" width={22} height={22} />PostHog</span><span className="lg"><img src="/site/integrations/intercom.svg" alt="" width={22} height={22} />Intercom</span><span className="lg"><img src="/site/integrations/slack.svg" alt="" width={22} height={22} />Slack</span><span className="lg"><img src="/site/integrations/notion.svg" alt="" width={22} height={22} />Notion</span><span className="lg"><img src="/site/integrations/airtable.svg" alt="" width={22} height={22} />Airtable</span><span className="lg"><img src="/site/integrations/stripe.svg" alt="" width={22} height={22} />Stripe</span><span className="lg"><img src="/site/integrations/shopify.svg" alt="" width={22} height={22} />Shopify</span><span className="lg"><img src="/site/integrations/amplitude.svg" alt="" width={22} height={22} />Amplitude</span><span className="lg"><img src="/site/integrations/mixpanel.svg" alt="" width={22} height={22} />Mixpanel</span><span className="lg"><img src="/site/integrations/firebase.svg" alt="" width={22} height={22} />Firebase</span><span className="lg"><img src="/site/integrations/attio.svg" alt="" width={22} height={22} />Attio</span><span className="lg"><img src="/site/integrations/hubspot.svg" alt="" width={22} height={22} />HubSpot</span><span className="lg"><img src="/site/integrations/salesforce.svg" alt="" width={22} height={22} />Salesforce</span><span className="lg"><img src="/site/integrations/posthog.svg" alt="" width={22} height={22} />PostHog</span><span className="lg"><img src="/site/integrations/intercom.svg" alt="" width={22} height={22} />Intercom</span><span className="lg"><img src="/site/integrations/slack.svg" alt="" width={22} height={22} />Slack</span><span className="lg"><img src="/site/integrations/notion.svg" alt="" width={22} height={22} />Notion</span><span className="lg"><img src="/site/integrations/airtable.svg" alt="" width={22} height={22} />Airtable</span><span className="lg"><img src="/site/integrations/stripe.svg" alt="" width={22} height={22} />Stripe</span><span className="lg"><img src="/site/integrations/shopify.svg" alt="" width={22} height={22} />Shopify</span></div>
      </div>
      <p className="mq-cap rv">The second row connects through Segment or Zapier.</p><p className="bridge rv dk"><a href="#dev-h">If your engineers want to go further, they can build on it directly.<span aria-hidden="true">↓</span></a></p>
    </section>

    <section className="dev dk-sec" id="dev" aria-labelledby="dev-h">
      <div><h2 className="h2 rv" id="dev-h">An SDK, an API and an MCP, <span>so your engineers can build on OnchainSuite as much or as little as they like.</span></h2>
        <ul>
          <li className="rv"><b>In-app SDK</b><span>Add one script and call identify() when a wallet connects.</span></li>
          <li className="rv"><b>REST API</b><span>Send custom events to start Loops and read results back.</span></li>
          <li className="rv"><b>Intelligence MCP</b><span>Question your app and contract data from the tools your team already uses.</span></li>
        </ul><p className="bridge rv dk"><a href="#stmt-h">We built it this way for one reason.<span aria-hidden="true">↓</span></a></p></div>
      <div><div className="code" data-scene="code"><div className="code-h"><b>app.ts</b><span>npm i @onchainsuite/web</span></div>
<pre><span className="ln"><span className="k">import</span> {"{"} OnchainSuite {"}"} <span className="k">from</span> <span className="s">'@onchainsuite/web'</span>;</span><span className="ln">&nbsp;</span><span className="ln"><span className="k">const</span> os = OnchainSuite.init({"{"} key: <span className="s">'pk_live_…'</span> {"}"});</span><span className="ln">&nbsp;</span><span className="ln"><span className="c">// Tell us which wallet is connected.</span></span><span className="ln">os.identify({"{"} wallet: address {"}"});</span><span className="ln">&nbsp;</span><span className="ln"><span className="c">// Wallet addresses only. identify() rejects email,</span></span><span className="ln"><span className="c">// so you never hold the wallet-to-person mapping.</span></span></pre></div></div>
    </section>
  </div>
</div>

<div className="wrap">
  <section className="stmt" aria-labelledby="stmt-h"><div className="pin" id="stmtPin"><div className="pin-in">
    <h2 className="sr" id="stmt-h" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>Why we built OnchainSuite</h2>
    <blockquote className="f-serif" id="stmtQ">&ldquo;<span>We</span> <span>want</span> <span>every</span> <span>growth</span> <span>and</span> <span>CRM</span> <span>manager</span> <span>to</span> <span>see</span> <span>what</span> <span>their</span> <span>customers</span> <span>do</span> <span>on-chain,</span> <span>know</span> <span>where</span> <span>each</span> <span>one</span> <span>is</span> <span>in</span> <span>their</span> <span>lifecycle,</span> <span>and</span> <span>send</span> <span>the</span> <span>right</span> <span>message</span> <span>without</span> <span>asking</span> <span>a</span> <span>developer</span> <span>for</span> <span>a</span> <span>new</span> <span>dataset.</span>&rdquo;</blockquote>
    <cite><b>Olusegun Isaac Aborode</b><span>Founder and CEO, OnchainSuite</span></cite>
  </div></div></section>

  <section className="scale" aria-labelledby="scale-h">
    <div><h2 className="h2 rv" id="scale-h">Lending, perpetuals and real-world-asset products start from their history, <span>not an empty table.</span></h2>
      <p className="atlas-def rv">Atlas is the blockchain data warehouse OnchainSuite reads from, built with Datum Labs. It holds decoded records for those applications across EVM chains, going back to the first block.</p>
      <div className="stats">
        <div className="rv"><b><span data-count="5">5</span> TB+</b><span>of decoded contract data</span></div>
        <div className="rv"><b>Genesis</b><span>backfilled to the first block</span></div>
        <div className="rv"><b data-count="26">26</b><span>platforms compared, none reads a contract</span></div>
        <div className="rv"><b>0</b><span>keys or funds held</span></div>
      </div><p className="bridge rv"><a href="#cta-h">From the first day, that history shows you who is drifting.<span aria-hidden="true">↓</span></a></p></div>
    <div className="tlwrap" data-scene="tl"><div className="tl-bar" aria-hidden="true" /><div className="tl-lab"><span>First block</span><span>Today</span></div>
      <p className="tl-note">Lending, perpetuals and real-world-asset records across EVM chains, decoded and kept current.</p></div>
  </section>

  

  

  <section className="close" id="cta" aria-labelledby="cta-h"><div className="close-grid">
    <div><h2 className="h2 rv" id="cta-h">Find out which of your customers are about to leave. <span>Book a fifteen-minute call with our team.</span></h2>
      <div className="ctas rv"><a className="btn solid lg" href="/early-access">Book a walkthrough</a><a className="btn lg" href="/pricing">See pricing</a></div></div>
    <CloseArt /></div></section>
</div>

    </>;
}

// app/page.jsx
function Home() {
  return <SiteChrome>
      <HomeBody />
      <HomeMotion />
    </SiteChrome>;
}

// components/ns/PricingPlans.jsx

// components/ns/PricingLine.jsx
var Ctx = createContext({ line: "suite", setLine: () => {
} });
function PricingLineProvider({ children }) {
  const [line, setLine] = useState3("suite");
  return <Ctx.Provider value={{ line, setLine }}>{children}</Ctx.Provider>;
}
var usePricingLine = () => useContext(Ctx);

// lib/pricing.js
var PACKAGES = [
  { id: "launch", name: "Launch", usd: 39, gbp: 29, contacts: 2500, credits: 1e4, emails: 5e4, inapp: 25e3, seats: 2 },
  { id: "launch-plus", name: "Launch+", usd: 118, gbp: 87, contacts: 1e4, credits: 4e4, emails: 1e5, inapp: 1e5, seats: 3 },
  { id: "growth", name: "Growth", usd: 349, gbp: 257, contacts: 25e3, credits: 1e5, emails: 25e4, inapp: 25e4, seats: 4 },
  { id: "growth-plus", name: "Growth+", usd: 681, gbp: 502, contacts: 5e4, credits: 2e5, emails: 5e5, inapp: 5e5, seats: 5 },
  { id: "pro", name: "Enterprise", usd: 1622, gbp: 1197, contacts: 75e3, credits: 3e5, emails: 75e4, inapp: 1e6, seats: 7 }
];
var LEVELS = [
  {
    id: "launch",
    name: "Launch",
    pitch: "For a first customer group, with both lanes, Loops and the Intelligence MCP from day one.",
    options: ["launch", "launch-plus"]
  },
  {
    id: "growth",
    name: "Growth",
    pitch: "For a live audience, with deeper allowances and more seats.",
    options: ["growth", "growth-plus"],
    featured: true
  },
  {
    id: "pro",
    name: "Enterprise",
    pitch: "For teams at global scale, as a custom deal with unlimited access, priority support and volume discounts.",
    options: ["pro"]
  }
];
var byId = (id) => PACKAGES.find((p3) => p3.id === id);
var CURVE = { base: 16, per1k: 13.3 };
var MULT = { launch: 0.79, growth: 1, pro: 1.6 };
var FX_GBP = 0.7377;
var EXTRA_SEAT_USD = 10;
var levelFor = (c) => c >= 75e3 ? "pro" : c >= 25e3 ? "growth" : "launch";
var suitePrice = (c) => Math.round(MULT[levelFor(c)] * (CURVE.base + CURVE.per1k * c / 1e3));
var seatsIncluded = (c) => c >= 75e3 ? 7 : c >= 5e4 ? 5 : c >= 25e3 ? 4 : c >= 1e4 ? 3 : 2;
var allowances = (c) => ({
  credits: c * 4,
  ons: c,
  emails: Math.max(5e4, c * 10),
  inapp: levelFor(c) === "pro" ? Math.round(c * 40 / 3) : c * 10,
  seats: seatsIncluded(c)
});
var CONTACT_STEPS = [
  ...Array.from({ length: 10 }, (_, i) => 2500 * (i + 1)),
  // 2,500 to 25,000
  ...Array.from({ length: 10 }, (_, i) => 3e4 + 5e3 * i),
  // 30,000 to 75,000
  ...Array.from({ length: 7 }, (_, i) => 1e5 + 25e3 * i),
  // 100,000 to 250,000
  3e5,
  4e5,
  5e5
];
var PRO_TERMS = ["Unlimited access to the whole platform", "Priority support from our team", "Volume discounts as you grow", "A contract and terms agreed with you"];
var LEVEL_INFO = [
  { id: "launch", name: "Launch", band: "2,500 to 24,999 contacts", ref: 2500 },
  { id: "growth", name: "Growth", band: "25,000 to 74,999 contacts", ref: 25e3 },
  { id: "pro", name: "Enterprise", band: "75,000 contacts and up", ref: 75e3 }
];
var METERS = [
  { item: "Emails", unit: "per 1,000 sent", price: "$1.00", send: "$1.00" },
  { item: "In-app messages", unit: "per 1,000 delivered", price: "$1.00", send: false },
  { item: "Wallet-data credits", unit: "per 10,000 (a full enrichment uses 4)", price: "$10.00", send: false },
  { item: "ONS+ list checks", unit: "per 1,000 addresses", price: "$10.00", send: false },
  { item: "AI actions", unit: "per 1,000", price: "$6.00", send: "$6.00" }
];
var SEND_BASE = 6;
var SEND_PER_1K = 3.95;
var sendPrice = (subscribers) => SEND_BASE + subscribers / 1e3 * SEND_PER_1K;
var ADDONS = [
  { item: "Extra team seats", detail: "Each seat above the ones your contact count includes, up to 50", price: "$10 a month", send: "Ask us" },
  { item: "+10,000 wallet-data credits", detail: "Enough to fully enrich 2,500 more wallets", price: "$10", send: false },
  { item: "+100,000 wallet-data credits", detail: "Enough to fully enrich 25,000 more wallets", price: "$100", send: false },
  { item: "Concierge", detail: "Our team plans and runs lifecycle work with you, scoped in advance", price: "$150 an hour", send: "$150 an hour" }
];
var fmt = (n) => n.toLocaleString("en-US");
var usd = (n) => "$" + (Number.isInteger(n) ? fmt(n) : n.toFixed(2));
var all = (v = true) => [v, v, v];
var COMPARE_GROUPS = [
  {
    title: "Capacity",
    rows: [
      { label: "Contacts", note: "Your level follows from how many contacts you import.", cells: ["2,500 to 24,999", "25,000 to 74,999", "75,000 and up"], send: "Priced per subscriber" },
      { label: "Wallet-data credits", note: "A full enrichment pass of every contact, at 4 credits each.", cells: ["4 per contact", "4 per contact", "Custom"], send: false },
      { label: "Emails a month", cells: ["10 per contact, at least 50,000", "10 per contact", "Custom"], send: "10 per subscriber" },
      { label: "In-app messages a month", cells: ["10 per contact", "10 per contact", "Custom"], send: false },
      { label: "ONS+ list checks", cells: ["1 per contact", "1 per contact", "Custom"], send: false },
      { label: "Team seats included", note: "Extra seats are $10 a month each, up to 50.", cells: ["2, or 3 from 10,000 contacts", "4, or 5 from 50,000 contacts", "Custom"], send: "Ask us" }
    ]
  },
  {
    title: "Customer data",
    rows: [
      { label: "One record per customer across your app and your contracts", cells: all(), send: "Your app only" },
      { label: "Contract events turned into actions such as deposits and withdrawals", cells: all(), send: false },
      { label: "Contract history back to the first block, from Atlas", cells: all(), send: false },
      { label: "Lifecycle stages and health scores", cells: all(), send: true },
      { label: "Contacts that exist with only a wallet", cells: all(), send: false }
    ]
  },
  {
    title: "Audiences and sending",
    rows: [
      { label: "Segments, including people who have not done something", cells: all(), send: true },
      { label: "Campaigns by email and in-app", cells: all(), send: "Email" },
      { label: "Loops, started by on-chain and off-chain triggers", cells: all(), send: "Off-chain triggers" },
      { label: "Holdouts on every campaign and Loop", cells: all(), send: true },
      { label: "Forms", cells: all(), send: true },
      { label: "Dedicated sending IP", note: "Provisioned once you send more than 100,000 emails a month.", cells: all(), send: false }
    ]
  },
  {
    title: "Intelligence and developers",
    rows: [
      { label: "Intelligence MCP, questions in plain English", cells: all(), send: true },
      { label: "In-app SDK", cells: all(), send: false },
      { label: "REST API and webhooks", cells: all(), send: true }
    ]
  },
  {
    title: "Support and terms",
    rows: [
      { label: "Priority support", cells: [false, false, true], send: false },
      { label: "Volume discounts", cells: [false, false, true], send: false },
      { label: "Custom contract and pricing", cells: [false, false, true], send: false }
    ]
  },
  {
    title: "Add-ons",
    rows: ADDONS.map((a) => ({ label: a.item, note: a.detail, cells: [a.price], span: true, send: a.send }))
  },
  {
    title: "Usage beyond your allowance",
    rows: METERS.map((m) => ({ label: m.item, note: m.unit, cells: [m.price], span: true, send: m.send }))
  }
];
var PRICING_FAQ = [
  {
    q: "What is the difference between the Suite and Send plans?",
    a: "On the Suite plan we read both lanes, what customers do in your app and what their wallets do on-chain, and you send by email and in-app. On the Send plan we read your product data and email results, and you run campaigns and Loops by email with AI, but without blockchain data. The Send plan is priced on the size of your list."
  },
  {
    q: "How do I choose a package?",
    a: "Set the number of contacts you plan to import and the price follows. Your level comes from that number: Launch up to 24,999 contacts and Growth from 25,000. From 75,000 contacts, Enterprise is priced as a custom deal with unlimited access, priority support and volume discounts. Many companies start with one customer group rather than every wallet that has touched their contracts."
  },
  {
    q: "What counts as a contact?",
    a: "One identifier. An email address, a wallet, a Telegram handle and an X handle each count as one, so a person with three wallets is three contacts."
  },
  {
    q: "What are wallet-data credits?",
    a: "Credits pay for reading and enriching wallets on the chain. A full wallet enrichment uses four credits. Every package includes a monthly allowance, and you can buy another 10,000 credits for $10 whenever you need them."
  },
  {
    q: "How is the Send plan priced?",
    a: "The Send plan is $6 a month plus $3.95 per 1,000 subscribers. That is $15.88 a month at 2,500 subscribers, $45.50 at 10,000 and $104.75 at 25,000."
  },
  {
    q: "Can I see prices in pounds?",
    a: "Yes. We charge in US dollars, and the pricing page can show every Suite price in pounds sterling as a guide."
  },
  {
    q: "Is there a free plan?",
    a: "No. Book a walkthrough and we will look at the data you want to bring in, then recommend the package that fits it."
  }
];

// components/ns/PricingPlans.jsx
var SEND_STOPS = [500, 1e3, 2500, 5e3, 1e4, 25e3, 5e4, 1e5, 25e4, 5e5];
function PricingPlans() {
  const { line, setLine } = usePricingLine();
  const [cur, setCur] = useState4("usd");
  const [stop, setStop] = useState4(4);
  const subs = SEND_STOPS[stop];
  return <div className="pp">
      <div className="pp-toggles">
        <div className="seg" role="group" aria-label="Product line">
          <button type="button" aria-pressed={line === "suite"} onClick={() => setLine("suite")}>Suite</button>
          <button type="button" aria-pressed={line === "send"} onClick={() => setLine("send")}>Send</button>
        </div>
        {line === "suite" && <div className="seg sm" role="group" aria-label="Currency">
            <button type="button" aria-pressed={cur === "usd"} onClick={() => setCur("usd")}>USD</button>
            <button type="button" aria-pressed={cur === "gbp"} onClick={() => setCur("gbp")}>GBP</button>
          </div>}
      </div>
      <p className="pp-line">
        {line === "suite" ? "On the Suite plan, we read what customers do in your app and on-chain, and you send by email and in-app." : "On the Send plan, you get campaigns, Loops and AI over your product and email data, without blockchain data, priced on your list size."}
      </p>

      {line === "suite" ? <SuiteConfigurator cur={cur} /> : <div className="sendcard">
          <div>
            <h3>Send</h3>
            <p className="price"><b>{usd(Math.round(sendPrice(subs) * 100) / 100)}</b><span>a month for {fmt(subs)} subscribers</span></p>
            <label className="slider" htmlFor="sendSubs">
              <span>Subscribers on your list</span>
              <input
    id="sendSubs"
    type="range"
    min={0}
    max={SEND_STOPS.length - 1}
    step={1}
    value={stop}
    onChange={(e) => setStop(+e.target.value)}
    aria-valuetext={`${fmt(subs)} subscribers`}
  />
              <span className="ticks" aria-hidden="true">{SEND_STOPS.map((s, i) => <i key={s} className={i === stop ? "on" : ""}>{s >= 1e3 ? fmt(s / 1e3) + "k" : s}</i>)}</span>
            </label>
            <p className="formula">${SEND_BASE} a month plus ${SEND_PER_1K.toFixed(2)} per 1,000 subscribers.</p>
          </div>
          <div>
            <ul className="checks">
              <li>Email campaigns to the list you already hold</li>
              <li>Loops that run by email on their own</li>
              <li>Segments of your list</li>
              <li>AI that answers questions and builds segments in plain English</li>
            </ul>
            <p className="upsell">Need to see what your customers do on-chain or reach a wallet in-app? That is the Suite plan, from {usd(byId("launch").usd)} a month.</p>
            <Link className="btn solid lg" href="/early-access">Book a walkthrough</Link>
          </div>
        </div>}
    </div>;
}
var MIN_C = CONTACT_STEPS[0];
var MAX_C = CONTACT_STEPS[CONTACT_STEPS.length - 1];
var MAX_EXTRA_SEATS = 50;
function SuiteConfigurator({ cur }) {
  const [contacts, setContacts] = useState4(25e3);
  const [draft, setDraft] = useState4(null);
  const [extra, setExtra] = useState4(0);
  const level = levelFor(contacts);
  const custom = level === "pro";
  const al = allowances(contacts);
  const suiteUsd = suitePrice(contacts);
  const seatsUsd = extra * EXTRA_SEAT_USD;
  const money3 = (u) => cur === "usd" ? "$" + fmt(u) : "£" + fmt(Math.round(u * FX_GBP));
  const total = cur === "usd" ? "$" + fmt(suiteUsd + seatsUsd) : "£" + fmt(Math.round(suiteUsd * FX_GBP) + Math.round(seatsUsd * FX_GBP));
  const seatPrice = cur === "usd" ? "$" + EXTRA_SEAT_USD : "£" + (EXTRA_SEAT_USD * FX_GBP).toFixed(2);
  const down = () => setContacts([...CONTACT_STEPS].reverse().find((s) => s < contacts) ?? MIN_C);
  const up = () => setContacts(CONTACT_STEPS.find((s) => s > contacts) ?? MAX_C);
  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(n)) setContacts(Math.min(MAX_C, Math.max(MIN_C, n)));
    setDraft(null);
  };
  return <div className="cfg">
      <div className="cfg-set">
        <div className="cfg-row">
          <div>
            <label htmlFor="cfgContacts"><b>Contacts</b></label>
            <span>Each email address, wallet or social handle you import counts as one.</span>
          </div>
          <div className="step">
            <button type="button" onClick={down} disabled={contacts <= MIN_C} aria-label="Fewer contacts">−</button>
            <input
    id="cfgContacts"
    inputMode="numeric"
    value={draft ?? fmt(contacts)}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commit}
    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
  />
            <button type="button" onClick={up} disabled={contacts >= MAX_C} aria-label="More contacts">+</button>
          </div>
        </div>
        <div className="cfg-row">
          <div>
            <label htmlFor="cfgSeats"><b>Team seats</b></label>
            <span>{custom ? "Seats on Enterprise are agreed with you as part of the deal." : <>{al.seats} are included at this size, and each extra seat is {seatPrice} a month.</>}</span>
          </div>
          {!custom && <div className="step">
            <button type="button" onClick={() => setExtra(Math.max(0, extra - 1))} disabled={extra === 0} aria-label="Fewer seats">−</button>
            <output id="cfgSeats" aria-live="polite">{al.seats + extra}</output>
            <button type="button" onClick={() => setExtra(Math.min(MAX_EXTRA_SEATS, extra + 1))} disabled={extra >= MAX_EXTRA_SEATS} aria-label="More seats">+</button>
          </div>}
        </div>
        <div className="cfg-levels" role="group" aria-label="Level, set by your contacts">
          {LEVEL_INFO.map((l) => <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setContacts(l.ref)}>
              <b>{l.name}</b><span>{l.band}</span><em>{l.id === "pro" ? "Custom pricing" : <>from {money3(suitePrice(l.ref))} a month</>}</em>
            </button>)}
        </div>
        <p className="cfg-note">Your level follows from your contacts, and every level includes the whole platform. From 75,000 contacts, Enterprise is priced as a custom deal with you.</p>
      </div>

      <div className="cfg-sum">
        <p className="cfg-lv">{LEVEL_INFO.find((l) => l.id === level).name}</p>
        {custom ? <>
            <p className="price"><b>Custom</b><span>pricing</span></p>
            <p className="cfg-h">For teams at global scale</p>
            <ul className="checks cfg-pro">{PRO_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
            <Link className="btn solid lg" href="/early-access">Talk to sales</Link>
          </> : <>
            <p className="price"><b>{total}</b><span>a month</span></p>
            <ul className="cfg-break">
              <li><span>Suite plan for {fmt(contacts)} contacts</span><b>{money3(suiteUsd)}</b></li>
              {extra > 0 && <li><span>{extra} extra {extra === 1 ? "seat" : "seats"}</span><b>{money3(seatsUsd)}</b></li>}
            </ul>
            <p className="cfg-h">Included every month</p>
            <ul className="cfg-al">
              <li><span>Wallet-data credits</span><b>{fmt(al.credits)}</b></li>
              <li><span>ONS+ list checks</span><b>{fmt(al.ons)}</b></li>
              <li><span>Emails</span><b>{fmt(al.emails)}</b></li>
              <li><span>In-app messages</span><b>{fmt(al.inapp)}</b></li>
            </ul>
            <Link className="btn solid lg" href="/early-access">Book a walkthrough</Link>
          </>}
      </div>
    </div>;
}

// components/ns/CompareTable.jsx
function CellView({ c }) {
  if (typeof c !== "boolean") return <div role="cell" className="val">{c}</div>;
  return c ? <div role="cell" className="yes"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg><span className="sr-only">Included</span></div> : <div role="cell" className="no"><span aria-hidden="true">—</span><span className="sr-only">Not included</span></div>;
}
function CompareTable() {
  const { line } = usePricingLine();
  const send = line === "send";
  return <>
      <div className="cmp-intro">
        {send ? <h2 className="h2 rv" id="cmp-h">The Send plan next to every Suite level. <span>On the Send plan we read your product data and email results. The Suite plan adds the smart contract lane, in-app messages to wallets and list checks.</span></h2> : <h2 className="h2 rv" id="cmp-h">On every Suite level, we read both lanes. <span>The levels differ in the contacts they cover, the allowances that come with them and the seats your team gets.</span></h2>}
      </div>
      <div className={"cmp-table" + (send ? " four" : "")} role="table" aria-label={send ? "Send and Suite plans compared" : "Suite plan levels compared"}>
        <div className="cmp-head" role="row">
          <div role="columnheader"><span className="cmp-note">Prices are per month.</span></div>
          {send && <div role="columnheader" className="cmp-send">
              <b>Send</b>
              <span>from ${SEND_BASE} a month</span>
              <Link className="btn" href="/early-access">Book a walkthrough</Link>
            </div>}
          {LEVELS.map((lv) => <div key={lv.id} role="columnheader">
              <b>{lv.name}</b>
              <span>{lv.id === "pro" ? "Custom pricing" : <>from ${fmt(suitePrice(LEVEL_INFO.find((l) => l.id === lv.id).ref))} a month</>}</span>
              <Link className={"btn " + (lv.featured && !send ? "solid" : "")} href="/early-access">{lv.id === "pro" ? "Talk to sales" : "Book a walkthrough"}</Link>
            </div>)}
        </div>
        {COMPARE_GROUPS.map((g) => <div key={g.title} role="rowgroup" className="cmp-group">
            <div className="cmp-gt" role="row"><div role="cell">{g.title}</div></div>
            {g.rows.map((r) => <div key={r.label} className="cmp-row" role="row">
                <div role="rowheader">{r.label}{r.note && <small>{r.note}</small>}</div>
                {send && <CellView c={r.send} />}
                {r.span ? <div role="cell" className="val span">{r.cells[0]}</div> : r.cells.map((c, i) => <CellView key={i} c={c} />)}
              </div>)}
          </div>)}
      </div>
    </>;
}

// components/ns/Blocks.jsx
var CUSTOMERS = [
  { name: "Predict Street", logo: "/site/logos/predict-street.png" },
  { name: "Yauga", logo: "/site/logos/yauga.jpg" },
  { name: "Rehitage", logo: "/site/logos/rehitage.svg" },
  { name: "Surgence Labs", logo: "/site/logos/surgence.jpg" }
];
function LogoRow({ label }) {
  return <div className="logorow">
      {label && <p className="logorow-l">{label}</p>}
      <div className="logos" aria-label="Paying customers">
        {CUSTOMERS.map((c) => <div key={c.name} className="rv">
            {
    /* eslint-disable-next-line @next/next/no-img-element */
  }
            <img src={c.logo} alt="" width={28} height={28} />{c.name}
          </div>)}
      </div>
    </div>;
}
function Faq({ items, title = "Questions we get asked" }) {
  return <section className="faq" aria-labelledby="faq-h">
      <div><h2 className="h2 rv" id="faq-h">{title}</h2></div>
      <div className="faq-list">
        {items.map((f3) => <details key={f3.q} className="rv">
            <summary>{f3.q}<span aria-hidden="true">+</span></summary>
            <p>{f3.a}</p>
          </details>)}
      </div>
    </section>;
}
function CloseCta({ mainstream = false } = {}) {
  return <section className="close" id="cta" aria-labelledby="cta-h">
      <div className="close-grid">
        <div>
          <h2 className="h2 rv" id="cta-h">Find out which of your customers are about to leave. <span>Book a fifteen-minute call with our team.</span></h2>
          <div className="ctas rv"><Link className="btn solid lg" href="/early-access">Book a walkthrough</Link><Link className="btn lg" href="/pricing">See pricing</Link></div>
        </div>
        <CloseArt mainstream={mainstream} />
      </div>
    </section>;
}
function PageHero({ title, sub, children }) {
  return <section className="phero">
      <h1 className="h1 load" style={{ animationDelay: ".08s" }}>{title}</h1>
      {sub && <p className="sub load" style={{ animationDelay: ".16s" }}>{sub}</p>}
      {children}
    </section>;
}

// app/pricing/page.jsx
var metadata = {
  title: "Pricing",
  description: "OnchainSuite pricing. The Suite plan starts at $39 a month, priced by contacts. The Send plan is $6 a month plus $3.95 per 1,000 subscribers.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · OnchainSuite",
    url: "/pricing",
    type: "website",
    description: "Suite plan from $39 a month, priced by the contacts you bring in. Send plan from $6 a month plus $3.95 per 1,000 subscribers."
  }
};
function PricingPage() {
  return <SiteChrome><PricingBody /></SiteChrome>;
}
function PricingBody() {
  return <PricingLineProvider>
      <div className="wrap">
        <section className="phero">
          <h1 className="h1 load" style={{ animationDelay: ".08s" }}>Pricing that grows with the customers you bring in.</h1>
          <p className="sub load" style={{ animationDelay: ".16s" }}>Set the contacts you plan to import and the seats your team needs, and the price follows.</p>
          <div className="load" style={{ animationDelay: ".24s" }}><PricingPlans /></div>
          <p className="bridge rv center"><a href="#cmp-h">Not sure which package fits? Every one reads both lanes, and here is how they differ.<span aria-hidden="true">↓</span></a></p>
        </section>

        <LogoRow label="Trusted by blockchain companies including" />

        <section className="cmp" aria-labelledby="cmp-h">
          <CompareTable />
          <p className="bridge rv" style={{ margin: "28px 18px 0" }}><a href="#faq-h">Still deciding? These are the questions buyers ask us most.<span aria-hidden="true">↓</span></a></p>
        </section>

        <Faq items={PRICING_FAQ} />
        <CloseCta />
      </div>
      </PricingLineProvider>;
}

// components/ns/PointArt.jsx
var B2 = "#1727E0";
var S = "#2F94FF";
var O2 = "#FF6828";
var N2 = "#010F31";
var L2 = "#DEE0E3";
var P = "#F5F6F7";
var T2 = "#585D65";
var G2 = "#17A66B";
var R2 = "#E5484D";
var f2 = { fontFamily: "Instrument Sans, Inter, sans-serif" };
var mono2 = { fontFamily: "Geist Mono, JetBrains Mono, monospace" };
function Chip({ x, y, w, label, fill = "#fff", stroke = L2, color = T2, mono: m = false, cls, delay }) {
  return <g className={cls} style={delay != null ? { animationDelay: `${delay}s` } : void 0}>
      <rect x={x} y={y} width={w} height={24} rx={6} fill={fill} stroke={stroke} />
      <text x={x + 9} y={y + 16} fontSize={11.5} fill={color} style={m ? mono2 : f2}>{label}</text>
    </g>;
}
function Card({ x, y, w, h, children }) {
  return <g><rect x={x} y={y} width={w} height={h} rx={10} fill="#fff" stroke={L2} />{children}</g>;
}
function Avatar({ x, y, t = "JM", c = "#3B6BFF", r = 12 }) {
  return <g><circle cx={x} cy={y} r={r} fill={c} /><text x={x} y={y + 4} fontSize={r * 0.8} fill="#fff" textAnchor="middle" fontWeight={600} style={f2}>{t}</text></g>;
}
var Check = ({ x, y, c = G2 }) => <path d={`M${x} ${y}l3 3 6-7`} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />;
var Cross = ({ x, y, c = R2 }) => <path d={`M${x} ${y}l7 7M${x + 7} ${y}l-7 7`} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" />;
var ART = {
  /* ---------------- Audience ---------------- */
  lanes: () => <g style={f2}>
    <Chip x={14} y={22} w={104} label="Signed up" cls="ta-pop" delay={0} /><Chip x={14} y={54} w={104} label="Finished setup" cls="ta-pop" delay={0.15} />
    <Chip x={14} y={94} w={104} label="Deposited" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" delay={0.3} /><Chip x={14} y={126} w={104} label="Withdrew" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" delay={0.45} />
    <path d="M118 46 C160 46 160 80 196 80 M118 106 C160 106 160 80 196 80" fill="none" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
    <Card x={196} y={52} w={112} h={56}><Avatar x={218} y={80} /><text x={236} y={77} fontSize={12} fontWeight={600} fill={N2}>Josh</text><text x={236} y={92} fontSize={10} fill={T2} style={mono2}>one record</text></Card>
  </g>,
  lanesYou: () => <g style={f2}>
    <Chip x={14} y={22} w={104} label="Signed up" cls="ta-pop" delay={0} /><Chip x={14} y={54} w={104} label="Finished setup" cls="ta-pop" delay={0.15} />
    <Chip x={14} y={94} w={104} label="Deposited" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" delay={0.3} /><Chip x={14} y={126} w={104} label="Withdrew" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" delay={0.45} />
    <path d="M118 46 C160 46 160 80 196 80 M118 106 C160 106 160 80 196 80" fill="none" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
    <Card x={196} y={52} w={112} h={56}><Avatar x={218} y={80} t="U" c="#585D65" /><text x={236} y={77} fontSize={12} fontWeight={600} fill={N2}>Your user</text><text x={236} y={92} fontSize={10} fill={T2} style={mono2}>one record</text></Card>
  </g>,
  walletOnly: () => <g style={f2}>
    <Card x={16} y={24} w={150} h={104}>
      <text x={30} y={46} fontSize={10} fill={T2} style={mono2}>0x9a2e…e41</text>
      <rect x={30} y={58} width={122} height={24} rx={6} fill={P} /><text x={40} y={74} fontSize={11.5} fill="#9DA1A8">No email</text><Cross x={136} y={66} />
      <rect x={30} y={90} width={122} height={24} rx={6} fill="#E9F7F0" /><text x={40} y={106} fontSize={11.5} fill={G2}>In-app</text><Check x={134} y={100} />
    </Card>
    <path d="M166 76 H188" stroke={L2} strokeWidth={1.5} strokeDasharray="3 3" />
    <g className="ta-float"><rect x={190} y={42} width={124} height={72} rx={12} fill={N2} /><rect x={200} y={54} width={22} height={22} rx={6} fill={B2} />
      <text x={230} y={63} fontSize={10.5} fill="#fff" fontWeight={600}>212 USDC</text><text x={230} y={76} fontSize={9.5} fill="#9DA1A8">rewards waiting</text>
      <rect x={200} y={88} width={64} height={16} rx={5} fill="#fff" /><text x={206} y={100} fontSize={9.5} fill={N2} fontWeight={600}>Claim</text></g>
  </g>,
  reach: () => <g style={f2}>
    {[{ y: 22, n: "Josh", e: true, i: true }, { y: 64, n: "0x9a2e…", e: false, i: true }, { y: 106, n: "Sarah", e: true, i: false }].map((r, k) => <g key={k} className="ta-pop" style={{ animationDelay: `${k * 0.15}s` }}>
        <rect x={16} y={r.y} width={292} height={32} rx={8} fill="#fff" stroke={L2} />
        <Avatar x={34} y={r.y + 16} r={10} t={r.n.startsWith("0x") ? "?" : r.n[0]} c={r.n.startsWith("0x") ? "#9DA1A8" : k === 2 ? "#B54FD8" : "#3B6BFF"} />
        <text x={52} y={r.y + 20} fontSize={11.5} fill={N2} fontWeight={500} style={r.n.startsWith("0x") ? mono2 : f2}>{r.n}</text>
        <rect x={170} y={r.y + 7} width={56} height={18} rx={9} fill={r.e ? "#E9F7F0" : P} /><text x={198} y={r.y + 20} fontSize={10.5} fill={r.e ? G2 : "#B3B5BA"} textAnchor="middle" textDecoration={r.e ? void 0 : "line-through"}>Email</text>
        <rect x={234} y={r.y + 7} width={62} height={18} rx={9} fill={r.i ? "#E9F7F0" : P} /><text x={265} y={r.y + 20} fontSize={10.5} fill={r.i ? G2 : "#B3B5BA"} textAnchor="middle" textDecoration={r.i ? void 0 : "line-through"}>In-app</text>
      </g>)}
  </g>,
  health: () => <g style={f2}>
    <circle cx={84} cy={78} r={44} fill="none" stroke="#ECEDEF" strokeWidth={10} />
    <circle cx={84} cy={78} r={44} fill="none" stroke={O2} strokeWidth={10} strokeDasharray={`${0.61 * 276} 276`} transform="rotate(-90 84 78)" className="ta-draw" strokeLinecap="round" />
    <text x={84} y={83} fontSize={24} fontWeight={600} fill={O2} textAnchor="middle">61</text><text x={84} y={99} fontSize={10} fill={T2} textAnchor="middle">Watch</text>
    {[["Active 6d ago", "+38"], ["2 channels", "+12"], ["4.1 ETH lifetime", "+11"]].map(([a, b], i) => <g key={a} className="ta-pop" style={{ animationDelay: `${0.3 + i * 0.15}s` }}><text x={150} y={52 + i * 24} fontSize={11.5} fill={T2}>{a}</text><text x={300} y={52 + i * 24} fontSize={11.5} fill={N2} fontWeight={600} textAnchor="end">{b}</text></g>)}
    <g transform="translate(150 118)">{[["#2F94FF", 5], ["#1727E0", 14], ["#17A66B", 12], ["#128355", 8], ["#FF8449", 1], ["#E5484D", 8]].reduce((acc, [c, n], i) => {
    const w = n * 3.1;
    acc.els.push(<rect key={i} x={acc.x} y={0} width={w - 1.5} height={10} rx={2} fill={c} className="ta-grow" style={{ animationDelay: `${0.5 + i * 0.08}s` }} />);
    acc.x += w;
    return acc;
  }, { x: 0, els: [] }).els}</g>
  </g>,
  importIn: () => <g style={f2}>
    {[["/site/integrations/googlesheets.svg", "Sheets"], ["/site/integrations/segment.svg", "Segment"], ["/site/integrations/zapier.svg", "Zapier"], ["/site/integrations/privy.png", "Privy"]].map(([src, l], i) => <g key={l} className="ta-pop" style={{ animationDelay: `${i * 0.12}s` }}>
        <rect x={14} y={14 + i * 32} width={96} height={26} rx={7} fill="#fff" stroke={L2} />
        <image href={src} x={21} y={19 + i * 32} width={16} height={16} /><text x={43} y={31 + i * 32} fontSize={11.5} fill={N2}>{l}</text>
        <path d={`M110 ${27 + i * 32} C150 ${27 + i * 32} 160 78 200 78`} fill="none" stroke="#C9D0FF" strokeWidth={1.4} className="ta-dash" />
      </g>)}
    <rect x={200} y={50} width={108} height={56} rx={12} fill="url(#paGrad)" className="ta-float" />
    <text x={254} y={75} fontSize={12} fill="#fff" fontWeight={600} textAnchor="middle">OnchainSuite</text><text x={254} y={92} fontSize={10.5} fill="#DCE3FF" textAnchor="middle">48,210 contacts</text>
  </g>,
  noGuess: () => <g style={f2}>
    <Card x={16} y={52} w={96} h={48}><text x={64} y={74} fontSize={10.5} fill={T2} textAnchor="middle" style={mono2}>0x667c…3fa1</text><text x={64} y={89} fontSize={10} fill="#9DA1A8" textAnchor="middle">public wallet</text></Card>
    <path d="M112 76 H208" stroke={R2} strokeWidth={1.5} strokeDasharray="4 4" /><circle cx={160} cy={76} r={13} fill="#FDECEC" /><Cross x={156.5} y={72.5} />
    <Card x={208} y={52} w={100} h={48}><text x={258} y={74} fontSize={11} fill={T2} textAnchor="middle">j•••@gmail.com</text><text x={258} y={89} fontSize={10} fill="#9DA1A8" textAnchor="middle">private email</text></Card>
    <rect x={72} y={118} width={176} height={24} rx={12} fill="#E9F7F0" /><text x={160} y={134} fontSize={11} fill={G2} textAnchor="middle" fontWeight={500}>Linked only by data you hold</text>
  </g>,
  /* ---------------- Segments ---------------- */
  sentence: () => <g style={f2}>
    <rect x={14} y={16} width={296} height={30} rx={8} fill="#F0F4FF" stroke="#E4EAFF" />
    <text x={26} y={35} fontSize={11.5} fill={N2} className="ta-type">Base wallets over 10 ETH, not staked in 30 days</text>
    <path d="M160 52 V66" stroke={L2} strokeWidth={1.5} /><path d="M155 62 l5 5 5-5" fill="none" stroke={L2} strokeWidth={1.5} />
    {[["Wallet balance", "> 10 ETH"], ["Staked", "has NOT · 30d"]].map(([a, b], i) => <g key={a} className="ta-pop" style={{ animationDelay: `${1.2 + i * 0.25}s` }}>
        <rect x={14} y={74 + i * 34} width={296} height={28} rx={7} fill={P} />
        <rect x={22} y={79 + i * 34} width={110} height={18} rx={5} fill="#fff" stroke={L2} /><text x={30} y={92 + i * 34} fontSize={10.5} fill={N2}>{a}</text>
        <rect x={140} y={79 + i * 34} width={110} height={18} rx={5} fill="#fff" stroke={i ? B2 : L2} /><text x={148} y={92 + i * 34} fontSize={10.5} fill={i ? B2 : N2}>{b}</text>
      </g>)}
  </g>,
  hasNot: () => <g style={f2}>
    <line x1={20} x2={304} y1={84} y2={84} stroke={L2} strokeWidth={2} />
    {[30, 62, 94].map((x, i) => <g key={x}><circle cx={x} cy={84} r={7} fill={B2} /><text x={x} y={110} fontSize={10} fill={T2} textAnchor="middle">Staked</text></g>)}
    <rect x={124} y={60} width={180} height={48} rx={8} fill="none" stroke={O2} strokeDasharray="5 4" className="ta-blink" />
    <text x={214} y={52} fontSize={11.5} fill={O2} textAnchor="middle" fontWeight={600}>30 days, nothing</text>
    {[156, 196, 236, 276].map((x) => <circle key={x} cx={x} cy={84} r={5} fill="none" stroke={L2} strokeWidth={1.5} />)}
    <text x={20} y={134} fontSize={10} fill="#9DA1A8">Then</text><text x={304} y={134} fontSize={10} fill="#9DA1A8" textAnchor="end">Today</text>
  </g>,
  liveCount: () => <g style={f2}>
    <circle className="ta-ring" cx={86} cy={78} r={34} fill="none" stroke={B2} strokeOpacity={0.35} /><circle className="ta-ring" style={{ animationDelay: "1.4s" }} cx={86} cy={78} r={34} fill="none" stroke={B2} strokeOpacity={0.35} />
    <circle cx={86} cy={78} r={34} fill="#F0F4FF" /><text x={86} y={82} fontSize={18} fontWeight={600} fill={B2} textAnchor="middle">1,204</text><text x={86} y={96} fontSize={9.5} fill={T2} textAnchor="middle">match</text>
    {[["maya.eth", "#E5484D"], ["0x8Cc4…21aB", "#2F94FF"], ["leo.eth", "#E8A317"]].map(([n, c], i) => <g key={n} className="ta-bob" style={{ animationDelay: `${i * 0.5}s` }}><rect x={160} y={36 + i * 32} width={146} height={24} rx={12} fill="#fff" stroke={L2} /><circle cx={174} cy={48 + i * 32} r={6} fill={c} /><text x={186} y={52 + i * 32} fontSize={11} fill={N2} style={n.startsWith("0x") ? mono2 : f2}>{n}</text></g>)}
  </g>,
  mixLanes: () => <g style={f2}>
    <Chip x={14} y={24} w={130} label="Wallet > 10 ETH" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" />
    <Chip x={14} y={62} w={130} label="Opened last email" fill="#FFF3ED" stroke="#FFC5A8" color="#B53C0B" cls="ta-pop" delay={0.15} />
    <Chip x={14} y={100} w={130} label="Finished setup" cls="ta-pop" delay={0.3} />
    <path d="M144 36 C190 36 190 74 220 74 M144 74 H220 M144 112 C190 112 190 74 220 74" fill="none" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
    <rect x={220} y={56} width={88} height={36} rx={18} fill={N2} className="ta-float" /><text x={264} y={78} fontSize={12} fill="#fff" textAnchor="middle" fontWeight={600}>1 segment</text>
  </g>,
  oneAudience: () => <g style={f2}>
    <rect x={18} y={62} width={92} height={32} rx={16} fill="url(#paGrad)" /><text x={64} y={82} fontSize={12} fill="#fff" textAnchor="middle" fontWeight={600}>Segment</text>
    {[["Campaign", 26], ["Loop entry", 66], ["MCP answer", 106]].map(([l, y], i) => <g key={l}><path d={`M110 78 C150 78 160 ${y + 12} 196 ${y + 12}`} fill="none" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
        <circle r={3.5} fill={B2}><animateMotion dur="2.4s" repeatCount="indefinite" begin={`${i * 0.5}s`} path={`M110 78 C150 78 160 ${y + 12} 196 ${y + 12}`} /></circle>
        <Chip x={196} y={y} w={110} label={l} /></g>)}
  </g>,
  channelAware: () => <g style={f2}>
    <circle cx={126} cy={78} r={52} fill={B2} fillOpacity={0.12} stroke={B2} strokeOpacity={0.5} className="ta-breathe" />
    <circle cx={198} cy={78} r={52} fill={S} fillOpacity={0.14} stroke={S} strokeOpacity={0.6} className="ta-breathe" style={{ animationDelay: "1s" }} />
    <text x={100} y={82} fontSize={11.5} fill={B2} textAnchor="middle" fontWeight={600}>Email</text><text x={226} y={82} fontSize={11.5} fill="#1D75D6" textAnchor="middle" fontWeight={600}>In-app</text>
    <text x={162} y={82} fontSize={10.5} fill={N2} textAnchor="middle" fontWeight={600}>both</text>
    <text x={160} y={146} fontSize={10.5} fill={T2} textAnchor="middle">Each channel reaches its own part of a segment</text>
  </g>,
  /* ---------------- Loops ---------------- */
  chainTrigger: () => <g style={f2}>
    {[0, 1, 2].map((i) => <g key={i}><rect x={16 + i * 46} y={58} width={38} height={38} rx={8} fill={i === 2 ? B2 : "#fff"} stroke={i === 2 ? B2 : L2} /><text x={35 + i * 46} y={82} fontSize={9.5} fill={i === 2 ? "#fff" : T2} textAnchor="middle" style={mono2}>#{1024 + i}</text>{i < 2 && <line x1={54 + i * 46} x2={62 + i * 46} y1={77} y2={77} stroke={L2} strokeWidth={2} />}</g>)}
    <path d="M150 77 H172" stroke={B2} strokeWidth={1.5} className="ta-dash" /><path d="M165 72 l8 5 -8 5" fill="none" stroke={B2} strokeWidth={1.5} />
    <rect x={176} y={52} width={132} height={50} rx={10} fill="#fff" stroke={B2} className="ta-glow" />
    <rect x={188} y={66} width={22} height={22} rx={6} fill="#FFE4D6" /><path d="M201 69 l-6 9 h5 l-1 7 6-9 h-5z" fill={O2} />
    <text x={220} y={73} fontSize={9.5} fill={T2}>Trigger</text><text x={220} y={89} fontSize={11.5} fill={N2} fontWeight={600}>Goes dormant</text>
  </g>,
  stopsWhenActs: () => <g style={f2}>
    <path d="M20 78 H300" stroke={L2} strokeWidth={2} />
    <circle r={6} fill={B2}><animateMotion dur="3.2s" repeatCount="indefinite" path="M20 78 H178" keyTimes="0;1" /></circle>
    {[["Email", 60], ["Wait 3d", 140], ["In-app", 220]].map(([l, x]) => <g key={l}><rect x={x - 28} y={66} width={56} height={24} rx={6} fill="#fff" stroke={L2} /><text x={x} y={82} fontSize={10.5} fill={N2} textAnchor="middle">{l}</text></g>)}
    <g className="ta-pop" style={{ animationDelay: ".6s" }}><rect x={134} y={104} width={164} height={28} rx={14} fill="#E9F7F0" /><Check x={146} y={114} /><text x={164} y={122} fontSize={11} fill={G2} fontWeight={600}>Deposit recorded, stop</text></g>
    <line x1={180} x2={180} y1={92} y2={104} stroke={G2} strokeWidth={1.5} strokeDasharray="2 2" />
  </g>,
  emailInapp: () => <g style={f2}>
    {[{ y: 14, l: "Send email", c: "#F0F4FF", ic: "✉" }, { y: 62, l: "Wait 3 days", c: P, ic: "◷" }, { y: 110, l: "In-app if no reply", c: "#F0F4FF", ic: "▢" }].map((n, i) => <g key={n.l} className="ta-pop" style={{ animationDelay: `${i * 0.2}s` }}>
        <rect x={86} y={n.y} width={152} height={32} rx={8} fill="#fff" stroke={i === 0 ? B2 : L2} /><rect x={94} y={n.y + 6} width={20} height={20} rx={5} fill={n.c} /><text x={104} y={n.y + 20} fontSize={11} fill={B2} textAnchor="middle">{n.ic}</text>
        <text x={122} y={n.y + 20} fontSize={11.5} fill={N2} fontWeight={500}>{n.l}</text>
        {i < 2 && <line x1={162} x2={162} y1={n.y + 32} y2={n.y + 48} stroke={L2} strokeWidth={1.5} />}
      </g>)}
  </g>,
  holdout: () => <g style={f2}>
    <rect x={20} y={28} width={228} height={26} rx={6} fill={B2} className="ta-grow" /><text x={30} y={45} fontSize={11} fill="#fff" fontWeight={600}>Messaged · 90%</text>
    <rect x={250} y={28} width={54} height={26} rx={6} fill="#D8DBE2" /><text x={277} y={45} fontSize={10.5} fill={T2} textAnchor="middle">Held</text>
    {[[0.62, B2, "Messaged"], [0.38, "#C4C7CC", "Held back"]].map(([h, c, l], i) => <g key={l}><rect x={90 + i * 90} y={140 - h * 70} width={50} height={h * 70} rx={4} fill={c} className="ta-rise" style={{ animationDelay: `${0.3 + i * 0.2}s` }} /><text x={115 + i * 90} y={154} fontSize={10} fill={T2} textAnchor="middle">{l}</text></g>)}
    <text x={232} y={86} fontSize={12.5} fill={G2} fontWeight={600}>Measured lift</text>
  </g>,
  entries: () => <g style={f2}>
    {[["maya.eth", "Completed", G2, "#E9F7F0"], ["0x3F4a…8a21", "In flow", B2, "#F0F4FF"], ["leo.eth", "Completed", G2, "#E9F7F0"], ["0x91Cb…4e07", "Exited", T2, P]].map(([n, s, c, bg], i) => <g key={n} className="ta-pop" style={{ animationDelay: `${i * 0.12}s` }}>
        <line x1={16} x2={308} y1={40 + i * 30} y2={40 + i * 30} stroke="#ECEDEF" />
        <text x={18} y={32 + i * 30} fontSize={11.5} fill={N2} style={n.startsWith("0x") ? mono2 : f2}>{n}</text>
        <rect x={170} y={18 + i * 30} width={78} height={19} rx={4} fill={bg} /><circle cx={180} cy={27.5 + i * 30} r={3} fill={c} /><text x={188} y={31.5 + i * 30} fontSize={10.5} fill={c} fontWeight={500}>{s}</text>
        <text x={306} y={32 + i * 30} fontSize={10} fill="#9DA1A8" textAnchor="end">{["14m", "38m", "2h", "5h"][i]}</text>
      </g>)}
  </g>,
  templates: () => <g style={f2}>
    {[["Welcome new wallets", 0], ["Dormant win-back", 1], ["First-trade nudge", 2]].map(([l, i]) => <g key={l} className="ta-bob" style={{ animationDelay: `${i * 0.6}s` }}>
        <rect x={30 + i * 16} y={20 + i * 34} width={210} height={44} rx={10} fill="#fff" stroke={i === 2 ? B2 : L2} />
        <rect x={42 + i * 16} y={32 + i * 34} width={20} height={20} rx={5} fill={["#E9F7F0", "#FFE4D6", "#F0F4FF"][i]} />
        <text x={70 + i * 16} y={46 + i * 34} fontSize={12} fill={N2} fontWeight={500}>{l}</text>
      </g>)}
  </g>,
  /* ---------------- Intelligence MCP ---------------- */
  question: () => <g style={f2}>
    <rect x={68} y={14} width={240} height={30} rx={10} fill={B2} /><text x={80} y={33} fontSize={11} fill="#fff" className="ta-type">Who traded in the final, then stopped?</text>
    <g className="ta-pop" style={{ animationDelay: "1.3s" }}>
      <rect x={16} y={56} width={292} height={86} rx={10} fill="#fff" stroke={L2} />
      <text x={28} y={76} fontSize={20} fontWeight={600} fill={N2}>1,284</text><text x={92} y={76} fontSize={10.5} fill={T2}>customers match</text>
      {[["Tomas Ruiz", "19 Jul"], ["0x2b8f…d10", "19 Jul"], ["Hannah Clarke", "18 Jul"]].map(([a, b], i) => <g key={a}><line x1={28} x2={296} y1={86 + i * 18} y2={86 + i * 18} stroke="#ECEDEF" /><text x={28} y={99 + i * 18} fontSize={10.5} fill={N2} style={a.startsWith("0x") ? mono2 : f2}>{a}</text><text x={296} y={99 + i * 18} fontSize={10.5} fill={T2} textAnchor="end">{b}</text></g>)}
    </g>
  </g>,
  tableChartSql: () => <g style={f2}>
    <rect x={16} y={14} width={292} height={130} rx={10} fill="#fff" stroke={L2} />
    <g className="pa-cycle pa-c1"><text x={30} y={50} fontSize={11} fill={N2}>maya.eth</text><text x={250} y={50} fontSize={11} fill={T2}>4 opens</text><line x1={30} x2={294} y1={58} y2={58} stroke="#ECEDEF" /><text x={30} y={76} fontSize={11} fill={N2} style={mono2}>0x50E8…F401</text><text x={250} y={76} fontSize={11} fill={T2}>3 opens</text><line x1={30} x2={294} y1={84} y2={84} stroke="#ECEDEF" /><text x={30} y={102} fontSize={11} fill={N2}>dami.eth</text><text x={250} y={102} fontSize={11} fill={T2}>3 opens</text></g>
    <g className="pa-cycle pa-c2">{[70, 52, 52, 35, 60, 44].map((h, i) => <rect key={i} x={44 + i * 40} y={130 - h} width={24} height={h} rx={3} fill={i % 2 ? S : B2} />)}</g>
    <g className="pa-cycle pa-c3" style={mono2}><text x={30} y={54} fontSize={11} fill={B2}>SELECT</text><text x={84} y={54} fontSize={11} fill={N2}>wallet, opens, clicks</text><text x={30} y={74} fontSize={11} fill={B2}>FROM</text><text x={72} y={74} fontSize={11} fill={N2}>engagement</text><text x={30} y={94} fontSize={11} fill={B2}>WHERE</text><text x={80} y={94} fontSize={11} fill={N2}>opens &gt; 0 AND clicks = 0</text></g>
    <g fontSize={10.5}><rect x={16} y={14} width={292} height={22} rx={10} fill={P} />
      <text x={34} y={29} className="pa-tab pa-t1">Table</text><text x={84} y={29} className="pa-tab pa-t2">Chart</text><text x={134} y={29} className="pa-tab pa-t3">SQL</text></g>
  </g>,
  answerToSegment: () => <g style={f2}>
    <Card x={14} y={30} w={130} h={96}>{[0, 1, 2, 3].map((i) => <g key={i}><rect x={24} y={44 + i * 19} width={70} height={8} rx={3} fill="#ECEDEF" /><rect x={102} y={44 + i * 19} width={30} height={8} rx={3} fill="#E4EAFF" /></g>)}</Card>
    <rect x={160} y={64} width={64} height={26} rx={7} fill={N2} className="ta-glow" /><text x={192} y={81} fontSize={10.5} fill="#fff" textAnchor="middle" fontWeight={600}>Save</text>
    <path d="M144 77 H160 M224 77 H244" stroke={L2} strokeWidth={1.5} />
    <rect x={244} y={62} width={66} height={30} rx={15} fill="url(#paGrad)" className="ta-pop" style={{ animationDelay: ".6s" }} /><text x={277} y={81} fontSize={10.5} fill="#fff" textAnchor="middle" fontWeight={600}>Segment</text>
  </g>,
  approve: () => <g style={f2}>
    <Card x={30} y={18} w={264} h={120}>
      <text x={46} y={42} fontSize={10} fill={T2}>PROPOSED BY THE INTELLIGENCE MCP</text>
      <text x={46} y={62} fontSize={13} fill={N2} fontWeight={600}>Win-back for 1,284 traders</text>
      <text x={46} y={80} fontSize={11} fill={T2}>Email, then in-app after 3 days</text>
      <rect x={46} y={96} width={90} height={28} rx={7} fill={N2} className="pa-pulse" /><text x={91} y={114} fontSize={11.5} fill="#fff" textAnchor="middle" fontWeight={600}>Approve</text>
      <text x={150} y={114} fontSize={10.5} fill="#9DA1A8">Waiting for you</text>
    </Card>
  </g>,
  mcpTools: () => <g style={f2}>
    {[["AI assistant", 22, 22], ["Code editor", 22, 112], ["Team chat", 222, 22], ["Notebook", 222, 112]].map(([l, x, y], i) => <g key={l}><path d={`M162 77 L${x + 40} ${y + 12}`} stroke="#C9D0FF" strokeWidth={1.4} className="ta-dash" />
        <circle r={3} fill={B2}><animateMotion dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} path={`M162 77 L${x + 40} ${y + 12}`} /></circle>
        <Chip x={x} y={y} w={80} label={l} /></g>)}
    <rect x={124} y={56} width={76} height={42} rx={12} fill="url(#paGrad)" /><text x={162} y={81} fontSize={11.5} fill="#fff" textAnchor="middle" fontWeight={600}>MCP</text>
  </g>,
  bothLanesQ: () => <g style={f2}>
    <Chip x={14} y={30} w={140} label="Contract: no deposit" fill="#EEF0FF" stroke="#C9D0FF" color={B2} cls="ta-pop" />
    <Chip x={170} y={30} w={140} label="App: opened this week" cls="ta-pop" delay={0.15} />
    <path d="M84 54 C84 80 162 74 162 96 M240 54 C240 80 162 74 162 96" fill="none" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" />
    <rect x={92} y={98} width={140} height={34} rx={17} fill={N2} className="ta-float" /><text x={162} y={119} fontSize={11.5} fill="#fff" textAnchor="middle" fontWeight={600}>One answer</text>
  </g>,
  /* ---------------- Mainstream companies (Send): no wallets ---------------- */
  mImport: () => <g style={f2}>
    {[["CSV", "customers.csv"], ["API", "Product events"], ["FORM", "Newsletter form"]].map(([k, l], i) => <g key={l} className="ta-pop" style={{ animationDelay: `${i * 0.15}s` }}>
        <rect x={14} y={18 + i * 40} width={170} height={30} rx={8} fill="#fff" stroke={L2} />
        <rect x={21} y={25 + i * 40} width={30} height={16} rx={4} fill="#F0F4FF" /><text x={36} y={36.5 + i * 40} fontSize={8.5} fill={B2} fontWeight={600} textAnchor="middle" style={mono2}>{k}</text>
        <text x={58} y={37 + i * 40} fontSize={11} fill={N2} style={i === 0 ? mono2 : f2}>{l}</text>
        <path d={`M184 ${33 + i * 40} C205 ${33 + i * 40} 205 78 214 78`} fill="none" stroke="#C9D0FF" strokeWidth={1.4} className="ta-dash" />
      </g>)}
    <g className="ta-float"><rect x={214} y={50} width={96} height={56} rx={12} fill="url(#paGrad)" />
      <text x={262} y={74} fontSize={11.5} fill="#fff" fontWeight={600} textAnchor="middle">One record</text><text x={262} y={91} fontSize={10} fill="#DCE3FF" textAnchor="middle">per customer</text></g>
  </g>,
  mSentence: () => <g style={f2}>
    <rect x={14} y={16} width={296} height={30} rx={8} fill="#F0F4FF" stroke="#E4EAFF" />
    <text x={26} y={35} fontSize={11.5} fill={N2} className="ta-type">Signed up in May and never finished setup</text>
    <path d="M160 52 V66" stroke={L2} strokeWidth={1.5} /><path d="M155 62 l5 5 5-5" fill="none" stroke={L2} strokeWidth={1.5} />
    {[["Signed up", "in May"], ["Finished setup", "has NOT"]].map(([a, b], i) => <g key={a} className="ta-pop" style={{ animationDelay: `${1.2 + i * 0.25}s` }}>
        <rect x={14} y={74 + i * 34} width={296} height={28} rx={7} fill={P} />
        <rect x={22} y={79 + i * 34} width={110} height={18} rx={5} fill="#fff" stroke={L2} /><text x={30} y={92 + i * 34} fontSize={10.5} fill={N2}>{a}</text>
        <rect x={140} y={79 + i * 34} width={110} height={18} rx={5} fill="#fff" stroke={i ? B2 : L2} /><text x={148} y={92 + i * 34} fontSize={10.5} fill={i ? B2 : N2}>{b}</text>
      </g>)}
  </g>,
  mLoop: () => <g style={f2}>
    <path d="M20 78 H300" stroke={L2} strokeWidth={2} />
    <circle r={6} fill={B2}><animateMotion dur="3.2s" repeatCount="indefinite" path="M20 78 H178" keyTimes="0;1" /></circle>
    {[["Email", 60], ["Wait 3d", 140], ["Email", 220]].map(([l, x], i) => <g key={i}><rect x={x - 28} y={66} width={56} height={24} rx={6} fill="#fff" stroke={L2} /><text x={x} y={82} fontSize={10.5} fill={N2} textAnchor="middle">{l}</text></g>)}
    <g className="ta-pop" style={{ animationDelay: ".6s" }}><rect x={138} y={104} width={150} height={28} rx={14} fill="#E9F7F0" /><Check x={150} y={114} /><text x={168} y={122} fontSize={11} fill={G2} fontWeight={600}>Finished setup, stop</text></g>
    <line x1={180} x2={180} y1={92} y2={104} stroke={G2} strokeWidth={1.5} strokeDasharray="2 2" />
  </g>,
  mQuestion: () => <g style={f2}>
    <rect x={16} y={14} width={292} height={30} rx={10} fill={B2} /><text x={28} y={33} fontSize={11} fill="#fff" className="ta-type">Who opened the launch email but never upgraded?</text>
    <g className="ta-pop" style={{ animationDelay: "1.3s" }}>
      <rect x={16} y={56} width={292} height={86} rx={10} fill="#fff" stroke={L2} />
      <text x={28} y={76} fontSize={20} fontWeight={600} fill={N2}>642</text><text x={74} y={76} fontSize={10.5} fill={T2}>customers match</text>
      {[["Olivia Hughes", "Opened 2 Sep"], ["Daniel Price", "Opened 2 Sep"], ["Megan Ward", "Opened 1 Sep"]].map(([a, b], i) => <g key={a}><line x1={28} x2={296} y1={86 + i * 18} y2={86 + i * 18} stroke="#ECEDEF" /><text x={28} y={99 + i * 18} fontSize={10.5} fill={N2}>{a}</text><text x={296} y={99 + i * 18} fontSize={10.5} fill={T2} textAnchor="end">{b}</text></g>)}
    </g>
  </g>,
  /* ---------------- Our hypothesis: the four generations ---------------- */
  genEmail: () => <g style={f2}>
    <rect x={40} y={18} width={244} height={120} rx={12} fill="#fff" stroke={L2} />
    <text x={56} y={42} fontSize={12} fontWeight={600} fill={N2}>Spring newsletter</text>
    <text x={56} y={59} fontSize={10.5} fill={T2}>To 12,480 subscribers</text>
    <line x1={56} x2={268} y1={70} y2={70} stroke="#ECEDEF" />
    {[["Opens", "24%", 56], ["Clicks", "3.1%", 166]].map(([a, b, x], i) => <g key={a} className="ta-pop" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
        <rect x={x} y={80} width={102} height={46} rx={8} fill={P} />
        <text x={x + 10} y={97} fontSize={10} fill={T2}>{a}</text>
        <text x={x + 10} y={117} fontSize={16} fontWeight={600} fill={N2}>{b}</text>
      </g>)}
  </g>,
  genAuto: () => <g style={f2}>
    {[["Welcome email", 14, 96], ["Wait 3 days", 126, 82], ["No reply?", 224, 86]].map(([l, x, w], i) => <g key={l} className="ta-pop" style={{ animationDelay: `${i * 0.15}s` }}>
        <rect x={x} y={40} width={w} height={28} rx={7} fill={i === 2 ? "#FFF1EA" : "#fff"} stroke={i === 2 ? "#FFD2BD" : L2} />
        <text x={x + w / 2} y={58} fontSize={11} fill={i === 2 ? O2 : N2} textAnchor="middle">{l}</text>
      </g>)}
    <path d="M110 54 H126 M208 54 H224" stroke={L2} strokeWidth={1.5} />
    <path d="M267 68 V100" stroke="#C9D0FF" strokeWidth={1.5} className="ta-dash" /><path d="M262 94 l5 6 5-6" fill="none" stroke="#C9D0FF" strokeWidth={1.5} />
    <g className="ta-pop" style={{ animationDelay: ".55s" }}><rect x={196} y={104} width={114} height={28} rx={7} fill={B2} /><text x={253} y={122} fontSize={11} fill="#fff" fontWeight={600} textAnchor="middle">Send follow-up</text></g>
  </g>,
  genEvents: () => <g style={f2}>
    {[["Viewed product", 26], ["Added to cart", 64], ["Purchased", 102]].map(([l, y], i) => <g key={l} className="ta-pop" style={{ animationDelay: `${i * 0.15}s` }}>
        <rect x={14} y={y} width={120} height={28} rx={7} fill="#fff" stroke={L2} />
        <circle cx={28} cy={y + 14} r={3.5} fill={i === 2 ? G2 : S} />
        <text x={38} y={y + 18} fontSize={11} fill={N2}>{l}</text>
        <path d={`M134 ${y + 14} C162 ${y + 14} 164 78 186 78`} fill="none" stroke="#C9D0FF" strokeWidth={1.4} className="ta-dash" />
      </g>)}
    <g className="ta-float"><rect x={186} y={50} width={128} height={56} rx={12} fill={N2} />
      <text x={200} y={74} fontSize={11} fill="#fff" fontWeight={600}>Thank-you email</text><text x={200} y={91} fontSize={9.5} fill="#9DA1A8">sent two minutes later</text></g>
  </g>,
  genChain: () => <g style={f2}>
    {[["Deposited 12,400 USDC", 22], ["Staked 2 ETH", 60], ["Voted on proposal 41", 98]].map(([l, y], i) => <g key={l} className="ta-pop" style={{ animationDelay: `${i * 0.15}s` }}>
        <rect x={14} y={y} width={164} height={28} rx={7} fill="#EEF0FF" stroke="#C9D0FF" />
        <rect x={22} y={y + 8} width={12} height={12} rx={3} fill={B2} />
        <text x={42} y={y + 18} fontSize={11} fill={B2}>{l}</text>
        <path d={`M178 ${y + 14} C196 ${y + 14} 194 78 206 78`} fill="none" stroke="#C9D0FF" strokeWidth={1.4} className="ta-dash" />
      </g>)}
    <rect x={206} y={46} width={106} height={64} rx={12} fill="#F7F8FF" stroke={B2} strokeDasharray="4 4" className="pa-pulse" />
    <text x={259} y={74} fontSize={11.5} fill={B2} fontWeight={600} textAnchor="middle">Lifecycle layer</text>
    <text x={259} y={92} fontSize={10} fill={T2} textAnchor="middle">still open</text>
  </g>
};
function PointArt({ kind }) {
  const Art = ART[kind];
  if (!Art) return null;
  return <div className="tool-art point-art" aria-hidden="true">
      <svg viewBox="0 0 324 156" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="paGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#1727E0" /><stop offset="1" stopColor="#2F94FF" /></linearGradient></defs>
        <Art />
      </svg>
    </div>;
}

// components/ns/ProductPage.jsx
var PRODUCTS = [
  { href: "/platform/audience", name: "Audience", line: "Every wallet, email and app account on one customer record." },
  { href: "/platform/segments", name: "Segments", line: "Describe an audience in a sentence and get the rules back." },
  { href: "/platform/loops", name: "Loops", line: "Journeys that start on-chain and stop when the customer acts." },
  { href: "/platform/intelligence-mcp", name: "Intelligence MCP", line: "Ask your app and contract data a question in plain English." }
];
function ProductPage({ href, title, sub, scene, points, faqs, docs, toPoints, toNext }) {
  const others = PRODUCTS.filter((p3) => p3.href !== href);
  return <SiteChrome>
      <div className="wrap">
        <section className="prod-hero">
          <h1 className="h1 load">{title}</h1>
          <p className="sub load" style={{ animationDelay: ".1s" }}>{sub}</p>
          <div className="ctas load" style={{ animationDelay: ".18s" }}>
            <Link className="btn solid lg" href="/early-access">Book a walkthrough</Link>
            {docs ? <a className="btn lg" href={docs} target="_blank" rel="noreferrer">Read the docs</a> : <Link className="btn lg" href="/pricing">See pricing</Link>}
          </div>
        </section>
        <div className="prod-scene">{scene}</div>
        <div className="prod-bridge"><p className="bridge rv"><a href="#points">{toPoints}<span aria-hidden="true">↓</span></a></p></div>
        <section className="prod-points" id="points">
          {points.map((p3) => <div key={p3.title} className="rv">{p3.art && <PointArt kind={p3.art} />}<p className="h4">{p3.title} <span>{p3.body}</span></p></div>)}
        </section>
        <div className="prod-bridge"><p className="bridge rv"><a href="#more-h">{toNext}<span aria-hidden="true">↓</span></a></p></div>
        <section className="prod-more" aria-labelledby="more-h">
          <h2 className="h2 rv" id="more-h">The rest of the platform.</h2>
          <div className="cgrid">
            {others.map((o) => <Link key={o.href} href={o.href} className="ccard rv"><b>{o.name}</b><span>{o.line}</span><em>Explore {o.name} →</em></Link>)}
          </div>
        </section>
        <Faq items={faqs} />
        <CloseCta />
      </div>
    </SiteChrome>;
}

// components/ns/Scenes.jsx
function AudienceScene() {
  return <div className="vis live" data-scene="audience"><div className="stagebox"><div className="ui-pane u" role="img" aria-label="The Audience screen: contacts arrive one by one, then one wallet's record opens with its health score and reachable channels.">
          <div className="u-body" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}><div><div className="u-h">Audience</div><p className="u-p">Wallet-first identity. Segments are channel-aware, so reachable in-app is a different filter from has email.</p></div></div>
            <div className="u-stats"><div className="u-card u-stat"><small>Total contacts</small><b>48</b><span>40 with a wallet · 8 email-only</span></div><div className="u-card u-stat"><small>Email-reachable</small><b>40</b><span>have a linked email</span></div><div className="u-card u-stat"><small>Push-reachable</small><b>32</b><span>signed-in devices</span></div><div className="u-card u-stat"><small>Suppressed</small><b>3</b><span>unsubscribed or bounced</span></div></div>
            <div><span className="u-tabs"><span className="on">Contacts <i>48</i></span><span>Lists <i>4</i></span><span>Tags <i>5</i></span><span>Segments <i>7</i></span><span>Suppressed <i>3</i></span></span></div>
            <div className="u-card"><table className="u-tbl" data-rows><thead><tr><th>Contact</th><th>Reachable via</th><th>Email</th><th className="num">Lifetime</th><th>Last active</th></tr></thead><tbody>
              <tr><td>maya.eth <span className="u-addr">0x24e6…2dae</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span><span><svg><use href="#a-at" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">0.4 ETH</td><td>2h ago</td></tr>
              <tr data-pick><td><span className="u-addr">0x48cc…ef8d</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-addr">wallet1@gmail.com</td><td className="num">4.1 ETH</td><td>6d ago</td></tr>
              <tr><td><span className="u-addr">0x9352…a881</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">7.8 ETH</td><td>1d ago</td></tr>
              <tr><td>sora.eth <span className="u-addr">0x9188…b68d</span></td><td><span className="u-ch"><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">—</td><td className="num">11.5 ETH</td><td>12d ago</td></tr>
              <tr><td><span className="u-addr">0x5a8e…82d0</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span></span></td><td className="u-addr">wallet4@gmail.com</td><td className="num">15.2 ETH</td><td>48d ago</td></tr>
              <tr><td className="u-muted">No wallet <span className="u-chip n" style={{ height: "18px" }}>Email only</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span></span></td><td className="u-addr">subscriber5@example.com</td><td className="num u-muted">—</td><td>5h ago</td></tr>
              <tr><td>tunde.eth <span className="u-addr">0x0dda…08b3</span></td><td><span className="u-ch"><span><svg><use href="#a-mail" /></svg></span><span><svg><use href="#a-phone" /></svg></span></span></td><td className="u-muted">Hidden from your team</td><td className="num">22.6 ETH</td><td>2h ago</td></tr>
            </tbody></table></div>
          </div>
          <div className="u-drawer" data-drawer>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px" }}><svg width="15" height="15" style={{ color: "#1727E0" }}><use href="#a-at" /></svg>Wallet<span style={{ marginLeft: "auto", color: "#767B83" }}>✕</span></div>
            <span className="u-addr">0x48cc…ef8d</span>
            <div className="u-kv2"><div className="u-card"><small>Lifetime value</small><b>4.1 ETH</b></div><div className="u-card"><small>Home chain</small><b>Ethereum</b></div></div>
            <h6>Health</h6>
            <div className="u-card u-health"><div className="sc"><b data-health>61</b><span>Watch</span><em>Activated</em></div><ul><li><span>Active 6d ago</span><span>+38</span></li><li><span>Reachable on 2 channels</span><span>+12</span></li><li><span>4.1 ETH lifetime</span><span>+11</span></li></ul></div>
            <h6>Linked channels</h6>
            <div className="u-link"><span className="ic"><svg><use href="#a-mail" /></svg></span>Email<em className="u-addr">wallet1@gmail.com</em><svg className="ok"><use href="#a-check" /></svg></div>
            <div className="u-link"><span className="ic"><svg><use href="#a-phone" /></svg></span>In-app push<em>device signed in</em><svg className="ok"><use href="#a-check" /></svg></div>
            <div className="u-link"><span className="ic"><svg><use href="#a-at" /></svg></span>X<em>not linked</em></div>
          </div>
        </div></div></div>;
}
function SegmentScene() {
  return <div className="vis live" data-scene="segment"><div className="stagebox"><div className="ui-pane u" style={{ background: "#FBFBFC" }} role="img" aria-label="The segment builder: a sentence is typed, rules for wallet balance over 10 and has not staked in 30 days appear, and a live preview counts up to 1,204 wallets.">
          <div className="u-body" style={{ padding: "18px 20px" }}><div className="u-seg">
            <div className="u-card" style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", fontSize: "14px" }}>New segment<span className="u-chip n">Draft</span></div>
              <div><p className="u-label">Describe your audience</p><div className="u-desc"><svg><use href="#a-spark" /></svg><span className="t" data-type="Base wallets over 10 ETH that have not staked in 30 days" /><span className="u-btn p" data-gen><svg><use href="#a-spark" /></svg>Generate</span></div>
                <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#767B83" }}>The prompt becomes editable rules below, so you can tweak anything by hand.</p></div>
              <div className="u-rule" data-rule><span>Where</span><span className="u-sel">Wallet balance</span><span className="u-sel">is greater than</span><span className="u-sel v">10</span><span style={{ color: "#767B83" }}>✕</span></div>
              <div className="u-rule" data-rule><span>And</span><span className="u-sel">Staked</span><span className="u-sel hot">has NOT done</span><span className="u-sel">last 30 days</span><span style={{ color: "#767B83" }}>✕</span></div>
              <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#585D65" }}><span>+ Add rule</span><span>+ Add group</span></div>
            </div>
            <div className="u-card"><div style={{ fontWeight: "600", fontSize: "14px" }}>Live preview</div>
              <div className="u-big" style={{ marginTop: "12px" }} data-seg-count>1,204</div><div style={{ fontSize: "11.5px", color: "#767B83" }}>matching wallets · updates as you edit</div>
              <div className="u-wl" data-wl><div><span className="ens-ic" style={{ background: "#E5484D" }} />maya.eth <span className="u-addr">0x1A2b…9F3e</span></div><div><span className="ens-ic" style={{ background: "#2F94FF" }} /><span className="u-addr">0x8Cc4…21aB</span></div><div><span className="ens-ic" style={{ background: "#E8A317" }} />leo.eth <span className="u-addr">0xF31d…77c0</span></div></div>
              <div style={{ marginTop: "14px" }}><span className="u-btn"><svg><use href="#a-camp" /></svg>Create campaign from segment</span></div></div>
          </div></div>
        </div></div></div>;
}
function LoopScene() {
  return <div className="vis live" data-scene="loop"><div className="stagebox"><div className="ui-pane u" style={{ background: "#FBFBFC" }} role="img" aria-label="The Loop builder for a dormant 30-day win-back: a goes dormant trigger, an email, a three-day wait and an in-app message draw in, and a customer moves through them.">
          <div className="u-top" style={{ gap: "12px" }}><span>← Loops</span><b style={{ fontSize: "14px" }}>Dormant 30d win-back</b><span className="u-chip g"><i />Ready</span><span>4 nodes · 0 issues</span></div>
          <div className="u-body" style={{ padding: "12px", height: "calc(100% - 44px)" }}><div className="u-flow">
            <div className="u-card u-pal"><h6>On-chain triggers · 6</h6>
              <div className="u-trig"><i>⚡</i><div><b>On-chain event</b><small>Wallet interacts with a contract</small></div></div>
              <div className="u-trig"><i>◇</i><div><b>Holder acquired</b><small>New wallet mints or buys in</small></div></div>
              <div className="u-trig"><i>⇄</i><div><b>Swap completed</b><small>DEX trade or token exchange</small></div></div>
              <div className="u-trig"><i>💧</i><div><b>Liquidity added</b><small>Deposits into your pools</small></div></div>
              <div className="u-trig"><i>⇣</i><div><b>Capital withdrawn</b><small>Burns, unstakes or withdraws</small></div></div></div>
            <div className="u-cv" data-cv><span className="u-token" data-token />
              <div className="u-node trig" data-n><span className="ic" style={{ background: "#FFE4D6", color: "#E04E12" }}><svg><use href="#a-bolt" /></svg></span><div><small>Trigger</small><b>Goes dormant</b></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-mail" /></svg></span><div><small>Send email</small><b>Email · "We miss you"</b><div className="d">Email or reusable template</div></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-wait" /></svg></span><div><small>Wait</small><b>Wait 3 days</b><div className="d">Pause before the next step</div></div></div>
              <div className="u-conn" data-c />
              <div className="u-node" data-n><span className="ic" style={{ background: "#F0F4FF", color: "#1727E0" }}><svg><use href="#a-phone" /></svg></span><div><small>Send in-app</small><b>Push · "Your Hammers are waiting"</b><div className="d">Notification in your app</div></div></div>
              <div className="u-conn" data-c />
              <span className="u-exit" data-n>Exit flow</span>
            </div>
          </div></div>
        </div></div></div>;
}
function McpScene() {
  return <div className="vis live" data-scene="mcp"><div className="stagebox"><div className="ui-pane u" role="img" aria-label="The Intelligence MCP answering wallets that opened but never clicked: the question is sent, the answer streams in and a table of four wallets appears.">
          <div className="u-body" style={{ padding: "18px 20px", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="u-h">Intelligence MCP</div><span style={{ marginLeft: "auto", fontSize: "11.5px", color: "#767B83" }}>Last synced 1m ago · 746 wallets</span><span className="u-btn">Sync wallets</span></div>
            <div><span className="u-tabs" style={{ background: "none", padding: "0" }}><span style={{ boxShadow: "inset 0 -2px 0 #1727E0", borderRadius: "0", color: "#010F31" }}>Chat</span><span>Segments <i>7</i></span></span></div>
            <div className="u-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "420px" }}>
              <div className="u-bub" data-bub>Wallets that opened but never clicked</div>
              <div className="u-msg" data-msg><span className="bot"><svg><use href="#a-brain" /></svg></span><div>
                <div className="u-steps" data-steps><span><svg><use href="#a-check" /></svg>Read email and push engagement</span><span><svg><use href="#a-check" /></svg>Joined 746 wallets across both lanes</span></div>
                <div data-stream>Here&rsquo;s what I found for <b>&ldquo;Wallets that opened but never clicked&rdquo;</b>: the wallets that engaged, and how that engagement trends week over week.</div>
                <div className="u-ans" data-ans><div className="bar"><span className="on">Table</span><span>Chart</span><span>SQL</span></div>
                  <table className="u-tbl"><thead><tr><th>Wallet</th><th className="num">Opens</th><th className="num">Clicks</th><th className="num">Last seen</th></tr></thead><tbody data-rows2>
                    <tr><td><span className="ens-ic" style={{ background: "#E5484D" }} />maya.eth <span className="u-addr">0x1A2b…9F3e</span></td><td className="num">4</td><td className="num">0</td><td className="num">Jul 22</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#8E4FD8" }} /><span className="u-addr">0x50E8…F401</span></td><td className="num">3</td><td className="num">0</td><td className="num">Jul 21</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#D84FB5" }} />dami.eth <span className="u-addr">0xDD02…B2Cd</span></td><td className="num">3</td><td className="num">0</td><td className="num">Jul 21</td></tr>
                    <tr><td><span className="ens-ic" style={{ background: "#17A66B" }} /><span className="u-addr">0xA27d…1e2F</span></td><td className="num">2</td><td className="num">0</td><td className="num">Jul 19</td></tr>
                  </tbody></table>
                  <div className="acts"><span className="u-btn"><svg><use href="#a-seg" /></svg>Save as segment</span><span className="u-btn"><svg><use href="#a-camp" /></svg>Create campaign</span><span className="u-btn" style={{ borderColor: "transparent" }}>Export CSV</span></div></div>
              </div></div>
            </div>
          </div>
        </div></div></div>;
}

// app/platform/audience/page.jsx
var metadata2 = {
  title: "Audience",
  description: "OnchainSuite Audience puts every wallet, email and app account on one customer record, with the channels that reach each person and their lifecycle stage.",
  alternates: { canonical: "/platform/audience" }
};
function AudiencePage() {
  return <ProductPage
    toPoints="Here is what one record changes for your growth team."
    toNext="Once everyone is on one record, the next step is choosing who to talk to."
    href="/platform/audience"
    docs={DOCS.audience}
    title="Every wallet, email and app account on one customer record."
    sub="Audience brings your lists, your product and your contracts together, so each person has one record that shows what they did and how you can reach them."
    scene={<AudienceScene />}
    points={[
      { title: "Two lanes on one record.", body: "What someone did in your app and what their wallet did on-chain are read together, instead of being pieced together from two tools.", art: "lanes" },
      { title: "Contacts with only a wallet.", body: "A customer who never gave you an email still has a record, and you can still reach them in-app.", art: "walletOnly" },
      { title: "Reachable at a glance.", body: "Every record shows which channels work for that person, by email, in-app or both, before you build a campaign.", art: "reach" },
      { title: "Lifecycle stage and health on every record.", body: "Each customer sits in a stage from new to dormant, with a health score and the reasons behind it underneath.", art: "health" },
      { title: "Bring in what you already hold.", body: "Import a CSV or a Google Sheet, connect Segment or Zapier, or link the wallet logins your product already uses, such as Privy, Dynamic and Web3Auth.", art: "importIn" },
      { title: "No guessing who someone is.", body: "We never find someone's email by looking at their wallet. Links come from data you already hold or a connection the customer makes themselves.", art: "noGuess" }
    ]}
    faqs={[
      { q: "What makes a record in OnchainSuite?", a: "A wallet, an email address or an app account can each start a record. When the same person shows up through more than one, the activity goes onto one record rather than three." },
      { q: "Do you find email addresses from wallets?", a: "No. A wallet is only linked to an email or an account when you already hold that link, or when the customer connects them themselves." },
      { q: "How do I reach a wallet with no email?", a: "By in-app message. It appears the next time that wallet opens your product, so it reaches customers who come back rather than people who have gone for good." },
      { q: "Which chains can Audience read?", a: "Ethereum, Base, Arbitrum, Optimism and Polygon, read into one record per customer." }
    ]}
  />;
}

// app/platform/segments/page.jsx
var metadata3 = {
  title: "Segments",
  description: "Build OnchainSuite segments from what customers did and from what they have not done, by describing the audience in a sentence and seeing a live count.",
  alternates: { canonical: "/platform/segments" }
};
function SegmentsPage() {
  return <ProductPage
    toPoints="Here is what you can build with it."
    toNext="A segment on its own sends nothing. Loops and campaigns are what put it to work."
    href="/platform/segments"
    docs={DOCS.audience}
    title="Describe an audience in a sentence and get the rules back."
    sub="Segments turn what customers did in your app and on-chain into an audience you can send to, with a live count while you edit."
    scene={<SegmentScene />}
    points={[
      { title: "Write it the way you would say it.", body: "Type who you want, such as Base wallets over 10 ETH that have not staked in 30 days, and OnchainSuite writes the rules for you to adjust by hand.", art: "sentence" },
      { title: "Rules that say has not.", body: "Find the people who stopped doing something, which is where retention starts and where an email tool sees nothing.", art: "hasNot" },
      { title: "A live count before you send.", body: "See how many wallets match, and who they are, while you are still editing the rules.", art: "liveCount" },
      { title: "Built from both lanes.", body: "Mix wallet balances and contract activity with app events, list membership and email engagement in the same segment.", art: "mixLanes" },
      { title: "One audience, every use.", body: "Use a segment for a one-off campaign, as the entry point of a Loop, or as the answer to a question you asked the Intelligence MCP.", art: "oneAudience" },
      { title: "Channel-aware by default.", body: "Reachable in-app is a different filter from has an email, so you always know which part of a segment a channel can reach.", art: "channelAware" }
    ]}
    faqs={[
      { q: "Can a segment use on-chain activity?", a: "Yes. A segment can include what a wallet did on your contracts, its balance and the chains it uses, alongside app and email activity." },
      { q: "What does has not mean in a rule?", a: "It finds customers who did not do something in a period, such as wallets that have not staked in the last 30 days. Those rules scan the whole event history, so the count is estimated from a sample while you edit." },
      { q: "Do segments update on their own?", a: "Yes. Saved segments refresh as new activity comes in, so a Loop or campaign that uses one always reaches the people who match today." }
    ]}
  />;
}

// app/platform/loops/page.jsx
var metadata4 = {
  title: "Loops",
  description: "OnchainSuite Loops are automated customer journeys that start from on-chain and off-chain activity, send by email or in-app, and stop when the customer acts.",
  alternates: { canonical: "/platform/loops" }
};
function LoopsPage() {
  return <ProductPage
    toPoints="Here is what a Loop does once it is running."
    toNext="When you are not sure who needs a Loop, you can ask the Intelligence MCP."
    href="/platform/loops"
    docs={DOCS.automation}
    title="Journeys that start on-chain and stop the moment the customer acts."
    sub="A Loop is an automated customer journey. It waits, checks a condition, sends by email or in-app, and ends when the action is recorded on your contract."
    scene={<LoopScene />}
    points={[
      { title: "Starts from the chain.", body: "Six on-chain triggers, including a wallet going dormant, capital withdrawn and a holder acquired, sit next to form submissions, list joins and email opens.", art: "chainTrigger" },
      { title: "Stops when the customer acts.", body: "A Loop reads the contract, so the moment someone makes the deposit you were waiting for, they leave the journey and stop getting nudges.", art: "stopsWhenActs" },
      { title: "Email and in-app in one journey.", body: "Send an email, wait three days, then show an in-app message to the wallets that did not respond.", art: "emailInapp" },
      { title: "Holdouts on every Loop.", body: "Hold a share of customers back so the lift you report is measured against people who got nothing.", art: "holdout" },
      { title: "Every entry accounted for.", body: "See who completed, who is still waiting and who left, and why, from the Loop's own stats.", art: "entries" },
      { title: "Templates to start from.", body: "Begin with a welcome, a dormant win-back or a first-trade nudge, and change it to fit your product.", art: "templates" }
    ]}
    faqs={[
      { q: "What is a Loop?", a: "One automated customer journey, started by one behaviour. It can wait, branch on a condition, send by email or in-app, and it ends when the customer does what it was waiting for." },
      { q: "Can a Loop start from something that happens off-chain?", a: "Yes. As well as the on-chain triggers, a Loop can start when someone submits a form, joins a list, enters a segment or opens an email." },
      { q: "How do I know a Loop worked?", a: "Every Loop can hold a share of customers back, so you compare people who went through it with people who did not, and the conversion counts what happened on-chain." }
    ]}
  />;
}

// app/platform/intelligence-mcp/page.jsx
var metadata5 = {
  title: "Intelligence MCP",
  description: "Ask OnchainSuite's Intelligence MCP a question in plain English and get a table, a chart and the SQL behind it, across your app and your contracts.",
  alternates: { canonical: "/platform/intelligence-mcp" }
};
function McpPage() {
  return <ProductPage
    toPoints="Here is what you can do with an answer."
    toNext="Every answer comes from the same record, the same segments and the same Loops."
    href="/platform/intelligence-mcp"
    docs={DOCS.intelligence}
    title="Ask your app and contract data a question in plain English."
    sub="The Intelligence MCP turns your question into a query across both lanes, so nobody on your team has to write SQL to find out who to talk to."
    scene={<McpScene />}
    points={[
      { title: "Questions, not queries.", body: "Ask who traded during the final and has not placed a position since, or which wallets opened but never clicked, and get the answer back as data.", art: "question" },
      { title: "Table, chart and SQL.", body: "Every answer comes in all three, so you can read it quickly and still check the working.", art: "tableChartSql" },
      { title: "From answer to audience.", body: "Save an answer as a segment, or turn it into a campaign, without exporting anything.", art: "answerToSegment" },
      { title: "Nothing runs until you approve it.", body: "The Intelligence MCP can propose a campaign or a Loop, and it waits for you to review it before anything is sent.", art: "approve" },
      { title: "In the tools you already use.", body: "Because it is an MCP, your team can ask the same questions from the AI tools they already work in.", art: "mcpTools" },
      { title: "Both lanes in one question.", body: "Combine what customers did on your contracts with their app and email activity in a single question.", art: "bothLanesQ" }
    ]}
    faqs={[
      { q: "Do I need to know SQL?", a: "No. You ask in plain English. The SQL is shown alongside every answer for anyone who wants to check it." },
      { q: "Can it send messages on its own?", a: "No. It can propose a campaign or a Loop, and nothing runs until someone on your team approves it." },
      { q: "What is an MCP?", a: "The Model Context Protocol is an open standard that lets AI tools connect to a data source. It means your team can ask OnchainSuite questions from the assistants they already use." }
    ]}
  />;
}

// app/platform/data/page.jsx
var metadata6 = {
  title: "How we use data",
  description: "How OnchainSuite reads the product and smart contract lanes, joins them into one customer record, starts from Atlas history and protects addresses.",
  alternates: { canonical: "/platform/data" }
};
var LANES = [
  { k: "Product lane", d: "What a customer does inside your application, such as registering, completing setup or using a feature.", e: ["Signed up", "Finished setup", "Last opened the app"] },
  { k: "Smart contract lane", d: "What the same customer's wallet does on the blockchain, such as depositing, withdrawing or transferring.", e: ["Deposited 12,400 USDC", "Withdrew 9,800 USDC", "No activity for 60 days"] },
  { k: "Messages you send", d: "Delivery and engagement from the emails and in-app messages you send, next to what each customer did in both lanes.", e: ["Opened 3 of 4 emails", "Viewed an in-app message", "Clicked through"] }
];
var ENGINE = [
  { n: "01", t: "Chain Normalisation System", d: "Turns the strings of numbers on each supported blockchain into consistent records, keeping the network, the application, the time and the units each one came from." },
  { n: "02", t: "Protocol Normalisation System", d: "Reads those records as business actions your team recognises, such as a deposit, a withdrawal or a membership activation, tied to the right contract version." },
  { n: "03", t: "Identity matching", d: "Attaches each action to the right customer, whether they first arrived through an email address, an application account or a wallet." }
];
var ZK_STEPS = [
  { t: "The customer submits their email through an OnchainSuite form.", d: "ZK Shield works with OnchainSuite forms only for now, so data captured in your own forms is not covered." },
  { t: "They prove they belong to your audience without revealing who they are.", d: "A zero-knowledge proof, built on the open-source Semaphore library, confirms the fact without exposing the data behind it." },
  { t: "They prove they control the wallet and the email address.", d: "The wallet by signing with it, and the address by entering a one-time code sent to it." },
  { t: "The address is stored encrypted, and your team never sees it.", d: "When a campaign or a Loop sends, the delivery step resolves the address. Your team sees a wallet record and a delivered message." }
];
var NEVER = [
  "Hold your funds or your customers' funds, or any private keys.",
  "Sign or initiate a transaction. Our access to the chain is read-only.",
  "Find someone's email address by looking at their public wallet.",
  "Link a wallet to a person unless you already hold that link, or the customer makes it themselves."
];
var FAQS = [
  { q: "Where does the on-chain data come from?", a: "From Atlas, the blockchain data warehouse OnchainSuite reads from, which we built with Datum Labs. CNS and PNS then turn those records into actions on your customer records." },
  { q: "Do you support every application and chain?", a: "No. CNS and PNS cover the chains and applications we support, and Atlas holds history for lending, perpetuals and real-world-asset applications on EVM chains. Before you sign up, we check which of your contracts and records we support." },
  { q: "Is ZK Shield live?", a: "It is built and is being brought into the released product. Today it protects addresses from your own team; our backend can still decrypt an address in order to send. A later phase moves that step into a sealed processing area so our own staff cannot read it either." },
  { q: "Who controls the data in my workspace?", a: "You do. You decide what to bring in and who to message, and we process it on your behalf under our Data Processing Agreement." }
];
function DataPage() {
  return <SiteChrome>
      <div className="wrap">
        <section className="prod-hero">
          <h1 className="h1 load">How OnchainSuite uses your data.</h1>
          <p className="sub load" style={{ animationDelay: ".1s" }}>We read the two lanes your customers leave a record in, join them into one record per person, and never hold funds or keys.</p>
        </section>

        <section className="dl-sec" aria-labelledby="lanes-h">
          <h2 className="h2 rv" id="lanes-h">Your customers leave a record in two places. <span>OnchainSuite reads both at source, adds the results of what you send, and puts them on one record.</span></h2>
          <div className="dl-lanes">
            {LANES.map((l, i) => <div key={l.k} className="dl-lane rv">
                <div className="dl-lane-h"><i className={`dot d${i}`} /><b>{l.k}</b></div>
                <p>{l.d}</p>
                <ul>{l.e.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>)}
          </div>
          <div className="dl-join rv" aria-hidden="true">
            <svg viewBox="0 0 900 90" preserveAspectRatio="none"><path d="M150 0 C150 50 450 40 450 88 M450 0 L450 88 M750 0 C750 50 450 40 450 88" fill="none" stroke="#C9D0FF" strokeWidth="1.5" /></svg>
          </div>
          <div className="dl-record rv">
            <span className="ava">JM</span>
            <div><b>Josh Miller</b><small>0x667c…3fa1 · one record</small></div>
            <span className="chip-s">Completed setup</span><span className="chip-s">Deposited, then withdrew</span><span className="chip-s">Opens emails</span><span className="chip-s warn">At risk</span>
          </div>
        
          <p className="bridge rv"><a href="#engine-h">This is possible with our Lifecycle Intelligence Engine.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec" aria-labelledby="engine-h">
          <h2 className="h2 rv" id="engine-h">Inside the Lifecycle Intelligence Engine. <span>Three systems turn raw records into customers your growth team can understand.</span></h2>
          <div className="dl-eng">
            {ENGINE.map((s) => <div key={s.n} className="rv"><i>{s.n}</i><b>{s.t}</b><span>{s.d}</span></div>)}
          </div>
          <div className="dl-tx rv" aria-label="Example: a contract event becomes an action">
            <div><small>Raw contract event</small><code>Deposit(0x667c…3fa1, 12400000000)</code></div>
            <span aria-hidden="true">→</span>
            <div><small>Consistent record</small><code>Base · USDC · 12,400.00 · 14:02 UTC</code></div>
            <span aria-hidden="true">→</span>
            <div><small>Business action</small><b>Josh deposited 12,400 USDC into the vault</b></div>
          </div>
        
          <p className="bridge rv"><a href="#atlas-h">The engine reads the chain from Atlas, which is why you start with history.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec dl-atlas" aria-labelledby="atlas-h">
          <div>
            <h2 className="h2 rv" id="atlas-h">Atlas means you start from history. <span>Not from an empty table.</span></h2>
            <p className="atlas-def rv">Atlas is the blockchain data warehouse OnchainSuite reads from, built with Datum Labs. It holds backfilled, decoded records for lending, perpetuals and real-world-asset applications across EVM chains, going back to the first block. If your product is one of those, your customers arrive with their history already attached.</p>
          <p className="bridge rv"><a href="#zk-h">Once the history is in place, the next question is who on your team can see a customer's address.<span aria-hidden="true">↓</span></a></p>
          </div>
          <div className="stats">
            <div className="rv"><b>5 TB+</b><span>of decoded contract data</span></div>
            <div className="rv"><b>Genesis</b><span>backfilled to the first block</span></div>
            <div className="rv"><b>60 days</b><span>of recent activity in a fast query store</span></div>
            <div className="rv"><b>Data lake</b><span>for everything older</span></div>
          </div>
        </section>

        <section className="dl-sec" aria-labelledby="zk-h">
          <h2 className="h2 rv" id="zk-h">ZK Shield lets your team message a customer without seeing their address.</h2>
          <ol className="dl-zk">
            {ZK_STEPS.map((s, i) => <li key={s.t} className="rv"><i>{String(i + 1).padStart(2, "0")}</i><b>{s.t}</b><span>{s.d}</span></li>)}
          </ol>
        
          <p className="bridge rv"><a href="#never-h">There are also things we never do with any of it.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec dl-never" aria-labelledby="never-h">
          <h2 className="h2 rv" id="never-h">What we never do.</h2>
          <ul>{NEVER.map((n) => <li key={n} className="rv">{n}</li>)}</ul>
          <p className="dl-links rv">The details are in our <Link href="/dpa">Data Processing Agreement</Link>, <Link href="/privacy">Privacy Policy</Link> and <Link href="/subprocessors">list of sub-processors</Link>.</p>
        </section>

        <Faq items={FAQS} />
        <CloseCta />
      </div>
    </SiteChrome>;
}

// components/ns/ForPage.jsx
function ForPage({ title, sub, lanesTitle, lanes, toPoints, pointsTitle, points, toPlan, plan, faqs, mainstream }) {
  return <SiteChrome>
      <div className="wrap">
        <section className="prod-hero">
          <h1 className="h1 load">{title}</h1>
          <p className="sub load" style={{ animationDelay: ".1s" }}>{sub}</p>
          <div className="ctas load" style={{ animationDelay: ".18s" }}>
            <Link className="btn solid lg" href="/early-access">Book a walkthrough</Link>
            <Link className="btn lg" href="/pricing">See pricing</Link>
          </div>
        </section>

        <section className="dl-sec" aria-labelledby="lanes-h">
          <h2 className="h2 rv" id="lanes-h">{lanesTitle}</h2>
          <div className="dl-lanes">
            {lanes.map((l, i) => <div key={l.k} className={"dl-lane rv" + (l.off ? " off" : "")}>
                <div className="dl-lane-h"><i className={`dot d${i}`} /><b>{l.k}</b>{l.off && <span className="tag">{l.off}</span>}</div>
                <p>{l.d}</p>
                <ul>{l.e.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>)}
          </div>
          <p className="bridge rv"><a href="#points-h">{toPoints}<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec" aria-labelledby="points-h">
          <h2 className="h2 rv" id="points-h">{pointsTitle}</h2>
          <div className="prod-points for-points">
            {points.map((p3) => <div key={p3.title} className="rv"><PointArt kind={p3.art} /><p className="h4">{p3.title} <span>{p3.body}</span></p></div>)}
          </div>
          <p className="bridge rv"><a href="#plan-h">{toPlan}<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec" aria-labelledby="plan-h">
          <div className="sendcard rv">
            <div>
              <h2 className="h3" id="plan-h" style={{ margin: 0 }}>{plan.name}</h2>
              <p className="price"><b>{plan.price}</b><span>{plan.unit}</span></p>
              <p className="formula" style={{ marginTop: 0 }}>{plan.line}</p>
            </div>
            <div>
              <ul className="checks">{plan.items.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="upsell">{plan.other}</p>
              <Link className="btn solid lg" href="/early-access">Book a walkthrough</Link>
            </div>
          </div>
          <p className="bridge rv"><a href="#faq-h">Still deciding? These are the questions teams like yours ask us.<span aria-hidden="true">↓</span></a></p>
        </section>

        <Faq items={faqs} />
        <CloseCta mainstream={mainstream} />
      </div>
    </SiteChrome>;
}

// app/for/blockchain-companies/page.jsx
var metadata7 = {
  title: "OnchainSuite for blockchain companies",
  description: "OnchainSuite reads what customers do in your app and what their wallets do on-chain, adds how they respond to your messages, and answers in plain English.",
  alternates: { canonical: "/for/blockchain-companies" }
};
function BlockchainCompanies() {
  return <ForPage
    title="OnchainSuite for blockchain companies."
    sub="Our software reads what your customers do in your app and what their wallets do on-chain, adds how they respond to what you send, and puts it on one record your growth team can act on."
    lanesTitle={<>Your customers leave a record in two places. <span>We read both, add the results of every message you send, and join them into one record per customer.</span></>}
    lanes={[
      { k: "Product lane", d: "What a customer does inside your application, such as registering, completing setup or using a feature.", e: ["Signed up", "Finished setup", "Last opened the app"] },
      { k: "Smart contract lane", d: "What the same customer's wallet does on the blockchain, read from Atlas and turned into actions your team recognises.", e: ["Deposited 12,400 USDC", "Withdrew 9,800 USDC", "No activity for 60 days"] },
      { k: "Messages you send", d: "Delivery and engagement from your emails and in-app messages, next to what each customer did in both lanes.", e: ["Opened 3 of 4 emails", "Viewed an in-app message", "Clicked through"] }
    ]}
    toPoints="With both lanes on one record, here is what your team can do."
    pointsTitle={<>Act on what customers do, on-chain and off. <span>Segments, campaigns and Loops all read the same record.</span></>}
    points={[
      { title: "Reach customers who only gave you a wallet.", body: "In-app messages reach a connected wallet, so a holder with no email address is still someone you can talk to.", art: "walletOnly" },
      { title: "Start a Loop from something that happened on-chain.", body: "A deposit, a withdrawal or a wallet going quiet can start a Loop, and the Loop stops as soon as the customer acts.", art: "chainTrigger" },
      { title: "See who is slipping before they leave.", body: "Every customer has a lifecycle stage and a health score worked out from what they did in both lanes.", art: "health" },
      { title: "Ask both lanes a question in plain English.", body: "The Intelligence MCP answers from your app and contract data together, and turns the answer into a segment you can message.", art: "bothLanesQ" }
    ]}
    toPlan="All of this comes with the Suite plan, priced by the contacts you bring in."
    plan={{
      name: "Suite plan",
      price: "From $39",
      unit: "a month",
      line: "Priced by the contacts you import, from Launch at 2,500 contacts. From 75,000 contacts, Enterprise is a custom deal.",
      items: ["The product lane and the smart contract lane on one record", "Email and in-app messages to connected wallets", "Segments, campaigns and Loops with on-chain triggers", "The Intelligence MCP"],
      other: <>Your product does not use wallets? <Link href="/for/mainstream-companies">The Send plan is built for mainstream companies</Link>, from $6 a month.</>
    }}
    faqs={[
      { q: "Which chains and applications do you support?", a: "CNS and PNS cover the chains and applications we support, and Atlas holds history for lending, perpetuals and real-world-asset applications on EVM chains. Before you sign up, we check which of your contracts and records we support." },
      { q: "What if most of my customers only have a wallet?", a: "That is what in-app messages are for. The in-app SDK authenticates a connected EVM or Solana wallet, so you can reach a customer who never gave you an email address." },
      { q: "Do you hold funds or private keys?", a: "No. Our access to the chain is read-only. We never hold funds, sign transactions or link a wallet to a person unless you already hold that link or the customer makes it." },
      { q: "How is the Suite plan priced?", a: "By the number of contacts you import. Your level follows from that number: Launch up to 24,999 contacts and Growth from 25,000, with extra seats at $10 a month each. From 75,000 contacts, Enterprise is priced as a custom deal." }
    ]}
  />;
}

// app/for/mainstream-companies/page.jsx
var metadata8 = {
  title: "OnchainSuite for mainstream companies",
  description: "OnchainSuite joins what customers do in your product with how they respond to your emails, so your team can find who needs a message. From $6 a month.",
  alternates: { canonical: "/for/mainstream-companies" }
};
function MainstreamCompanies() {
  return <ForPage
    mainstream
    title="OnchainSuite for mainstream companies."
    sub="Our software joins what your customers do in your product with how they respond to your emails, so your team can see who needs a message and send it at the right moment."
    lanesTitle={<>We read the record your product already keeps. <span>Our software joins what customers do in your product with how they respond to every email you send.</span></>}
    lanes={[
      { k: "Product lane", d: "What a customer does inside your product, such as signing up, finishing setup or using a feature, from the records and events you bring in.", e: ["Signed up", "Finished setup", "Last opened the app"] },
      { k: "Messages you send", d: "Delivery and engagement from your emails, next to what each customer did in your product.", e: ["Opened 3 of 4 emails", "Clicked the upgrade link", "Has not opened in 30 days"] },
      { k: "Smart contract lane", off: "Suite plan", d: "What customers' wallets do on the blockchain. The Send plan leaves this lane switched off, and the Suite plan turns it on when your product starts to use wallets.", e: ["Deposits and withdrawals", "Wallet activity", "In-app messages to wallets"] }
    ]}
    toPoints="With your product data and your email results on one record, here is what your team can do."
    pointsTitle={<>Find who needs a message and send it. <span>Segments, campaigns and Loops all read the same record.</span></>}
    points={[
      { title: "Bring in the records you already hold.", body: "Import a CSV or JSON file with automatic column mapping, send product events through the API, and capture new subscribers with forms.", art: "mImport" },
      { title: "Describe an audience in a sentence and get the rules back.", body: "Write who you want to reach in plain English, including people who have not done something yet, and our software builds the segment.", art: "mSentence" },
      { title: "Run Loops by email that stop when the customer acts.", body: "A Loop waits, checks what the customer did and sends the next email, and it stops as soon as they finish the step you care about.", art: "mLoop" },
      { title: "Ask your data a question in plain English.", body: "Ask who opened an email but never upgraded, and get the customers back as a list you can turn into a segment.", art: "mQuestion" }
    ]}
    toPlan="All of this comes with the Send plan, priced on the size of your list."
    plan={{
      name: "Send plan",
      price: "$6",
      unit: "a month plus $3.95 per 1,000 subscribers",
      line: "That is $15.88 a month at 2,500 subscribers, $45.50 at 10,000 and $104.75 at 25,000.",
      items: ["Your product lane and email results on one record", "Email campaigns and Loops", "Segments, including people who have not done something", "AI that answers questions and builds segments in plain English"],
      other: <>Your product uses wallets? <Link href="/for/blockchain-companies">The Suite plan adds the smart contract lane</Link> and in-app messages, from $39 a month.</>
    }}
    faqs={[
      { q: "What is the difference between the Send and Suite plans?", a: "The Send plan is the same software with the blockchain layer switched off, so we read your product data and email results. The Suite plan adds the smart contract lane, in-app messages to wallets and list checks." },
      { q: "How is the Send plan priced?", a: "The Send plan is $6 a month plus $3.95 per 1,000 subscribers. That is $15.88 a month at 2,500 subscribers, $45.50 at 10,000 and $104.75 at 25,000." },
      { q: "Can I send in-app messages on the Send plan?", a: "Not on the Send plan. In-app messages reach a connected wallet, which is part of the Suite plan." },
      { q: "Can I move to the Suite plan later?", a: "Yes. The Suite plan is the same software with the blockchain layer switched on. Book a walkthrough and we will look at the contracts and wallet data you would add." }
    ]}
  />;
}

// app/hypothesis/page.jsx
var metadata9 = {
  title: "Our hypothesis",
  description: "The most important things your users do happen on-chain, and the tools you use to talk to them cannot see it. This is our case for changing that.",
  alternates: { canonical: "/hypothesis" }
};
var DASHBOARD = [
  { k: "Email open rate", v: "42%" },
  { k: "Impressions", v: "18,000" },
  { k: "Signups this week", v: "320" }
];
var USER = [
  { t: "Completed setup", where: "Your app" },
  { t: "Deposited 12,400 USDC", where: "The chain" },
  { t: "Opened your last three emails", where: "Your email tool" },
  { t: "Withdrew 9,800 USDC last week", where: "The chain", tone: "bad" }
];
var GENERATIONS = [
  { n: "01", art: "genEmail", era: "From 1999", t: "Email delivery", d: "Software that could reach a whole list at once, and saw little more than opens and clicks." },
  { n: "02", art: "genAuto", era: "From 2007", t: "Marketing automation", d: "Sequences that followed up on their own: welcome, wait, and try again if there was no reply." },
  { n: "03", art: "genEvents", era: "From 2012", t: "Behavioural lifecycle", d: "Messages sent from what people did in a store, such as browsing, adding to a cart and buying." },
  { n: "04", art: "genChain", era: "Now", t: "Blockchain activity", d: "Deposits, stakes and votes, recorded in public as they happen, and no software yet built natively on them.", now: true }
];
function HypothesisPage() {
  return <SiteChrome>
      <div className="wrap">
        <section className="prod-hero">
          <h1 className="h1 load">Your user withdrew $9,800 last week. Your marketing tools probably still count them as engaged.</h1>
          <p className="sub load" style={{ animationDelay: ".1s" }}>The most important things your users do happen on-chain, and the tools you use to talk to them can&rsquo;t see any of it. This page is our case for changing that.</p>
        </section>

        <section className="dl-sec mf" aria-labelledby="mf-1">
          <h2 className="h2 rv" id="mf-1">Your dashboard says your user is engaged. Their wallet says they&rsquo;re leaving. <span>Open rates and impressions measure your messages. Deposits and withdrawals measure your users.</span></h2>
          <div className="mf-split rv">
            <div className="mf-dash">
              <p className="mf-cap">What the dashboard says</p>
              {DASHBOARD.map((d) => <div key={d.k} className="mf-kpi"><span>{d.k}</span><b>{d.v}</b></div>)}
            </div>
            <div className="mf-josh">
              <p className="mf-cap">What your user actually did</p>
              <ol>{USER.map((j) => <li key={j.t} className={j.tone || ""}><b>{j.t}</b><span>{j.where}</span></li>)}</ol>
            </div>
          </div>
          <p className="bridge rv"><a href="#mf-2">So why can&rsquo;t your tools see the wallet? The answer is in how they were built.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec mf" aria-labelledby="mf-2">
          <h2 className="h2 rv" id="mf-2">Each era of marketing software was won by whoever read the new data first. <span>Email read opens. Automation read replies. Ecommerce tools read carts.</span></h2>
          <div className="mf-zig">
            {GENERATIONS.map((g, i) => <div key={g.n} className={"mf-zig-row rv" + (i % 2 ? " flip" : "") + (g.now ? " now" : "")}>
                <div className="mf-zig-t"><i>{g.n} · {g.era}</i><h3>{g.t}</h3><p>{g.d}</p></div>
                <PointArt kind={g.art} />
              </div>)}
          </div>
          <p className="bridge rv"><a href="#mf-3">The fourth kind of data is the one your user left behind.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec mf" aria-labelledby="mf-3">
          <div className="mf-side">
            <h2 className="h2 rv" id="mf-3">Blockchain data is the most honest record of customer behaviour ever created, and almost no growth team can use it. <span>People click on anything. They only move money when they mean it.</span></h2>
            <div className="rv"><PointArt kind="lanesYou" /></div>
          </div>
          <p className="bridge rv"><a href="#mf-4">Someone had to build the software that reads it.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec mf" aria-labelledby="mf-4">
          <h2 className="h2 rv" id="mf-4">OnchainSuite puts your user&rsquo;s app activity and their wallet on one record, so your team can reach them before they&rsquo;re gone. <span>We read both lanes at source, turn chain records into actions your team recognises, and add the email and app data you already hold.</span></h2>
          <div className="dl-record rv mf-record">
            <span className="ava mf-ava">U</span>
            <div><b>Your user</b><small>0x667c…3fa1 · one record</small></div>
            <span className="chip-s">Completed setup</span><span className="chip-s">Opens your emails</span><span className="chip-s">Withdrew 9,800 USDC</span><span className="chip-s warn">At risk</span>
          </div>
          <div className="mf-seg rv" aria-label="What the team does next">
            <span className="mf-seg-k">Next</span><b>Your user joins &ldquo;Withdrew most of their deposit&rdquo;</b>
            <span className="mf-arrow" aria-hidden="true">→</span><span className="mf-rule ok">A message by email and in-app, the same week</span>
          </div>
          <p className="bridge rv"><a href="#mf-end">No exports, and no developer in the loop. Which brings us to what we believe comes next.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec mf mf-end" aria-labelledby="mf-end">
          <p className="mf-end-line rv" id="mf-end">Email marketing was built on opens. Automation was built on sequences. Ecommerce marketing was built on carts. <span>The next generation will be built on what customers do on-chain, and we&rsquo;re building it.</span></p>
          <p className="mf-sign rv">OnchainSuite</p>
          <p className="bridge rv"><a href="#cta-h">If your team has a live product and customers to keep, here is where to start.<span aria-hidden="true">↓</span></a></p>
        </section>

        <CloseCta />
      </div>
    </SiteChrome>;
}

// app/refer/page.jsx
var metadata10 = {
  title: "Refer a team or become an agency partner",
  description: "Introduce a team that should be using OnchainSuite, or become an agency partner and run OnchainSuite for the companies you work with.",
  alternates: { canonical: "/refer" }
};
var REFER_STEPS = [
  { t: "Tell us who you are introducing.", d: "Book a call and tell us about the company, the person to speak to and what you think they need help with." },
  { t: "We book a walkthrough with them.", d: "We look at the data they already hold and show them how their first journey would run." },
  { t: "We keep you posted.", d: "You hear from us when the conversation moves on, so you are never left wondering." }
];
var PARTNER_STEPS = [
  { t: "Tell us about your agency.", d: "Book a call and tell us who you work with, the growth, lifecycle or community work you run for them, and where you are based." },
  { t: "We walk you through it on a client's data.", d: "We take one of your clients from imported records to a first campaign or Loop, with your team alongside." },
  { t: "We agree how we work together.", d: "We set partner terms with each agency directly, then support you as you bring OnchainSuite to more clients." }
];
function ReferPage() {
  return <SiteChrome>
      <div className="wrap">
        <section className="prod-hero">
          <h1 className="h1 load">Refer a team, or bring OnchainSuite to your clients.</h1>
          <p className="sub load" style={{ animationDelay: ".1s" }}>Introduce a company that needs to know its customers better, or become an agency partner and run OnchainSuite for the companies you work with.</p>
        </section>

        <section className="dl-sec" aria-labelledby="ways-h">
          <h2 className="h2 rv" id="ways-h">Two ways to work with us. <span>One introduction, or an ongoing partnership.</span></h2>
          <div className="cgrid refer-grid">
            <a className="ccard rv" href="#refer-h"><b>Refer a team</b><span>You know a blockchain company or a product team that should be using OnchainSuite, and you would like to introduce us.</span><em>How referrals work ↓</em></a>
            <a className="ccard rv" href="#partner-h"><b>Become an agency partner</b><span>You run growth, lifecycle or community work for clients, and you want to run OnchainSuite for them.</span><em>How partnerships work ↓</em></a>
          </div>
          <p className="bridge rv"><a href="#refer-h">Most partnerships start with a single introduction, so here is how that works.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec" aria-labelledby="refer-h">
          <h2 className="h2 rv" id="refer-h">Refer a team. <span>Introduce us on a call and we will look after them from there.</span></h2>
          <ol className="steps3n" style={{ margin: "40px 0 0" }}>
            {REFER_STEPS.map((s, i) => <li key={s.t} className="rv"><i>{String(i + 1).padStart(2, "0")}</i><b>{s.t}</b><span>{s.d}</span></li>)}
          </ol>
          <div className="ctas rv" style={{ justifyContent: "flex-start", marginTop: 32 }}><Link className="btn solid lg" href="/early-access">Book a call</Link></div>
          <p className="bridge rv"><a href="#partner-h">If you introduce teams often, an agency partnership may suit you better.<span aria-hidden="true">↓</span></a></p>
        </section>

        <section className="dl-sec" aria-labelledby="partner-h">
          <h2 className="h2 rv" id="partner-h">Become an agency partner. <span>Run OnchainSuite for the companies you already work with.</span></h2>
          <ol className="steps3n" style={{ margin: "40px 0 0" }}>
            {PARTNER_STEPS.map((s, i) => <li key={s.t} className="rv"><i>{String(i + 1).padStart(2, "0")}</i><b>{s.t}</b><span>{s.d}</span></li>)}
          </ol>
          <div className="ctas rv" style={{ justifyContent: "flex-start", marginTop: 32 }}><Link className="btn solid lg" href="/early-access">Book a call</Link></div>
        </section>
      </div>
    </SiteChrome>;
}

// app/team/page.jsx
var metadata11 = {
  title: "Team",
  description: "The people building OnchainSuite, the lifecycle and retention platform for blockchain companies, from Birmingham in the United Kingdom.",
  alternates: { canonical: "/team" }
};
var FOUNDERS = [
  {
    name: "Olusegun Isaac Aborode",
    role: "Founder and CEO",
    initials: "OA",
    color: "#1727E0",
    bio: "Leads product, customers, commercial execution and finance. His background combines blockchain data analysis with growth and customer lifecycle work, from data pipelines and wallet analysis to CRM, segmentation and email campaigns."
  },
  {
    name: "Joshua Obafemi",
    role: "Cofounder and CTO",
    initials: "JO",
    color: "#2F94FF",
    bio: "Leads architecture, infrastructure, engineering standards, deployment and security, including the indexing, identity and delivery work that makes on-chain activity something a team can message."
  },
  {
    name: "Joel Obafemi",
    role: "Cofounder and analytics lead",
    initials: "JO",
    color: "#7C5CF6",
    bio: "Leads how application data is interpreted, its quality, the analytical methods behind it and how customer results are measured."
  }
];
var FACTS = [
  ["Company", "OnchainSuite Ltd"],
  ["Registered", "England and Wales, 17370357"],
  ["Based", "Birmingham, United Kingdom"],
  ["Incorporated", "30 July 2026"]
];
function TeamPage() {
  return <SiteChrome>
      <div className="wrap">
        <PageHero
    tag="Team"
    title="The people building OnchainSuite."
    sub="A small team of blockchain data and lifecycle people, building the tool we wanted when we were the ones sending the campaigns."
  />
        <section className="team">
          {FOUNDERS.map((f3) => <article key={f3.name} className="person rv">
              <span className="ava" style={{ color: f3.color, background: `color-mix(in oklab, ${f3.color} 10%, #fff)`, borderColor: `color-mix(in oklab, ${f3.color} 28%, #fff)` }}>{f3.initials}</span>
              <h2>{f3.name}</h2>
              <p className="role">{f3.role}</p>
              <p>{f3.bio}</p>
            </article>)}
        </section>
        <LogoRow label="Trusted by blockchain companies including" />
        <section className="facts">
          {FACTS.map(([k, v]) => <div key={k} className="rv"><small>{k}</small><b>{v}</b></div>)}
        </section>
        <CloseCta />
      </div>
    </SiteChrome>;
}

// app/early-access/page.jsx
var metadata12 = {
  title: "Book a walkthrough",
  description: "Book a fifteen-minute call with OnchainSuite. Bring a problem your team already has and we will show you how that journey would run on your own data.",
  alternates: { canonical: "/early-access" },
  openGraph: {
    title: "Book a walkthrough · OnchainSuite",
    url: "/early-access",
    type: "website",
    description: "A fifteen-minute call with OnchainSuite, on a problem your team already has."
  }
};
function EarlyAccessPage() {
  return <SiteChrome>
      <div className="wrap">
        <section className="book">
          <div className="book-l">
            <h1 className="h1 load" style={{ animationDelay: ".08s" }}>See OnchainSuite on a problem your team already has.</h1>
            <p className="sub load" style={{ animationDelay: ".16s" }}>Pick a time for a fifteen-minute call with our team, and bring the problem you want to solve.</p>
            <ol className="book-steps load" style={{ animationDelay: ".24s" }}>
              <li><b>Bring the problem</b><span>Such as customers who signed up and never made a first deposit.</span></li>
              <li><b>We check the data</b><span>Which records, and on the Suite plan which contracts, we support for it.</span></li>
              <li><b>You see the journey</b><span>How that Loop or campaign would run in OnchainSuite, and which plan fits.</span></li>
            </ol>
            <div className="ctas load" style={{ animationDelay: ".32s", justifyContent: "flex-start" }}>
              <a className="btn solid lg" href={CAL_URL} data-book target="_blank" rel="noreferrer">Choose a time</a>
            </div>
          </div>
          <div className="book-r load" style={{ animationDelay: ".2s" }}><CloseArt /></div>
        </section>
        <LogoRow label="Trusted by blockchain companies including" />
      </div>
    </SiteChrome>;
}

// components/ns/CompareGrid.jsx

// components/ns/VsLockup.jsx
var LOGOS = {
  "customer-io": "/site/compare/customer-io.svg",
  braze: "/site/compare/braze.svg",
  sendgrid: "/site/compare/sendgrid.svg",
  brevo: "/site/compare/brevo.svg",
  galxe: "/site/compare/galxe.svg",
  klaviyo: "/site/compare/klaviyo.png",
  dotdigital: "/site/compare/dotdigital.png",
  emailoctopus: "/site/compare/emailoctopus.svg",
  formo: "/site/compare/formo.png",
  addressable: "/site/compare/addressable.png"
};
function VsLockup({ slug: slug2, name, size = "sm" }) {
  const logo = LOGOS[slug2];
  return <div className={`vsl vsl-${size}`} aria-hidden="true">
      <span className="vsl-t ocs"><svg viewBox="0 0 1908 2867"><path d={MARK} fill="#FFFFFF" /></svg></span>
      <span className="vsl-link"><i /><i /><i /></span>
      <span className="vsl-t them">
        {logo ? <img src={logo} alt="" /> : <b>{name.replace(/^Customer\.io$/, "C").charAt(0)}</b>}
      </span>
    </div>;
}

// components/ns/CompareGrid.jsx
var GROUPS = ["All", "Email platforms", "Lifecycle platforms", "On-chain tools"];
function CompareGrid({ cards }) {
  const [g, setG] = useState5("All");
  const shown = cards.filter((c) => g === "All" || c.group === g);
  return <div className="cgrid-wrap">
      <div className="chips-f" role="group" aria-label="Filter comparisons">
        {GROUPS.map((x) => <button key={x} type="button" aria-pressed={g === x} onClick={() => setG(x)}>
            {x}<span>{x === "All" ? cards.length : cards.filter((c) => c.group === x).length}</span>
          </button>)}
      </div>
      <div className="cgrid">
        {shown.map((c) => <Link key={c.slug} href={`/compare/${c.slug}`} className="ccard">
            <VsLockup slug={c.slug} name={c.name} />
            
            <b>OnchainSuite and {c.name}</b>
            <span>{c.line}</span>
            <em>Read the comparison →</em>
          </Link>)}
      </div>
    </div>;
}

// lib/compare.js
var MATRIX_CAPS = [
  "Pricing",
  "Journeys started by on-chain activity",
  "Contacts with only a wallet, no email",
  "In-app messages to wallets",
  "Email campaigns",
  "Segment on on-chain activity",
  "Several chains read into one record",
  "Automated customer journeys",
  "Telegram / Discord",
  "SMS",
  "Ads / acquisition attribution",
  "Analytics / dashboards",
  "SDK / API",
  "Built for blockchain companies"
];
var OCS_MATRIX = [
  "From $39 a month, priced by contacts",
  "Yes",
  "Yes",
  "Yes",
  "Yes",
  "Yes",
  "Yes",
  "Yes",
  "Roadmap",
  "No",
  "No",
  "Lifecycle and retention",
  "Yes",
  "Yes"
];
var OCS_HIGHLIGHTS = [
  { icon: "bolt", title: "Reads both lanes", desc: "What customers do in your app and what their wallets do on-chain go onto one record, with no export to prepare." },
  { icon: "send", title: "Reaches wallets with no email", desc: "An in-app message needs only the wallet, so customers who never gave you an address still hear from you." },
  { icon: "wand", title: "Loops that stop when the customer acts", desc: "A Loop waits, sends by email or in-app, and ends the moment the action is recorded on the contract." }
];
var MIGRATION_STEPS = [
  { title: "Tell us where your community lives", desc: "A contract address, a project name or your website. We find the contracts and the holders." },
  { title: "Bring in the records you already hold", desc: "Email lists, app accounts and wallets. You give up nothing you have already set up." },
  { title: "Connect a channel and send", desc: "Verify a sending domain for email, or add the SDK for in-app, then start your first Loop." }
];
var COMPETITORS = [
  {
    slug: "klaviyo",
    name: "Klaviyo",
    kind: "Ecommerce marketing",
    intro: "Klaviyo runs email and SMS for ecommerce brands, keyed to store events like orders and carts. OnchainSuite does that same job for blockchain companies, only the triggers come from the chain and the audience is wallets. When one deposits, unstakes, or goes quiet, you reach it by in-app push or email, even if it never gave you an address.",
    whyChoose: "Klaviyo has no wallet identity and no blockchain data. It cannot see a deposit or a wallet going cold, and it cannot message a wallet that never shared an email. That gap is exactly what OnchainSuite was built to close.",
    theyLike: ["Deep ecommerce integrations like Shopify", "Mature email and SMS automation", "Predictive analytics for stores", "A big template and flow library"],
    whenThem: "You run a Web2 store and your customers are email addresses, not wallets.",
    together: "Keep Klaviyo for Web2 email and let OnchainSuite handle the on-chain triggers it cannot see.",
    them: ["Paid by contacts", "No", "No", "App push (Web2)", "Yes", "Web2 events", "No", "Yes", "No", "Yes", "Limited", "Yes", "Yes", "No"],
    faqs: [
      { q: "Can Klaviyo track on-chain activity?", a: "No. Klaviyo reads web and store events. It has no wallet or blockchain source, so it cannot start a journey from a deposit, swap, or stake." },
      { q: "Is OnchainSuite a Klaviyo replacement for blockchain companies?", a: "For on-chain retention, yes. You can also run both and let OnchainSuite own the wallet-native side." },
      { q: "Does OnchainSuite do SMS?", a: "No. We focus on in-app push and email." },
      { q: "Can it reach wallets with no email?", a: "Yes, through in-app push, which needs only the address. Email is for wallets that opt in." }
    ]
  },
  {
    slug: "customer-io",
    name: "Customer.io",
    kind: "Messaging automation",
    intro: "Customer.io automates email, push, and in-app messages off product events your app sends it. OnchainSuite works the same way for wallets, but it reads the events straight from the chain, so nobody has to build a pipeline first.",
    whyChoose: "Customer.io is strong at event-driven messaging, but the events come from your app through its SDK. There is no wallet identity and no chain data underneath. OnchainSuite captures on-chain activity for you and lets you message wallets directly.",
    theyLike: ["Flexible visual workflows", "A first-class developer and API experience", "Email, push, in-app, and SMS in one place", "Solid data and deliverability controls"],
    whenThem: "You run a Web2 app and already pipe first-party product events into a messaging tool.",
    together: "If you are standardised on Customer.io, forward on-chain events into it. Or let OnchainSuite own the wallet-native side end to end.",
    them: ["From ~$100/mo", "No", "No", "Yes", "Yes", "Web2 events", "No", "Yes", "No", "Yes", "No", "Basic", "Yes", "No"],
    faqs: [
      { q: "Does Customer.io read wallet data?", a: "No. It acts on events you send it. On-chain activity would be yours to capture and forward; OnchainSuite does that for you." },
      { q: "Is OnchainSuite as flexible?", a: "For on-chain retention, yes, with wallet identity and ready-made Loops. Customer.io stays broader for generic Web2 lifecycle messaging." },
      { q: "Can I message wallets with no email?", a: "Yes, by in-app push. Customer.io needs a known Web2 identifier and channel." },
      { q: "How long is setup?", a: "Point OnchainSuite at your contracts and bring in the records you already hold. We read the chain into actions for you, so there is no pipeline for your engineers to build." }
    ]
  },
  {
    slug: "braze",
    name: "Braze",
    kind: "Enterprise engagement",
    intro: "Braze runs cross-channel messaging for large consumer apps. OnchainSuite brings that always-on model to blockchain companies, built around wallets and on-chain behaviour instead of Web2 profiles, and it does not need a data engineering project to start.",
    whyChoose: "Braze is powerful, but it is organised around Web2 identity and app SDKs. It has no wallet identity and no chain triggers. OnchainSuite gives protocol teams the same orchestration on an on-chain foundation, at a fraction of the setup.",
    theyLike: ["Orchestration that scales to millions", "Rich cross-channel journeys", "Strong analytics and experimentation", "A mature integrations ecosystem"],
    whenThem: "You are a large consumer app with a Web2 identity graph that needs enterprise governance and scale.",
    together: "Big orgs can run Braze for Web2 channels and OnchainSuite for the wallet-native, on-chain-triggered layer.",
    them: ["Contact sales", "No", "No", "Yes", "Yes", "Web2 profiles", "No", "Yes", "Partial", "Yes", "No", "Yes", "Yes", "No"],
    faqs: [
      { q: "Can Braze message wallets?", a: "Not on its own. Braze targets known users on channels tied to Web2 identifiers. OnchainSuite reaches wallets directly with in-app push." },
      { q: "Is OnchainSuite cheaper?", a: "Usually. The Suite plan starts at $39 a month on Launch, with no enterprise minimum, against Braze's contact-sales model." },
      { q: "Does it scale for large protocols?", a: "Yes. Pricing scales with the contacts you bring in, from Launch to Enterprise." },
      { q: "How is on-chain data handled?", a: "We read cross-chain activity into clean events and segments, so you skip the data engineering." }
    ]
  },
  {
    slug: "dotdigital",
    name: "Dotdigital",
    kind: "Email marketing",
    intro: "Dotdigital is a cross-channel email and automation suite for ecommerce and B2B teams. OnchainSuite covers the same retention job for blockchain companies, driven by what wallets do on-chain and delivered to wallets rather than mailing-list contacts.",
    whyChoose: "Dotdigital is a capable marketing suite, but it is entirely Web2. There is no wallet identity and no on-chain trigger. OnchainSuite is built to act on wallet behaviour Dotdigital cannot see.",
    theyLike: ["Solid email and cross-channel automation", "Ecommerce and CRM integrations", "Good deliverability tooling", "Established support and services"],
    whenThem: "You need a mature email suite for a Web2 audience.",
    together: "Run Dotdigital for existing Web2 email and OnchainSuite for wallet-native, on-chain retention.",
    them: ["From ~£150/mo", "No", "No", "Limited", "Yes", "Web2 lists", "No", "Yes", "No", "Yes", "No", "Yes", "Yes", "No"],
    faqs: [
      { q: "Does Dotdigital support wallets or crypto?", a: "No. It has no blockchain source and no wallet-native channel." },
      { q: "Why pick OnchainSuite?", a: "Because your key moments are on-chain and your audience is wallets, neither of which Dotdigital can reach." },
      { q: "Can OnchainSuite send email too?", a: "Yes, to wallets that opt in, alongside in-app push for those without one." },
      { q: "Is migration hard?", a: "No. You add an SDK and we read your chains. There is no pipeline to build." }
    ]
  },
  {
    slug: "emailoctopus",
    name: "EmailOctopus",
    kind: "Simple email",
    intro: "EmailOctopus is a cheap, simple email tool built on Amazon SES. OnchainSuite sits in a different category, a retention platform for blockchain companies, but teams often weigh a basic email tool against doing retention properly.",
    whyChoose: "EmailOctopus sends broadcasts and light automations. There is no event pipeline, no wallet identity, and no sense of what happens on-chain. If retention past the newsletter matters, OnchainSuite is the better fit.",
    theyLike: ["Very affordable", "Simple and quick to use", "Good for newsletters", "A clean, no-frills UI"],
    whenThem: "You just need cheap newsletters to a list.",
    together: "Keep EmailOctopus for basic sends and add OnchainSuite when you want on-chain-triggered retention.",
    them: ["Free / from ~$9/mo", "No", "No", "No", "Yes", "List-based", "No", "Basic", "No", "No", "No", "Basic", "Limited", "No"],
    faqs: [
      { q: "Can EmailOctopus trigger on behaviour?", a: "Only basic list automations. There is no product-event or on-chain triggering." },
      { q: "Is OnchainSuite overkill next to it?", a: "If you only send newsletters, EmailOctopus is fine. If you want to retain wallets on on-chain behaviour, the two are not comparable." },
      { q: "Does it cost a lot more?", a: "The Suite plan starts at $39 a month, more than a newsletter tool because we read your contracts as well as your list. Without blockchain data, the Send plan is $6 a month plus $3.95 per 1,000 subscribers." }
    ]
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    kind: "Email API / delivery",
    intro: "Twilio SendGrid is email infrastructure: an API that delivers transactional and marketing mail. OnchainSuite decides who to message and when based on on-chain behaviour, and SendGrid can even be the layer that delivers it.",
    whyChoose: "SendGrid delivers the emails you hand it. It is not a retention engine and has no wallet or chain layer. OnchainSuite supplies the triggers, segments, and in-app push it does not.",
    theyLike: ["Reliable delivery at scale", "A strong developer API", "Good deliverability tooling", "Transactional and marketing email"],
    whenThem: "You want raw sending infrastructure and will build the retention logic yourself.",
    together: "A good pairing. OnchainSuite owns the on-chain triggers, segments, and in-app push; SendGrid handles delivery.",
    them: ["Free / usage-based", "No", "No", "No", "Delivery layer", "Limited", "No", "Basic", "No", "Via Twilio", "No", "Deliverability", "Yes", "No"],
    faqs: [
      { q: "Is SendGrid a competitor?", a: "Only on the delivery slice. OnchainSuite can sit on top of it and adds the triggers, segments, and in-app push SendGrid does not do." },
      { q: "Can I use SendGrid with OnchainSuite?", a: "Yes. SendGrid can be the delivery layer while OnchainSuite drives the logic." },
      { q: "Does OnchainSuite handle deliverability?", a: "We send to opted-in wallets. Teams with strict deliverability needs can pair us with their provider." }
    ]
  },
  {
    slug: "brevo",
    name: "Brevo",
    kind: "SMB marketing CRM",
    intro: "Brevo, once Sendinblue, bundles email, SMS, and a light CRM for small businesses. OnchainSuite handles retention for blockchain companies whose customers are wallets and whose triggers live on-chain.",
    whyChoose: "Brevo is a generic Web2 email and SMS tool. It has no wallet identity and no on-chain events. OnchainSuite acts on wallet behaviour Brevo cannot see.",
    theyLike: ["An affordable all-in-one", "Email, SMS, and a basic CRM", "Easy for small teams", "A generous free tier"],
    whenThem: "You are an SMB wanting email, SMS, and a light CRM in one cheap tool.",
    together: "Use Brevo for generic email and SMS, and OnchainSuite for on-chain wallet retention.",
    them: ["Free / from ~$9/mo", "No", "No", "Limited", "Yes", "Web2 CRM", "No", "Yes", "No", "Yes", "No", "Basic", "Yes", "No"],
    faqs: [
      { q: "Does Brevo work for blockchain companies?", a: "Only as a generic email and SMS tool. It cannot see or act on on-chain behaviour." },
      { q: "Why choose OnchainSuite?", a: "Because your customers are wallets and your triggers are on-chain, neither of which Brevo supports." },
      { q: "Can it fully replace Brevo?", a: "For retention at a blockchain company, yes. If you also need generic SMS marketing, keep a tool like Brevo alongside." }
    ]
  },
  {
    slug: "formo",
    name: "Formo",
    kind: "Onchain analytics",
    intro: "Formo is crypto-native product analytics: funnels, cohort retention, and wallet-level profiling for onchain apps. OnchainSuite is the layer that acts on all of it, turning the same behaviour into automated in-app and email campaigns.",
    whyChoose: "Formo is excellent at telling you what wallets did. It is measurement, though, not messaging. OnchainSuite detects the behaviour and does something about it, automatically.",
    theyLike: ["Excellent onchain product analytics", "Wallet intelligence and profiles", "Offchain to onchain funnels", "SQL and natural-language querying"],
    whenThem: "Your main need is onchain analytics, funnels, and wallet intelligence.",
    together: "A natural pair. Use Formo to understand behaviour and OnchainSuite to act on it. Plenty of teams run both.",
    them: ["Free / $199 / $499", "Analytics", "Yes", "No", "No", "Yes", "Yes", "No", "No", "No", "Attribution", "Yes", "Yes", "Yes"],
    faqs: [
      { q: "Is Formo a direct competitor?", a: "They overlap on onchain data, but Formo leans analytics and OnchainSuite leans messaging. They fit together well." },
      { q: "Can Formo message wallets?", a: "No. Formo is analytics. OnchainSuite provides the in-app push and email that acts on the insight." },
      { q: "Should we run both?", a: "Often yes. Formo for insight, OnchainSuite to act on it." },
      { q: "Does OnchainSuite have analytics?", a: "Basic dashboards for retention and campaigns. Deep product analytics is Formo's strength." }
    ]
  },
  {
    slug: "addressable",
    name: "Addressable",
    kind: "On-chain growth and ads",
    intro: "Addressable helps blockchain companies target ads and attribute acquisition by matching wallets to Web2 identities. OnchainSuite works the other half of the funnel, keeping and re-activating the users you already have.",
    whyChoose: "Addressable is about finding and targeting new wallets through ads. OnchainSuite is about retaining and re-engaging existing ones through owned in-app and email channels triggered by on-chain behaviour.",
    theyLike: ["Wallet-based ad targeting", "Cross-channel acquisition attribution", "Campaign measurement for crypto", "A good fit for paid growth teams"],
    whenThem: "Your priority is paid acquisition and tying ad spend to on-chain outcomes.",
    together: "Acquire wallets with Addressable, then retain and re-engage them with OnchainSuite. Two halves of one funnel.",
    them: ["Contact sales", "Ads / signals", "Yes", "No", "No", "Audiences", "Yes", "No", "No", "No", "Yes", "Attribution", "Yes", "Yes"],
    faqs: [
      { q: "Which do I need?", a: "Different halves of the funnel. Addressable acquires wallets through ads; OnchainSuite retains and re-engages them." },
      { q: "Does Addressable send retention messages?", a: "No. It handles acquisition and attribution. OnchainSuite owns owned-channel retention." },
      { q: "Can they work together?", a: "Yes. Acquire with Addressable, retain with OnchainSuite." }
    ]
  },
  {
    slug: "galxe",
    name: "Galxe",
    kind: "Quests & credentials",
    intro: "Galxe runs quests, campaigns, loyalty, and on-chain credentials for blockchain communities. OnchainSuite is the always-on layer beneath the campaigns, reacting to real wallet behaviour between them.",
    whyChoose: "Galxe drives engagement through quests, which are moments. OnchainSuite runs continuously in the background, reacting to what wallets actually do and keeping them warm between campaigns.",
    theyLike: ["A large quest and campaign ecosystem", "On-chain credentials and loyalty", "Strong distribution and reach", "A good fit for token and community launches"],
    whenThem: "You want to run quests, airdrops, and credential-based loyalty.",
    together: "Run quests on Galxe, then let OnchainSuite retain and re-engage those wallets based on what they do next.",
    them: ["Free / campaign-based", "Quests", "Yes", "No", "No", "Credentials", "Yes", "Campaigns", "Limited", "No", "No", "Campaign", "Yes", "Yes"],
    faqs: [
      { q: "Can I use both?", a: "Yes. Run quests on Galxe and let OnchainSuite retain those wallets automatically." },
      { q: "Is Galxe a retention tool?", a: "It drives campaign engagement. OnchainSuite provides the always-on retention between campaigns." },
      { q: "Does OnchainSuite run quests?", a: "No. It focuses on behaviour-triggered messaging. Pair it with a quest platform like Galxe." }
    ]
  }
];
function competitorBySlug(slug2) {
  return COMPETITORS.find((c) => c.slug === slug2);
}

// app/compare/page.jsx
var metadata13 = {
  title: "Compare OnchainSuite",
  description: "Fair comparisons between OnchainSuite and the email, lifecycle and on-chain tools teams weigh it against, including when the other tool is the better call.",
  alternates: { canonical: "/compare" }
};
var GROUP = {
  klaviyo: "Email platforms",
  dotdigital: "Email platforms",
  emailoctopus: "Email platforms",
  brevo: "Email platforms",
  sendgrid: "Email platforms",
  "customer-io": "Lifecycle platforms",
  braze: "Lifecycle platforms",
  formo: "On-chain tools",
  addressable: "On-chain tools",
  galxe: "On-chain tools"
};
var ORDER = ["klaviyo", "customer-io", "braze", "brevo", "dotdigital", "emailoctopus", "sendgrid", "formo", "addressable", "galxe"];
var ROWS = [1, 2, 3, 4, 0];
var firstSentence = (s) => s.split(/(?<=\.)\s/)[0];
var tone = (v) => v === "Yes" ? "yes" : v === "No" ? "no" : "part";
function CompareHub() {
  const comps = ORDER.map((s) => COMPETITORS.find((c) => c.slug === s)).filter(Boolean);
  const cards = comps.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind, group: GROUP[c.slug] ?? "Email platforms", line: firstSentence(c.intro) }));
  return <>
      <div className="wrap">
        <PageHero
    tag="Compare"
    title="Every tool your team has already looked at, compared fairly."
    sub="Each page says where the other tool is strong and when it is the better call, and where OnchainSuite does something it cannot."
  />
        <section className="cmp-hub"><CompareGrid cards={cards} /></section>

        <section className="glance" aria-labelledby="glance-h">
          <div className="cmp-intro"><h2 className="h2 rv" id="glance-h">The questions that decide most evaluations. <span>Can it start a journey from the chain, hold a contact with only a wallet, and reach that wallet in-app?</span></h2></div>
          <div className="glance-t">
            <table>
              <thead><tr><th>Platform</th>{ROWS.map((r) => <th key={r}>{MATRIX_CAPS[r]}</th>)}</tr></thead>
              <tbody>
                <tr className="us"><td>OnchainSuite</td>{ROWS.map((r) => <td key={r} className={tone(OCS_MATRIX[r])}>{OCS_MATRIX[r]}</td>)}</tr>
                {comps.map((c) => <tr key={c.slug}><td><a href={`/compare/${c.slug}`}>{c.name}</a></td>{ROWS.map((r) => <td key={r} className={tone(c.them[r])}>{c.them[r]}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <p className="cmp-foot">From each company&rsquo;s public pricing and documentation. If something here is out of date, tell us and we will correct it.</p>
        </section>

        <section className="band26" aria-labelledby="b26">
          <p className="rv" id="b26"><b>26</b>email and marketing platforms we mapped in August 2026, and none of them reads a smart contract or can message a wallet.</p>
        </section>
        <CloseCta />
      </div>
    </>;
}

// app/compare/[slug]/page.jsx
function Val({ v }) {
  if (v === "Yes") return <span className="v yes"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>Yes</span>;
  if (v === "No") return <span className="v no">No</span>;
  return <span className="v">{v}</span>;
}
var ICON = { bolt: "#i-layers", send: "#a-phone", wand: "#a-bolt" };
function ComparePage({ params }) {
  const { slug: slug2 } = params;
  const c = competitorBySlug(slug2);
  if (!c) notFound();
  const others = COMPETITORS.filter((x) => x.slug !== c.slug).slice(0, 3);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f3) => ({ "@type": "Question", name: f3.q, acceptedAnswer: { "@type": "Answer", text: f3.a } }))
  };
  return <>
      <div className="wrap">
        <section className="vs-hero">
          <Link className="crumb load" href="/compare">← All comparisons</Link>
          <div className="load" style={{ animationDelay: ".05s" }}><VsLockup slug={c.slug} name={c.name} size="lg" /></div>
          <h1 className="h1 load" style={{ animationDelay: ".1s" }}>OnchainSuite and {c.name}</h1>
          <p className="sub load" style={{ animationDelay: ".18s" }}>{c.intro}</p>
          <div className="ctas load" style={{ animationDelay: ".26s" }}><Link className="btn solid lg" href="/early-access">Book a walkthrough</Link><Link className="btn lg" href="/pricing">See pricing</Link></div>
        </section>

        <section className="vs-why">
          <div><h2 className="h2 rv">Why blockchain companies choose OnchainSuite over {c.name}. <span>{c.whyChoose}</span></h2></div>
          <div className="vs-hl">
            {OCS_HIGHLIGHTS.map((h) => <div key={h.title} className="rv"><svg aria-hidden="true"><use href={ICON[h.icon] ?? "#i-layers"} /></svg><p className="h4">{h.title}. <span>{h.desc}</span></p></div>)}
          </div>
        </section>

        <section className="cmp" aria-labelledby="fbf">
          <div className="cmp-intro"><h2 className="h2 rv" id="fbf">OnchainSuite and {c.name}, side by side.</h2></div>
          <div className="cmp-table two">
            <div className="cmp-head" role="row"><div role="columnheader" /><div role="columnheader"><b>OnchainSuite</b><span>From $39 a month</span></div><div role="columnheader"><b>{c.name}</b><span>{c.them[0]}</span></div></div>
            {MATRIX_CAPS.map((cap, i) => i === 0 ? null : <div key={cap} className="cmp-row" role="row">
                <div role="rowheader">{cap}</div>
                <div role="cell"><Val v={OCS_MATRIX[i]} /></div>
                <div role="cell"><Val v={c.them[i]} /></div>
              </div>)}
          </div>
        </section>

        <section className="vs-fair">
          <div><h2 className="h2 rv">What teams like about {c.name}.</h2>
            <ul className="checks rv">{c.theyLike.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div className="vs-side">
            <div className="rv"><p className="h4">{c.name} is the better call when <span>{c.whenThem.charAt(0).toLowerCase() + c.whenThem.slice(1)}</span></p></div>
            <div className="rv"><p className="h4">Running both. <span>{c.together}</span></p></div>
          </div>
        </section>

        <section className="vs-steps">
          <div className="cmp-intro" style={{ paddingBottom: 0 }}><h2 className="h2 rv">You give up nothing you have already set up.</h2></div>
          <ol className="steps3n">
            {MIGRATION_STEPS.map((s, i) => <li key={s.title} className="rv"><i>0{i + 1}</i><b>{s.title}</b><span>{s.desc}</span></li>)}
          </ol>
        </section>

        <Faq items={c.faqs} title={`OnchainSuite and ${c.name}, answered`} />

        <section className="vs-more">
          <div className="cmp-intro" style={{ paddingBottom: 28 }} />
          <div className="cgrid">
            {others.map((o) => <Link key={o.slug} href={`/compare/${o.slug}`} className="ccard rv"><VsLockup slug={o.slug} name={o.name} /><b>OnchainSuite and {o.name}</b><span>{o.intro.split(/(?<=\.)\s/)[0]}</span><em>Read the comparison →</em></Link>)}
          </div>
        </section>
        <CloseCta />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>;
}

// components/ns/ToolArt.jsx
var BLUE = "#1727E0";
var SKY = "#2F94FF";
var ORANGE = "#FF6828";
var NAVY = "#010F31";
var LINE = "#DEE0E3";
var MUTE = "#C4C7CC";
var TXT = "#585D65";
var font = { fontFamily: "Instrument Sans, Inter, sans-serif" };
function Dormant() {
  const cols = 9, rows = 4;
  const dormant = /* @__PURE__ */ new Set([3, 7, 11, 14, 19, 22, 26, 30, 33]);
  const back = /* @__PURE__ */ new Set([7, 19, 30]);
  return <>
      {Array.from({ length: cols * rows }, (_, i) => {
    const x = 34 + i % cols * 30, y = 34 + Math.floor(i / cols) * 26;
    const d = dormant.has(i), b = back.has(i);
    return <g key={i}>
            {b && <circle className="ta-ring" cx={x} cy={y} r={9} fill="none" stroke={SKY} strokeWidth={1.5} style={{ animationDelay: `${i % 5 * 0.5}s` }} />}
            <circle cx={x} cy={y} r={7} fill={d ? b ? SKY : "#E4E6EA" : BLUE} className={b ? "ta-wake" : void 0} style={b ? { animationDelay: `${i % 5 * 0.5}s` } : void 0} />
          </g>;
  })}
      <g style={font}>
        <rect x={34} y={140} width={128} height={26} rx={7} fill="#fff" stroke={LINE} />
        <circle cx={48} cy={153} r={4} fill="#E4E6EA" /><text x={58} y={157} fontSize={11.5} fill={TXT}>Dormant</text>
        <circle cx={112} cy={153} r={4} fill={SKY} /><text x={122} y={157} fontSize={11.5} fill={TXT}>Back</text>
        <rect x={188} y={136} width={146} height={34} rx={8} fill={NAVY} />
        <text x={200} y={157} fontSize={12.5} fill="#fff" fontWeight={600}>+$157.7k recovered</text>
      </g>
    </>;
}
function Cpa() {
  return <g style={font}>
      {[{ y: 30, w: 290, c: "#E4E6EA", l: "Spend", v: "$41,000", tc: TXT }, { y: 72, w: 220, c: "#D6DBF8", l: "Wallets connected", v: "4,200", tc: TXT }, { y: 114, w: 160, c: BLUE, l: "Transacted", v: "1,000", tc: "#fff" }].map((r, i) => <g key={r.l}>
          <rect className="ta-grow" x={(360 - r.w) / 2} y={r.y} width={r.w} height={30} rx={8} fill={r.c} style={{ animationDelay: `${i * 0.25}s` }} />
          <text x={(360 - r.w) / 2 + 12} y={r.y + 19.5} fontSize={12} fill={r.tc} fontWeight={500}>{r.l}</text>
          <text x={(360 + r.w) / 2 - 12} y={r.y + 19.5} fontSize={12} fill={r.tc} textAnchor="end" fontWeight={600}>{r.v}</text>
        </g>)}
      <rect x={250} y={152} width={92} height={24} rx={12} fill={ORANGE} />
      <text x={296} y={168} fontSize={12} fill="#fff" textAnchor="middle" fontWeight={600}>$41 each</text>
    </g>;
}
function Reach() {
  const r = 52, c = 2 * Math.PI * r;
  const segs = [{ p: 0.38, col: BLUE, l: "Email" }, { p: 0.22, col: SKY, l: "In-app" }, { p: 0.08, col: ORANGE, l: "Socials" }];
  let acc = 0;
  return <g style={font}>
      <circle cx={110} cy={92} r={r} fill="none" stroke="#ECEDEF" strokeWidth={18} />
      {segs.map((s, i) => {
    const el = <circle
      key={s.l}
      className="ta-draw"
      cx={110}
      cy={92}
      r={r}
      fill="none"
      stroke={s.col}
      strokeWidth={18}
      strokeDasharray={`${s.p * c} ${c}`}
      strokeDashoffset={-acc * c}
      transform="rotate(-90 110 92)"
      style={{ animationDelay: `${i * 0.3}s` }}
    />;
    acc += s.p;
    return el;
  })}
      <text x={110} y={96} fontSize={26} fontWeight={600} fill={NAVY} textAnchor="middle">68</text>
      <text x={110} y={114} fontSize={10.5} fill={TXT} textAnchor="middle">of 100</text>
      {[...segs, { p: 0.32, col: "#ECEDEF", l: "Unreachable" }].map((s, i) => <g key={s.l} transform={`translate(210 ${46 + i * 26})`}>
          <rect width={12} height={12} rx={3} fill={s.col} /><text x={20} y={10.5} fontSize={12} fill={TXT}>{s.l}</text>
          <text x={126} y={10.5} fontSize={12} fill={NAVY} textAnchor="end" fontWeight={600}>{Math.round(s.p * 100)}%</text>
        </g>)}
    </g>;
}
function ChurnRate() {
  const pts = Array.from({ length: 13 }, (_, m) => ({ x: 34 + m * 24 }));
  const ys = Array.from({ length: 13 }, (_, m) => 34 + (1 - Math.pow(0.94, m)) * 190);
  const d = pts.map((p3, i) => `${i ? "L" : "M"}${p3.x} ${ys[i].toFixed(1)}`).join(" ");
  return <g style={font}>
      {[34, 82, 130].map((y) => <line key={y} x1={30} x2={330} y1={y} y2={y} stroke="#ECEDEF" />)}
      <path d={`${d} L322 150 L34 150 Z`} fill="url(#taFill)" />
      <path className="ta-line" d={d} fill="none" stroke={BLUE} strokeWidth={2} pathLength={1} />
      {ys.map((y, i) => i % 3 === 0 ? <circle key={i} cx={pts[i].x} cy={y} r={3.5} fill="#fff" stroke={BLUE} strokeWidth={1.6} /> : null)}
      <circle cx={322} cy={ys[12]} r={5} fill={ORANGE} />
      <rect x={176} y={20} width={152} height={26} rx={7} fill="#fff" stroke={LINE} />
      <text x={188} y={37} fontSize={12} fill={NAVY} fontWeight={600}>6% a month</text>
      <text x={272} y={37} fontSize={12} fill={ORANGE} fontWeight={600}>52%/yr</text>
      <text x={34} y={170} fontSize={10.5} fill={TXT}>Month 1</text><text x={322} y={170} fontSize={10.5} fill={TXT} textAnchor="end">Month 12</text>
    </g>;
}
function ChurnCost() {
  return <g style={font}>
      {Array.from({ length: 12 }, (_, m) => {
    const x = 34 + m * 25, lost = 8 + m * 6.2, kept = lost * 0.3, base = 150;
    return <g key={m} className="ta-rise" style={{ animationDelay: `${m * 0.06}s` }}>
            <rect x={x} y={base - lost} width={16} height={lost - kept} rx={2} fill={ORANGE} opacity={0.85} />
            <rect x={x} y={base - kept} width={16} height={kept} rx={2} fill={BLUE} />
          </g>;
  })}
      <line x1={30} x2={330} y1={150} y2={150} stroke={LINE} />
      <g transform="translate(34 18)">
        <rect width={12} height={12} rx={3} fill={ORANGE} /><text x={18} y={10.5} fontSize={12} fill={TXT}>Lost to churn</text>
        <rect x={112} width={12} height={12} rx={3} fill={BLUE} /><text x={130} y={10.5} fontSize={12} fill={TXT}>Kept by acting earlier</text>
      </g>
      <text x={34} y={170} fontSize={10.5} fill={TXT}>Jan</text><text x={321} y={170} fontSize={10.5} fill={TXT} textAnchor="end">Dec</text>
    </g>;
}
function Ltv() {
  const curve = (life) => Array.from({ length: 31 }, (_, i) => {
    const t = i / 30;
    const v = 1 - Math.exp(-t * 3 * (12 / life));
    return `${i ? "L" : "M"}${(34 + t * 290).toFixed(1)} ${(150 - v * (life / 16) * 110).toFixed(1)}`;
  }).join(" ");
  return <g style={font}>
      {[40, 95, 150].map((y) => <line key={y} x1={30} x2={330} y1={y} y2={y} stroke="#ECEDEF" />)}
      <path d={curve(12)} fill="none" stroke={MUTE} strokeWidth={2} strokeDasharray="4 4" />
      <path className="ta-line" d={curve(16)} fill="none" stroke={BLUE} strokeWidth={2.2} pathLength={1} />
      <g transform="translate(34 18)"><rect width={18} height={3} y={5} fill={MUTE} /><text x={24} y={10.5} fontSize={12} fill={TXT}>8% churn</text>
        <rect x={98} width={18} height={3} y={5} fill={BLUE} /><text x={122} y={10.5} fontSize={12} fill={TXT}>6% churn</text></g>
      <rect x={262} y={44} width={64} height={26} rx={13} fill={NAVY} /><text x={294} y={61} fontSize={12} fill="#fff" textAnchor="middle" fontWeight={600}>+33%</text>
      <text x={34} y={170} fontSize={10.5} fill={TXT}>First transaction</text><text x={324} y={170} fontSize={10.5} fill={TXT} textAnchor="end">Lifetime value</text>
    </g>;
}
var ART2 = { dormant: Dormant, cpa: Cpa, reach: Reach, churnrate: ChurnRate, churncost: ChurnCost, ltv: Ltv };
function ToolArt({ kind, className = "" }) {
  const Art = ART2[kind];
  return <div className={"tool-art " + className} aria-hidden="true">
      <svg viewBox="0 0 360 184" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="taFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SKY} stopOpacity={0.22} /><stop offset="1" stopColor={SKY} stopOpacity={0} /></linearGradient></defs>
        <Art />
      </svg>
    </div>;
}

// app/tools/page.jsx
var metadata14 = {
  title: "Free tools",
  description: "Free calculators for growth teams: dormant wallet reactivation, cost per acquisition, wallet reachability, churn and lifetime value. No signup.",
  alternates: { canonical: "/tools" }
};
var TOOLS = [
  { group: "Acquisition", name: "Cost per acquisition calculator", blurb: "Spend by channel against wallets that actually transacted, so a connected wallet stops counting as an acquisition.", href: "/tools/cost-per-acquisition", art: "cpa" },
  { group: "Audience", name: "Wallet reachability score", blurb: "How much of your base you can message by email, in-app and socials, with each person counted once.", href: "/tools/wallet-reachability-score", art: "reach" },
  { group: "Retention", name: "Wallet churn rate calculator", blurb: "One cohort over one period, then the compounding annual rate and the wallet lifespan it implies.", href: "/tools/wallet-churn-rate", art: "churnrate" },
  { group: "Retention", name: "Wallet churn cost calculator", blurb: "What the wallets you lose each month cost you in revenue over a year.", href: "/tools/churn-calculator", art: "churncost" },
  { group: "Revenue", name: "Wallet lifetime value calculator", blurb: "Lifetime value per wallet, and how much it rises when retention improves.", href: "/tools/ltv-calculator", art: "ltv" }
];
function ToolsHub() {
  return <SiteChrome>
      <div className="wrap">
        <PageHero
    tag="Free tools"
    title="Calculators for the numbers your growth team argues about."
    sub="No signup and no email gate. Every tool runs in your browser and explains how it works underneath."
  />

        <section className="feat">
          <Link href="/tools/dormant-wallet-reactivation" className="feat-card rv">
            <div>
              
              <h2 className="h2">Dormant wallet reactivation calculator. <span>Put a number on the revenue sitting in wallets that stopped showing up, and on what bringing a share of them back is worth.</span></h2>
              <em>Open the calculator →</em>
            </div>
            <ToolArt kind="dormant" className="feat-art" />
          </Link>
        </section>

        <section className="toolgrid">
          {TOOLS.map((t) => <Link key={t.href} href={t.href} className="ccard rv">
              <ToolArt kind={t.art} className="card-art" />
              <b>{t.name}</b><span>{t.blurb}</span><em>Open the calculator →</em>
            </Link>)}
          <div className="ccard soon rv"><b>Got a number you keep working out by hand?</b><span>Tell us on a walkthrough and we may build the calculator next.</span><em><Link href="/early-access">Book a walkthrough →</Link></em></div>
        </section>
        <CloseCta />
      </div>
    </SiteChrome>;
}

// components/ChurnCalculator.jsx
var usd2 = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(n));
var num = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));
function Row({ label, hint, value, min, max, step, onChange, fmt: fmt3 }) {
  return <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A17" }}>{label}</div>
          <div style={{ fontSize: 12.5, color: "#8A93A6", marginTop: 2 }}>{hint}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A17", whiteSpace: "nowrap" }}>{fmt3(value)}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 12, accentColor: ACCENT }} />
    </div>;
}
function ChurnCalculator() {
  const [wallets, setWallets] = useState6(1e4);
  const [churn, setChurn] = useState6(8);
  const [arpu, setArpu] = useState6(40);
  const [lift, setLift] = useState6(25);
  const m = churn / 100;
  const walletsLostYr = wallets * (1 - Math.pow(1 - m, 12));
  const revLostYr = walletsLostYr * arpu * 12;
  const recoveredWallets = walletsLostYr * (lift / 100);
  const recoveredRev = recoveredWallets * arpu * 12;
  return <div style={{ border: "1px solid #DCE7F5", borderRadius: 20, background: "#fff", padding: "28px 26px", boxShadow: "0 1px 2px rgba(26,24,20,.04)" }}>
      <Row label="Active wallets" hint="Wallets currently active" value={wallets} min={500} max={2e5} step={500} onChange={setWallets} fmt={num} />
      <Row label="Monthly churn rate" hint="Share of wallets that leave and do not come back each month" value={churn} min={1} max={30} step={1} onChange={setChurn} fmt={(v) => `${v}%`} />
      <Row label="Revenue per wallet / month" hint="Average monthly revenue per active wallet" value={arpu} min={1} max={500} step={1} onChange={setArpu} fmt={usd2} />
      <Row label="Churn prevented by acting earlier" hint="Share of wallets you keep by reaching them before they leave" value={lift} min={5} max={50} step={1} onChange={setLift} fmt={(v) => `${v}%`} />

      <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid #DCE7F5", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} data-stats>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>Wallets lost / year</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1A1A17", marginTop: 4 }}>{num(walletsLostYr)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>Revenue lost to churn / year</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#E0354F", marginTop: 4 }}>{usd2(revLostYr)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>Kept by acting earlier</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{usd2(recoveredRev)}</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <a href="/early-access" className="ocs-btn-primary" style={{ display: "inline-block", fontSize: 14.5, fontWeight: 600, color: "#fff", background: ACCENT, padding: "11px 18px", borderRadius: 10, textDecoration: "none" }}>
          Keep this revenue with OnchainSuite →
        </a>
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 12, color: "#8A93A6", lineHeight: 1.5 }}>
        Estimates only. A churned wallet is gone for good, so revenue lost assumes it forgoes about 12 months of its average revenue. The kept figure assumes that reaching wallets while they are slipping stops the share you set from churning.
      </p>
    </div>;
}

// app/tools/churn-calculator/page.jsx
var metadata15 = {
  title: "Wallet Churn Cost Calculator",
  description: "Estimate what wallet churn costs your protocol each year, and how much of it you could keep by reaching wallets before they leave. Free, no signup.",
  alternates: { canonical: "/tools/churn-calculator" },
  openGraph: { title: "Wallet Churn Cost Calculator · OnchainSuite", description: "See the annual cost of wallet churn and how much of it acting earlier could keep.", url: "/tools/churn-calculator", type: "website" }
};
var themeVars = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF" };
var h2 = { margin: "48px 0 0", fontSize: 23, fontWeight: 700, letterSpacing: "-.02em", color: "#1A1A17" };
var p = { margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "#3D4A63" };
var FAQ = [
  { q: "What is wallet churn?", a: "Wallet churn is the share of active wallets that stop coming back over a period. Measured against your active base, it shows how much of your traction you give back each month." },
  { q: "How is churn rate calculated?", a: "Churn rate is the wallets lost in a period divided by the wallets active at the start, times 100. Start a month with 5,000 active wallets and lose 400, and monthly churn is 8%." },
  { q: "What is a good churn rate?", a: "It depends on your model and the value of a wallet. Wallet activity moves with the market, so churn can change faster than in subscription software, and 8% a month compounds to about 63% a year. Read it next to lifetime value." }
];
function ChurnCalculatorPage() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f3) => ({ "@type": "Question", name: f3.q, acceptedAnswer: { "@type": "Answer", text: f3.a } })) };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "76px 32px 8px" }} data-pad>
        <h1 style={{ margin: "0", fontSize: "clamp(30px,4vw,46px)", lineHeight: 1.04, letterSpacing: "-.03em", fontWeight: 700, color: "#1A1A17" }}>
          Wallet churn cost calculator
        </h1>
        <p style={{ margin: "18px 0 26px", fontSize: 18, lineHeight: 1.6, color: "#3D4A63" }}>
          Churn is quiet. Wallets stop coming back and nothing flags it. Set your numbers to see what that costs in a
          year, and how much of it you could keep by acting before wallets leave.
        </p>
        <ToolArt kind="churncost" className="hero-banner" />
        <ChurnCalculator />

        <h2 style={h2}>What is wallet churn?</h2>
        <p style={p}>
          Wallet churn is the share of active wallets that stop coming back over a period. For a protocol it is the
          quiet loss: a wallet deposits, then goes cold, and nothing flags it. Measured against your active base, it
          tells you how much of your traction you give back each month.
        </p>

        <h2 style={h2}>How is churn rate calculated?</h2>
        <p style={p}>
          Churn rate is the wallets you lost in a period divided by the wallets active at the start, times 100.
        </p>
        <p style={{ margin: "14px 0 0", padding: "14px 16px", background: "#fff", border: "1px solid #DCE7F5", borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 14.5, color: "#1A1A17" }}>
          churn rate = wallets lost / wallets at start × 100
        </p>
        <p style={p}>
          Start the month with 5,000 active wallets and lose 400, and your monthly churn is 8%. Most teams track it
          monthly, then keep an eye on the annual figure.
        </p>

        <h2 style={h2}>What counts as a good churn rate?</h2>
        <p style={p}>
          It depends on your model and the value of a wallet. Wallet activity moves with the market, so churn can
          change faster than in subscription software. The trap is compounding: 8% a month feels small, but works out near 63% over a year. Read churn
          next to lifetime value, not on its own.
        </p>

        <h2 style={h2}>How to reduce wallet churn</h2>
        <ol style={{ margin: "16px 0 0", paddingLeft: 20 }}>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Act on the moment, not the report.</strong> Trigger a message the second a wallet unstakes or goes quiet, not a week later in a dashboard.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Reach wallets before they are gone.</strong> A dormant-wallet Loop nudges wallets going cold and keeps a share you would otherwise lose to churn.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Reward the wallets that stay.</strong> Usage-based incentives and loyalty keep power wallets active and pull lifetime value up.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Reach wallets you have no email for.</strong> In-app push needs only the address, so you can still reach wallets no email tool can.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Learn why they leave.</strong> Segment churned wallets by what they did last and fix the drop-off.</li>
        </ol>
        <p style={p}>
          OnchainSuite runs each of these as a Loop, started by real on-chain behaviour.{" "}
          <a href="/early-access" style={{ color: ACCENT, fontWeight: 600 }}>Book a walkthrough</a>.
        </p>

        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: ACCENT, fontWeight: 600, margin: "52px 0 0" }}>Related tools</div>
        <div style={{ marginTop: 14, borderTop: "1px solid #DCE7F5" }}>
          {[
    { href: "/tools/ltv-calculator", title: "Wallet LTV calculator", desc: "Lifetime value per wallet, and what lower churn is worth." },
    { href: "/tools", title: "All tools", desc: "Every free calculator for growth teams at blockchain companies." }
  ].map((t) => <a key={t.href} href={t.href} className="ocs-idx-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 14px", borderBottom: "1px solid #DCE7F5", textDecoration: "none" }}>
              <div>
                <div className="ocs-idx-title" style={{ fontSize: 16, fontWeight: 700, color: "#1A1A17" }}>{t.title}</div>
                <div style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: "#3D4A63" }}>{t.desc}</div>
              </div>
              <span style={{ fontSize: 18, color: ACCENT, flex: "none" }} aria-hidden="true">→</span>
            </a>)}
        </div>
        <div style={{ height: 32 }} />
      </main>
      <CloseCta />
      <style>{`.ocs-idx-row{transition:background .15s ease;border-radius:10px}.ocs-idx-row:hover{background:#F1F6FE}.ocs-idx-row:hover .ocs-idx-title{color:var(--acc)}`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
    </SiteChrome>;
}

// components/CostPerAcquisitionCalc.jsx
var mono3 = "'JetBrains Mono',monospace";
var money = (n) => !isFinite(n) || n <= 0 ? "—" : n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "k" : "$" + n.toFixed(n < 100 ? 2 : 0);
var loc = (n) => Math.round(n).toLocaleString("en-US");
var th = { textAlign: "left", padding: "0 8px 10px", fontSize: 11, fontFamily: mono3, letterSpacing: ".04em", textTransform: "uppercase", color: "#767B83", fontWeight: 500 };
var cellInput = { width: "100%", boxSizing: "border-box", border: "1px solid transparent", borderRadius: 4, padding: "7px 8px", fontFamily: mono3, fontSize: 13.5, background: "transparent", outline: "none", color: "#010F31" };
function CostPerAcquisitionCalc() {
  const [ltv, setLtv] = useState7(210);
  const [rows, setRows] = useState7([
    { name: "Paid social", spend: 18e3, connected: 4200, activated: 610 },
    { name: "Quests and campaigns", spend: 26e3, connected: 11500, activated: 1340 },
    { name: "KOL and partnerships", spend: 12e3, connected: 1900, activated: 470 },
    { name: "Organic and referral", spend: 3500, connected: 2600, activated: 820 }
  ]);
  const upd = (i, k, v) => setRows((s) => s.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const num5 = (v) => Math.max(0, Number(v) || 0);
  const cpas = rows.map((r) => r.activated > 0 ? r.spend / r.activated : Infinity);
  const finite = cpas.filter((c) => isFinite(c));
  const worst = finite.length ? Math.max(...finite) : 1;
  const best = finite.length ? Math.min(...finite) : 0;
  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);
  const totalAct = rows.reduce((a, r) => a + r.activated, 0);
  const totalConn = rows.reduce((a, r) => a + r.connected, 0);
  const blended = totalAct > 0 ? totalSpend / totalAct : 0;
  const ratio = blended > 0 ? ltv / blended : 0;
  const bestRow = rows[cpas.indexOf(best)];
  const worstRow = rows[cpas.indexOf(worst)];
  const ranked = rows.slice().sort((a, b) => (a.activated ? a.spend / a.activated : Infinity) - (b.activated ? b.spend / b.activated : Infinity)).map((r) => {
    const cpa = r.activated > 0 ? r.spend / r.activated : Infinity;
    return { name: r.name, cpa: money(cpa), bar: isFinite(cpa) ? Math.max(cpa / worst * 100, 3).toFixed(1) + "%" : "3%", color: isFinite(cpa) && cpa <= blended ? "#2F94FF" : "#FF6828" };
  });
  const steps = [
    { label: "Total spend across channels", value: money(totalSpend) },
    { label: "Wallets connected", value: loc(totalConn) },
    { label: "Made a first transaction", value: loc(totalAct) },
    { label: "Activation rate", value: totalConn > 0 ? (totalAct / totalConn * 100).toFixed(1) + "%" : "—" }
  ];
  const payback = [
    { label: "LTV to CPA ratio", value: ratio > 0 ? ratio.toFixed(1) + ":1" : "—", color: ratio >= 3 ? "#128355" : ratio >= 1 ? "#B53C0B" : "#9B2A2E" },
    { label: "Gross margin per wallet", value: money(ltv - blended), color: "#010F31" },
    { label: "Wallets acquired", value: loc(totalAct), color: "#010F31" },
    { label: "Total spend", value: money(totalSpend), color: "#010F31" }
  ];
  const verdict = !bestRow || !worstRow ? "Add at least one channel with spend and a first-transaction count to see a read." : `${bestRow.name} acquires a transacting wallet for ${money(best)}, against ${money(worst)} on ${worstRow.name}. At an LTV of ${money(ltv)} your blended ratio is ${ratio ? ratio.toFixed(1) : "0"} to 1${ratio >= 3 ? ", which leaves room to spend harder on the cheap end." : ratio >= 1 ? ", which is thin. Activation, not spend, is the lever." : ", which means you are buying wallets that do not pay you back."}`;
  return <div className="ocs-cpa-grid" style={{ alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 20, overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "26%" }}>Channel</th>
                <th style={{ ...th, textAlign: "right" }}>Spend</th>
                <th style={{ ...th, textAlign: "right" }}>Connected</th>
                <th style={{ ...th, textAlign: "right" }}>First tx</th>
                <th style={{ ...th, textAlign: "right" }}>CPA</th>
                <th style={{ ...th, textAlign: "right" }}>Activation</th>
                <th style={{ ...th, width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
    const cpa = r.activated > 0 ? r.spend / r.activated : Infinity;
    const cpaColor = !isFinite(cpa) ? "#9DA1A8" : cpa <= blended ? "#128355" : "#42464D";
    return <tr key={i} style={{ borderTop: "1px solid #ECEDEF" }}>
                    <td style={{ padding: "4px 0" }}><input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} className="ocs-cpa-input" style={{ ...cellInput, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500 }} /></td>
                    <td><input type="number" value={r.spend} onChange={(e) => upd(i, "spend", num5(e.target.value))} className="ocs-cpa-input" style={{ ...cellInput, textAlign: "right" }} /></td>
                    <td><input type="number" value={r.connected} onChange={(e) => upd(i, "connected", num5(e.target.value))} className="ocs-cpa-input" style={{ ...cellInput, textAlign: "right" }} /></td>
                    <td><input type="number" value={r.activated} onChange={(e) => upd(i, "activated", num5(e.target.value))} className="ocs-cpa-input" style={{ ...cellInput, textAlign: "right" }} /></td>
                    <td style={{ textAlign: "right", padding: "0 8px", fontFamily: mono3, fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: cpaColor, whiteSpace: "nowrap" }}>{money(cpa)}</td>
                    <td style={{ textAlign: "right", padding: "0 8px", fontFamily: mono3, fontSize: 13.5, color: "#585D65", whiteSpace: "nowrap" }}>{r.connected > 0 ? (r.activated / r.connected * 100).toFixed(1) + "%" : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button type="button" onClick={() => setRows((s) => s.filter((_, j) => j !== i))} aria-label="Remove channel" style={{ border: 0, background: "transparent", color: "#9DA1A8", cursor: "pointer", padding: 4, lineHeight: 0 }}>
                        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
          <button type="button" onClick={() => setRows((s) => s.concat({ name: "New channel", spend: 0, connected: 0, activated: 0 }))} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #DEE0E3", background: "#FBFBFC", color: "#42464D", fontSize: 13.5, fontWeight: 500, padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Add channel
          </button>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 24 }}>
          <div style={{ fontFamily: mono3, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Cost per acquisition by channel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ranked.map((r, i) => <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, marginBottom: 6 }}>
                  <span style={{ color: "#42464D" }}>{r.name}</span>
                  <span style={{ fontFamily: mono3, fontVariantNumeric: "tabular-nums", color: "#010F31" }}>{r.cpa}</span>
                </div>
                <div style={{ height: 6, background: "#ECEDEF", borderRadius: 2 }}><span style={{ display: "block", height: 6, width: r.bar, background: r.color, borderRadius: 2 }} /></div>
              </div>)}
          </div>
          <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.6, color: "#42464D" }}>{verdict}</p>
        </div>
      </div>

      <div className="ocs-calc-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
          <div style={{ fontFamily: mono3, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83" }}>Worksheet</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
            {steps.map((s) => <div key={s.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #ECEDEF" }}>
                <span style={{ fontSize: 14, color: "#585D65" }}>{s.label}</span>
                <span style={{ fontFamily: mono3, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: "#010F31", whiteSpace: "nowrap" }}>{s.value}</span>
              </div>)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 0 0", borderTop: "2px solid #010F31", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#010F31" }}>Blended CPA</div>
              <div style={{ fontSize: 13, color: "#767B83" }}>{money(totalConn > 0 ? totalSpend / totalConn : 0)} per connect</div>
            </div>
            <span style={{ marginLeft: "auto", flex: "none", fontFamily: mono3, fontSize: 30, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", borderBottom: "2px solid #FF6828", paddingBottom: 2, color: "#010F31" }}>{money(blended)}</span>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderLeft: "2px solid #FF6828", borderRadius: 6, padding: 24 }}>
          <div style={{ fontFamily: mono3, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Payback check</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#010F31" }}>Lifetime value per wallet</label>
            <input type="number" value={ltv} onChange={(e) => setLtv(num5(e.target.value))} className="ocs-v2-input" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #DEE0E3", borderRadius: 4, padding: "10px 12px", fontFamily: mono3, fontSize: 15, outline: "none", color: "#010F31" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {payback.map((p3) => <div key={p3.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 14, color: "#585D65" }}>{p3.label}</span>
                <span style={{ fontFamily: mono3, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: p3.color }}>{p3.value}</span>
              </div>)}
          </div>
        </div>
      </div>

      <style>{`
        .ocs-cpa-grid { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:16px; }
        .ocs-calc-side { position:sticky; top:88px; }
        .ocs-cpa-input:focus { border-color:#FF6828 !important; box-shadow:0 0 0 3px rgba(255,104,40,0.28); }
        .ocs-v2-input:focus { border-color:#FF6828 !important; box-shadow:0 0 0 3px rgba(255,104,40,0.28); }
        @media (max-width:1024px){ .ocs-cpa-grid { grid-template-columns:minmax(0,1fr); } .ocs-calc-side { position:static; } }
      `}</style>
    </div>;
}

// app/tools/cost-per-acquisition/page.jsx
var metadata16 = {
  title: "Cost per acquisition calculator",
  description: "Compare blended and per-channel cost of acquiring a transacting wallet, activation rate, and LTV-to-CPA payback across your channels. Free, no signup.",
  alternates: { canonical: "/tools/cost-per-acquisition" },
  openGraph: { title: "Cost per acquisition calculator · OnchainSuite", description: "Blended and per-channel cost of one acquired wallet.", url: "/tools/cost-per-acquisition", type: "website" }
};
var themeVars2 = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF", color: "#010F31" };
var wrap = { maxWidth: 1200, margin: "0 auto" };
var mono4 = "'JetBrains Mono',monospace";
var ARTICLE = [
  { h: "A connected wallet is not an acquisition", p1: "Most dashboards divide spend by wallets connected, which is why reported CPA at blockchain companies looks impossibly good. Connecting is free, reversible and often incentivised; it tells you almost nothing about whether you bought a user.", p2: "This tool asks for both numbers so you can see the two side by side. The gap between cost per connect and cost per acquisition is your activation problem stated in currency." },
  { h: "Cheap channels are usually cheap for a reason", p1: "Quest platforms and airdrop campaigns reliably produce the lowest cost per connect and, very often, the highest cost per retained wallet. The spend buys attention that leaves the moment the incentive stops.", p2: "Compare CPA against a cohort's actual churn before you shift budget. A channel with double the CPA and half the churn is the cheaper channel, and the blended number will never show you that." },
  { h: "What to do with a bad ratio", p1: "If your LTV to CPA ratio is under three, the instinct is to cut spend. Look at activation first: a channel converting 14 percent of connects into transactions has more headroom in onboarding than in bidding.", p2: "Reactivation is the other lever. A dormant wallet you already paid for costs a fraction of a new one, which is usually the fastest way to move a blended CPA that will not budge." }
];
var BENCHMARKS = [
  { label: "Organic and referral", value: "$4.20", bar: "8%" },
  { label: "Quests and campaigns", value: "$19.40", bar: "35%" },
  { label: "Paid social", value: "$29.50", bar: "54%" },
  { label: "KOL and partnerships", value: "$54.90", bar: "100%" }
];
var RELATED = [
  { name: "Wallet churn rate", blurb: "How long the wallets you just bought actually last.", href: "/tools/wallet-churn-rate" },
  { name: "Dormant wallet reactivation", blurb: "The cheaper alternative to buying a replacement wallet.", href: "/tools/dormant-wallet-reactivation" },
  { name: "Wallet reachability score", blurb: "Whether you can message the wallets you paid for.", href: "/tools/wallet-reachability-score" }
];
function CpaPage() {
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "Cost per acquisition calculator", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: `${SITE_URL}/tools/cost-per-acquisition`, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars2}>
      <section className="tool-hero" style={{ ...wrap, padding: "56px 40px 0" }} data-pad>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: "#767B83", display: "flex", gap: 8 }}>
          <a href="/tools" style={{ color: "#767B83", fontWeight: 500 }}>Tools</a>
          <span aria-hidden="true">/</span>
          <span style={{ color: "#42464D" }}>Cost per acquisition</span>
        </nav>
        <h1 style={{ margin: "20px 0 0", fontSize: "clamp(38px,5vw,56px)", lineHeight: 1.04, letterSpacing: "-1px", fontWeight: 600, maxWidth: "18ch", color: "#010F31" }}>Cost per acquisition calculator</h1>
        <p style={{ margin: "20px 0 0", maxWidth: "58ch", fontSize: 17, lineHeight: 1.65, color: "#585D65" }}>Cost per connect flatters every channel. Enter spend, connects and first transactions to see what a transacting wallet actually costs, per channel and blended.</p>
        <ToolArt kind="cpa" className="hero-art" />
      </section>

      <section style={{ ...wrap, padding: "36px 40px 0" }} data-pad>
        <CostPerAcquisitionCalc />
      </section>

      <section style={{ ...wrap, padding: "64px 40px 0" }} data-pad>
        <div className="ocs-article-grid">
          <div>
            {ARTICLE.map((a) => <div key={a.h} style={{ paddingBottom: 34 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: 26, letterSpacing: "-0.5px", fontWeight: 600, color: "#010F31" }}>{a.h}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p1}</p>
                <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p2}</p>
              </div>)}
          </div>
          <aside className="ocs-article-side" style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22 }}>
            <div style={{ fontFamily: mono4, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 14 }}>Example figures</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {BENCHMARKS.map((b) => <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                    <span style={{ color: "#42464D" }}>{b.label}</span>
                    <span style={{ fontFamily: mono4, fontVariantNumeric: "tabular-nums", color: "#010F31" }}>{b.value}</span>
                  </div>
                  <div style={{ height: 3, background: "#ECEDEF", marginTop: 7 }}>
                    <span style={{ display: "block", height: 3, width: b.bar, background: "#2F94FF" }} />
                  </div>
                </div>)}
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "#767B83" }}>Example figures to compare against, not measured data.</p>
          </aside>
        </div>
      </section>

      <section style={{ ...wrap, padding: "48px 40px 88px" }} data-pad>
        <div style={{ fontFamily: mono4, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Related tools</div>
        <div className="ocs-related-grid">
          {RELATED.map((r) => <a key={r.href} href={r.href} className="ocs-v2-card" style={{ display: "block", background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22, textDecoration: "none" }}>
              <h3 style={{ margin: "0 0 7px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{r.name}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{r.blurb}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#1727E0" }}>Open tool
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </span>
            </a>)}
        </div>
      </section>

      <CloseCta />
      <style>{`
        .ocs-article-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:56px; align-items:start; }
        .ocs-article-side { position:sticky; top:88px; }
        .ocs-related-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .ocs-v2-card { transition:border-color .12s ease; }
        .ocs-v2-card:hover { border-color:#C4C7CC; }
        @media (max-width:1024px){ .ocs-article-grid { grid-template-columns:1fr; gap:32px; } .ocs-article-side { position:static; } .ocs-related-grid { grid-template-columns:1fr; } }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
    </SiteChrome>;
}

// components/DormantReactivationCalc.jsx
var mono5 = "'JetBrains Mono',monospace";
var num2 = (n) => Math.round(n).toLocaleString("en-US");
var fmt2 = (n) => {
  const r = Math.round(n);
  if (r >= 1e6) return "$" + (r / 1e6).toFixed(2) + "M";
  if (r >= 1e3) return "$" + (r / 1e3).toFixed(1) + "k";
  return "$" + r;
};
var display = (v, unit) => unit === "%" ? v + "%" : unit === "USD" ? "$" + num2(v) : unit === "months" ? v + " mo" : num2(v);
function Slider({ label, min, max, step, value, unit, hint, onChange }) {
  return <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
        <label style={{ fontSize: 14.5, fontWeight: 500, color: "#010F31" }}>{label}</label>
        <span style={{ fontFamily: mono5, fontSize: 14, color: "#010F31", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{display(value, unit)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#1727E0" }} />
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: "#767B83" }}>{hint}</p>
    </div>;
}
function DormantReactivationCalc() {
  const [dormant, setDormant] = useState8(42e3);
  const [reach, setReach] = useState8(34);
  const [react, setReact] = useState8(9);
  const [arpw, setArpw] = useState8(18);
  const [months, setMonths] = useState8(7);
  const [cost, setCost] = useState8(4200);
  const reached = dormant * (reach / 100);
  const reactivated = reached * (react / 100);
  const gross = reactivated * arpw * months;
  const net = gross - cost;
  const fields = [
    { label: "Dormant wallets", min: 500, max: 5e5, step: 500, value: dormant, unit: "wallets", hint: "Wallets that transacted with you once but not in the last 90 days.", set: setDormant },
    { label: "Reachable share", min: 1, max: 100, step: 1, value: reach, unit: "%", hint: "Share you hold an email, push token or wallet inbox for. This is usually the binding constraint.", set: setReach },
    { label: "Reactivation rate", min: 1, max: 40, step: 1, value: react, unit: "%", hint: "Of those reached, the share that transacts again within 30 days of the campaign.", set: setReact },
    { label: "Monthly revenue per active wallet", min: 1, max: 400, step: 1, value: arpw, unit: "USD", hint: "Fees, spread or subscription attributable to one active wallet per month.", set: setArpw },
    { label: "Months retained after reactivation", min: 1, max: 24, step: 1, value: months, unit: "months", hint: "How long a reactivated wallet stays active before going quiet again.", set: setMonths },
    { label: "Campaign cost", min: 0, max: 5e4, step: 100, value: cost, unit: "USD", hint: "Incentives, creative and sending cost for the whole reactivation programme.", set: setCost }
  ];
  const steps = [
    { label: "Dormant wallets", value: num2(dormant) },
    { label: `× reachable ${reach}%`, value: num2(reached) },
    { label: `× reactivated ${react}%`, value: num2(reactivated) },
    { label: `× $${arpw} × ${months} months`, value: fmt2(gross) },
    { label: "− campaign cost", value: "(" + fmt2(cost) + ")" }
  ];
  const barReach = 100 - reach + "%";
  const barConvert = (reach * (1 - react / 100)).toFixed(1) + "%";
  return <div className="ocs-calc-grid" style={{ alignItems: "start" }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>Your numbers</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#585D65" }}>Defaults are the median across the protocols we onboarded last quarter. Overwrite anything you know.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {fields.map((f3) => <Slider key={f3.label} label={f3.label} min={f3.min} max={f3.max} step={f3.step} value={f3.value} unit={f3.unit} hint={f3.hint} onChange={f3.set} />)}
        </div>
      </div>

      <div className="ocs-calc-side" style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
        <div style={{ fontFamily: mono5, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83" }}>Worksheet</div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
          {steps.map((s) => <div key={s.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #ECEDEF" }}>
              <span style={{ fontSize: 14, color: "#585D65" }}>{s.label}</span>
              <span style={{ fontFamily: mono5, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: "#010F31", whiteSpace: "nowrap" }}>{s.value}</span>
            </div>)}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 0 0", borderTop: "2px solid #010F31", marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#010F31" }}>Recoverable, net</div>
            <div style={{ fontSize: 13, color: "#767B83" }}>Over 12 months</div>
          </div>
          <span style={{ marginLeft: "auto", flex: "none", fontFamily: mono5, fontSize: 30, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", borderBottom: "2px solid #FF6828", paddingBottom: 2, color: "#010F31" }}>{fmt2(net)}</span>
        </div>

        <div style={{ marginTop: 24, borderTop: "1px solid #ECEDEF", paddingTop: 20 }}>
          <div style={{ fontFamily: mono5, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 12 }}>Where it leaks</div>
          <div style={{ display: "flex", height: 8, borderRadius: 2, overflow: "hidden", background: "#ECEDEF" }}>
            <span style={{ width: barReach, background: "#C4C7CC", display: "block" }} />
            <span style={{ width: barConvert, background: "#FF6828", display: "block" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: "#767B83" }}>
            <span>Unreachable</span>
            <span>Reached, not reactivated</span>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <a href="/early-access" style={{ display: "block", textAlign: "center", height: 40, lineHeight: "40px", background: "#1727E0", color: "#fff", fontSize: 14, fontWeight: 600, borderRadius: 4, textDecoration: "none" }}>Build this segment</a>
        </div>
      </div>

      <style>{`
        .ocs-calc-grid { display:grid; grid-template-columns:minmax(0,1fr) 420px; gap:16px; }
        .ocs-calc-side { position:sticky; top:88px; }
        @media (max-width:1024px){ .ocs-calc-grid { grid-template-columns:minmax(0,1fr); } .ocs-calc-side { position:static; } }
      `}</style>
    </div>;
}

// app/tools/dormant-wallet-reactivation/page.jsx
var metadata17 = {
  title: "Dormant wallet reactivation calculator",
  description: "Put a number on the revenue you could recover from wallets that went quiet, from reach, reactivation rate and revenue per wallet. Free, no signup.",
  alternates: { canonical: "/tools/dormant-wallet-reactivation" },
  openGraph: { title: "Dormant wallet reactivation calculator · OnchainSuite", description: "Revenue recoverable from wallets that stopped showing up.", url: "/tools/dormant-wallet-reactivation", type: "website" }
};
var themeVars3 = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF", color: "#010F31" };
var wrap2 = { maxWidth: 1200, margin: "0 auto" };
var mono6 = "'JetBrains Mono',monospace";
var ARTICLE2 = [
  { h: "What counts as a dormant wallet?", p1: "A wallet is dormant when it has interacted with your contracts at least once and then gone quiet for longer than your natural usage cycle. For a perps venue that might be 14 days. For a staking protocol it might be a quarter. Ninety days is a reasonable default if you have no cycle in mind.", p2: "The distinction that matters is dormant versus lost. A lost wallet has withdrawn its balance and moved on. A dormant wallet often still holds a position, which is exactly why it is worth a message." },
  { h: "Why reachability decides the number", p1: "Teams tend to argue about reactivation rate. It is the wrong lever. Move the rate from 8% to 12% and the result shifts modestly; move reachability from 30% to 60% and it doubles.", p2: "Reachability is a collection problem, not a messaging problem. Every touchpoint where a wallet connects is an opportunity to ask for one durable channel, and asking early gives you more chances to collect one than asking when a customer is already leaving." },
  { h: "Reactivation revenue is not one payment", p1: "The mistake in most back-of-envelope versions of this maths is treating a reactivated wallet as a single transaction. It is a cohort that resumes contributing at roughly the rate of your existing active base, then decays again.", p2: "That is why the months-retained input exists. Set it to what your data says rather than to the number you would like. A reactivated wallet that stays seven months is worth more than four times one that stays one month and leaves." }
];
var BENCHMARKS2 = [
  { label: "Reachable share", value: "31%", bar: "31%" },
  { label: "Reactivation rate", value: "8.4%", bar: "21%" },
  { label: "Retained 6 months on", value: "46%", bar: "46%" }
];
var TACTICS = [
  { n: "01", h: "Ask for a channel at connect, not at churn", p: "The cheapest reachability gain is a single optional field at wallet connect. Wallets that give you an address at their first session are the ones still interested enough to answer." },
  { n: "02", h: "Trigger on the drift, not the departure", p: "Dormancy is visible weeks before it is complete: fewer sessions, smaller positions, a bridge out. Start the message on the leading signal rather than waiting for a 90-day sweep." },
  { n: "03", h: "Say what happened while they were gone", p: "The highest-performing reactivation message is specific and unflattering to send: what changed, what their position did, what they missed. A generic we-miss-you message gives them nothing to act on." },
  { n: "04", h: "Segment by why they left", p: "Wallets that left after a fee change need different copy from wallets that left after a failed transaction. One segment, one reason, one message." },
  { n: "05", h: "Price the incentive against retained months", p: "An incentive that buys one transaction is a cost. One that buys seven months of activity is an investment. Model the incentive against the months-retained figure above before you set it." }
];
var RELATED2 = [
  { name: "Wallet reachability score", blurb: "What share of your holders you can actually message today.", href: "/tools/wallet-reachability-score" },
  { name: "Wallet churn rate", blurb: "The rate that produced these dormant wallets in the first place.", href: "/tools/wallet-churn-rate" },
  { name: "Cost per acquisition", blurb: "What replacing a dormant wallet with a new one costs you.", href: "/tools/cost-per-acquisition" }
];
function DormantPage() {
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "Dormant wallet reactivation calculator", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: `${SITE_URL}/tools/dormant-wallet-reactivation`, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars3}>
      <section className="tool-hero" style={{ ...wrap2, padding: "56px 40px 0" }} data-pad>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: "#767B83", display: "flex", gap: 8 }}>
          <a href="/tools" style={{ color: "#767B83", fontWeight: 500 }}>Tools</a>
          <span aria-hidden="true">/</span>
          <span style={{ color: "#42464D" }}>Dormant wallet reactivation</span>
        </nav>
        <h1 style={{ margin: "20px 0 0", fontSize: "clamp(38px,5vw,56px)", lineHeight: 1.04, letterSpacing: "-1px", fontWeight: 600, maxWidth: "20ch", color: "#010F31" }}>Dormant wallet reactivation calculator</h1>
        <p style={{ margin: "20px 0 0", maxWidth: "58ch", fontSize: 17, lineHeight: 1.65, color: "#585D65" }}>The wallets that stopped showing up can still hold a lot of value. This puts a number on it.</p>
        <ToolArt kind="dormant" className="hero-art" />
      </section>

      <section style={{ ...wrap2, padding: "36px 40px 0" }} data-pad>
        <DormantReactivationCalc />
      </section>

      <section style={{ ...wrap2, padding: "64px 40px 0" }} data-pad>
        <div className="ocs-article-grid">
          <div>
            {ARTICLE2.map((a) => <div key={a.h} style={{ paddingBottom: 34 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: 26, letterSpacing: "-0.5px", fontWeight: 600, color: "#010F31" }}>{a.h}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p1}</p>
                <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p2}</p>
              </div>)}
          </div>
          <aside className="ocs-article-side" style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22 }}>
            <div style={{ fontFamily: mono6, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 14 }}>Example figures</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {BENCHMARKS2.map((b) => <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                    <span style={{ color: "#42464D" }}>{b.label}</span>
                    <span style={{ fontFamily: mono6, fontVariantNumeric: "tabular-nums", color: "#010F31" }}>{b.value}</span>
                  </div>
                  <div style={{ height: 3, background: "#ECEDEF", marginTop: 7 }}>
                    <span style={{ display: "block", height: 3, width: b.bar, background: "#2F94FF" }} />
                  </div>
                </div>)}
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "#767B83" }}>Example figures to compare against, not measured data.</p>
          </aside>
        </div>
      </section>

      <section style={{ ...wrap2, padding: "8px 40px 0" }} data-pad>
        <div style={{ fontFamily: mono6, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 20 }}>Five ways to move the number</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {TACTICS.map((t) => <div key={t.n} style={{ display: "flex", gap: 20, padding: "20px 0", borderTop: "1px solid #ECEDEF" }}>
              <span style={{ fontFamily: mono6, fontSize: 13, fontWeight: 500, color: "#1727E0", flex: "none", width: 28 }}>{t.n}</span>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{t.h}</h3>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: "#42464D" }}>{t.p}</p>
              </div>
            </div>)}
        </div>
      </section>

      <section style={{ ...wrap2, padding: "48px 40px 88px" }} data-pad>
        <div style={{ fontFamily: mono6, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Related tools</div>
        <div className="ocs-related-grid">
          {RELATED2.map((r) => <a key={r.href} href={r.href} className="ocs-v2-card" style={{ display: "block", background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22, textDecoration: "none" }}>
              <h3 style={{ margin: "0 0 7px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{r.name}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{r.blurb}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#1727E0" }}>Open tool
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </span>
            </a>)}
        </div>
      </section>

      <CloseCta />
      <style>{`
        .ocs-article-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:56px; align-items:start; }
        .ocs-article-side { position:sticky; top:88px; }
        .ocs-related-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .ocs-v2-card { transition:border-color .12s ease; }
        .ocs-v2-card:hover { border-color:#C4C7CC; }
        @media (max-width:1024px){ .ocs-article-grid { grid-template-columns:1fr; gap:32px; } .ocs-article-side { position:static; } .ocs-related-grid { grid-template-columns:1fr; } }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
    </SiteChrome>;
}

// components/LtvCalculator.jsx
var usd3 = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(n));
function Row2({ label, hint, value, min, max, step, onChange, fmt: fmt3 }) {
  return <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A17" }}>{label}</div>
          <div style={{ fontSize: 12.5, color: "#8A93A6", marginTop: 2 }}>{hint}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A17", whiteSpace: "nowrap" }}>{fmt3(value)}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 12, accentColor: ACCENT }} />
    </div>;
}
function LtvCalculator() {
  const [arpu, setArpu] = useState9(40);
  const [churn, setChurn] = useState9(8);
  const [margin, setMargin] = useState9(80);
  const [improved, setImproved] = useState9(6);
  const lifespan = 1 / (churn / 100);
  const ltv = arpu * lifespan * (margin / 100);
  const lifespan2 = 1 / (improved / 100);
  const ltv2 = arpu * lifespan2 * (margin / 100);
  const uplift = ltv2 - ltv;
  return <div style={{ border: "1px solid #DCE7F5", borderRadius: 20, background: "#fff", padding: "28px 26px", boxShadow: "0 1px 2px rgba(26,24,20,.04)" }}>
      <Row2 label="Revenue per wallet / month" hint="Average monthly revenue per active wallet" value={arpu} min={1} max={500} step={1} onChange={setArpu} fmt={usd3} />
      <Row2 label="Monthly churn rate" hint="Share of wallets that leave and do not come back each month" value={churn} min={1} max={30} step={1} onChange={(v) => {
    setChurn(v);
    if (improved > v) setImproved(v);
  }} fmt={(v) => `${v}%`} />
      <Row2 label="Gross margin" hint="Share of revenue you keep" value={margin} min={20} max={100} step={1} onChange={setMargin} fmt={(v) => `${v}%`} />
      <Row2 label="Improved churn (with retention)" hint="Target churn after retention" value={improved} min={1} max={churn} step={1} onChange={setImproved} fmt={(v) => `${v}%`} />

      <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid #DCE7F5", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} data-stats>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>Avg wallet lifespan</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1A1A17", marginTop: 4 }}>{Math.round(lifespan)} mo</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>Wallet LTV</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1A1A17", marginTop: 4 }}>{usd3(ltv)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#8A93A6", fontWeight: 600 }}>LTV at improved churn</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{usd3(ltv2)}</div>
        </div>
      </div>

      <p style={{ margin: "18px 0 0", fontSize: 14, color: "#3D4A63", lineHeight: 1.6 }}>
        Cutting churn from <strong>{churn}%</strong> to <strong>{improved}%</strong> raises LTV per wallet by{" "}
        <strong style={{ color: "#15803D" }}>{usd3(uplift)}</strong>.
      </p>

      <div style={{ marginTop: 18 }}>
        <a href="/early-access" className="ocs-btn-primary" style={{ display: "inline-block", fontSize: 14.5, fontWeight: 600, color: "#fff", background: ACCENT, padding: "11px 18px", borderRadius: 10, textDecoration: "none" }}>
          Raise wallet LTV with OnchainSuite →
        </a>
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 12, color: "#8A93A6", lineHeight: 1.5 }}>
        Estimates only. LTV = monthly revenue × average lifespan (1 ÷ monthly churn) × gross margin.
      </p>
    </div>;
}

// app/tools/ltv-calculator/page.jsx
var metadata18 = {
  title: "Wallet LTV Calculator",
  description: "Estimate the lifetime value of a wallet from revenue, churn, and margin, and see how much lower churn raises it. Free, no signup.",
  alternates: { canonical: "/tools/ltv-calculator" },
  openGraph: { title: "Wallet LTV Calculator · OnchainSuite", description: "Estimate wallet lifetime value and how retention raises it.", url: "/tools/ltv-calculator", type: "website" }
};
var themeVars4 = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF" };
var h22 = { margin: "48px 0 0", fontSize: 23, fontWeight: 700, letterSpacing: "-.02em", color: "#1A1A17" };
var p2 = { margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "#3D4A63" };
var FAQ2 = [
  { q: "What is wallet lifetime value?", a: "Wallet LTV is the total revenue a wallet brings over its active life, from its first transaction to the point it churns." },
  { q: "How is wallet LTV calculated?", a: "LTV is monthly revenue per wallet times the average lifespan (1 divided by monthly churn) times gross margin." },
  { q: "How do you increase wallet LTV?", a: "Lower churn so wallets stay longer, grow revenue per wallet with usage-based incentives, and reactivate dormant wallets before they are gone." }
];
function LtvCalculatorPage() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ2.map((f3) => ({ "@type": "Question", name: f3.q, acceptedAnswer: { "@type": "Answer", text: f3.a } })) };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars4}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "76px 32px 8px" }} data-pad>
        <h1 style={{ margin: "0", fontSize: "clamp(30px,4vw,46px)", lineHeight: 1.04, letterSpacing: "-.03em", fontWeight: 700, color: "#1A1A17" }}>
          Wallet LTV calculator
        </h1>
        <p style={{ margin: "18px 0 26px", fontSize: 18, lineHeight: 1.6, color: "#3D4A63" }}>
          A wallet is worth its revenue for as long as it stays active. Set your numbers to estimate lifetime value, and
          see how much lower churn is worth.
        </p>
        <ToolArt kind="ltv" className="hero-banner" />
        <LtvCalculator />

        <h2 style={h22}>What is wallet lifetime value?</h2>
        <p style={p2}>
          Wallet LTV is the total revenue a wallet brings over its active life, from its first transaction to the point
          it stops coming back. It is the number that tells you how much you can afford to spend acquiring and keeping a
          wallet.
        </p>

        <h2 style={h22}>How is wallet LTV calculated?</h2>
        <p style={p2}>Multiply what a wallet earns each month by how long it stays, then keep only the margin.</p>
        <p style={{ margin: "14px 0 0", padding: "14px 16px", background: "#fff", border: "1px solid #DCE7F5", borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 14.5, color: "#1A1A17" }}>
          LTV = monthly revenue × lifespan × margin, where lifespan = 1 / monthly churn
        </p>
        <p style={p2}>
          At $40 a month, 8% monthly churn (about a 12-month lifespan), and 80% margin, a wallet is worth roughly $400.
          Cut churn to 6% and the same wallet is worth about $530.
        </p>

        <h2 style={h22}>Why LTV matters for protocols</h2>
        <p style={p2}>
          LTV sets your ceiling on acquisition and retention spend, and it shows what retention is really worth. Because
          lifespan is one over churn, small drops in churn compound into large gains in LTV. That is why keeping wallets
          usually beats chasing new ones.
        </p>

        <h2 style={h22}>How to raise wallet LTV</h2>
        <ol style={{ margin: "16px 0 0", paddingLeft: 20 }}>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Lower churn.</strong> Every point of churn you remove stretches the average lifespan and lifts LTV.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Grow revenue per wallet.</strong> Usage-based incentives and well-timed nudges move wallets to higher-value actions.</li>
          <li style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.65, color: "#3D4A63" }}><strong style={{ color: "#1A1A17" }}>Reactivate dormant wallets.</strong> A win-back Loop brings cold wallets back into their active life instead of losing them.</li>
        </ol>
        <p style={p2}>
          OnchainSuite runs these as Loops, started by what wallets do on-chain.{" "}
          <a href="/early-access" style={{ color: ACCENT, fontWeight: 600 }}>Book a walkthrough</a>.
        </p>

        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: ACCENT, fontWeight: 600, margin: "52px 0 0" }}>Related tools</div>
        <div style={{ marginTop: 14, borderTop: "1px solid #DCE7F5" }}>
          {[
    { href: "/tools/churn-calculator", title: "Wallet churn cost calculator", desc: "What churn costs per year, and how much acting earlier could keep." },
    { href: "/tools", title: "All tools", desc: "Every free calculator for growth teams at blockchain companies." }
  ].map((t) => <a key={t.href} href={t.href} className="ocs-idx-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 14px", borderBottom: "1px solid #DCE7F5", textDecoration: "none" }}>
              <div>
                <div className="ocs-idx-title" style={{ fontSize: 16, fontWeight: 700, color: "#1A1A17" }}>{t.title}</div>
                <div style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: "#3D4A63" }}>{t.desc}</div>
              </div>
              <span style={{ fontSize: 18, color: ACCENT, flex: "none" }} aria-hidden="true">→</span>
            </a>)}
        </div>
        <div style={{ height: 32 }} />
      </main>
      <CloseCta />
      <style>{`.ocs-idx-row{transition:background .15s ease;border-radius:10px}.ocs-idx-row:hover{background:#F1F6FE}.ocs-idx-row:hover .ocs-idx-title{color:var(--acc)}`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
    </SiteChrome>;
}

// components/WalletChurnRateCalc.jsx
var mono7 = "'JetBrains Mono',monospace";
var num3 = (n) => Math.round(n).toLocaleString("en-US");
var money2 = (n) => {
  const r = Math.round(n);
  if (r >= 1e6) return "$" + (r / 1e6).toFixed(2) + "M";
  if (r >= 1e3) return "$" + (r / 1e3).toFixed(1) + "k";
  return "$" + r;
};
var PERIODS = ["Weekly", "Monthly", "Quarterly"];
var MONTHS_IN = { Weekly: 0.25, Monthly: 1, Quarterly: 3 };
function Field({ label, value, onChange }) {
  return <div>
      <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 8, color: "#010F31" }}>{label}</label>
      <input
    type="number"
    value={value}
    onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
    className="ocs-v2-input"
    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #DEE0E3", borderRadius: 4, padding: "11px 12px", fontFamily: mono7, fontSize: 15, outline: "none", color: "#010F31" }}
  />
    </div>;
}
function WalletChurnRateCalc() {
  const [start, setStart] = useState10(24e3);
  const [lost, setLost] = useState10(3120);
  const [gained, setGained] = useState10(4100);
  const [arpw, setArpw] = useState10(22);
  const [period, setPeriod] = useState10("Monthly");
  const monthsIn = MONTHS_IN[period];
  const churn = start > 0 ? lost / start : 0;
  const monthly = 1 - Math.pow(1 - churn, 1 / monthsIn);
  const annual = 1 - Math.pow(1 - monthly, 12);
  const lifespan = monthly > 0 ? 1 / monthly : 0;
  const ltv = lifespan * arpw;
  const net = gained - lost;
  const netRate = start > 0 ? net / start * 100 : 0;
  const curve = Array.from({ length: 12 }, (_, i) => {
    const remain = Math.pow(1 - monthly, i + 1);
    return { m: i + 1, height: Math.max(remain * 100, 1.5).toFixed(1) + "%", color: remain >= 0.5 ? "#2F94FF" : remain >= 0.2 ? "#1727E0" : "#DEE0E3" };
  });
  const steps = [
    { label: "Active at start", value: num3(start) },
    { label: "Did not come back", value: "(" + num3(lost) + ")" },
    { label: "Still active at end", value: num3(Math.max(start - lost, 0)) },
    { label: "New wallets acquired", value: "+" + num3(gained) }
  ];
  const outputs = [
    { label: "Normalised monthly churn", value: (monthly * 100).toFixed(1) + "%", color: "#010F31" },
    { label: "Compounds to annually", value: (annual * 100).toFixed(1) + "%", color: "#B53C0B" },
    { label: "Average wallet lifespan", value: lifespan > 0 ? lifespan.toFixed(1) + " mo" : "—", color: "#010F31" },
    { label: "Lifetime value per wallet", value: money2(ltv), color: "#010F31" },
    { label: "Revenue lost this period", value: money2(lost * arpw * monthsIn), color: "#010F31" }
  ];
  const netNote = net >= 0 ? `You added ${num3(net)} wallets net this period, growth of ${netRate.toFixed(1)}% on the starting base. At this churn rate you must keep acquiring ${num3(lost)} wallets a period just to stand still.` : `You lost ${num3(Math.abs(net))} wallets net this period, a contraction of ${Math.abs(netRate).toFixed(1)}%. Acquisition is not covering churn; reactivation is cheaper than closing this gap with new wallets.`;
  const churnNote = period === "Monthly" ? "Of the wallets active at the start of the month, this share did not transact again." : `Measured over your ${period.toLowerCase()} period, then normalised to a monthly rate below.`;
  return <div className="ocs-calc-grid" style={{ alignItems: "start" }}>
      {
    /* Input surface */
  }
      <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600, color: "#010F31" }}>One cohort, one period</h2>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: "#585D65" }}>Count a wallet as active if it transacted at least once in the period.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Field label="Active wallets at start" value={start} onChange={setStart} />
          <Field label="Wallets that did not come back" value={lost} onChange={setLost} />
          <Field label="New wallets acquired" value={gained} onChange={setGained} />
          <Field label="Monthly revenue per active wallet" value={arpw} onChange={setArpw} />
        </div>

        <div style={{ marginTop: 22 }}>
          <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 10, color: "#010F31" }}>Period length</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PERIODS.map((p3) => {
    const on = p3 === period;
    return <button key={p3} type="button" onClick={() => setPeriod(p3)} style={{ border: `1px solid ${on ? "#010F31" : "#DEE0E3"}`, background: on ? "#010F31" : "#FFFFFF", color: on ? "#FFFFFF" : "#42464D", fontFamily: "'Instrument Sans',sans-serif", fontSize: 13.5, fontWeight: 500, padding: "9px 16px", borderRadius: 2, cursor: "pointer" }}>
                  {p3}
                </button>;
  })}
          </div>
        </div>

        <div style={{ marginTop: 28, borderTop: "1px solid #ECEDEF", paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#010F31" }}>Retention curve at this rate</h3>
            <span style={{ fontFamily: mono7, fontSize: 12, color: "#767B83" }}>12 months, no reactivation</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
            {curve.map((c) => <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6, height: "100%" }}>
                <span style={{ width: "100%", background: c.color, height: c.height, borderRadius: "2px 2px 0 0", display: "block" }} />
                <span style={{ fontFamily: mono7, fontSize: 10, color: "#767B83" }}>{c.m}</span>
              </div>)}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#767B83" }}>Each bar is the share of today&apos;s active cohort still active in that month, if nothing changes.</p>
        </div>
      </div>

      {
    /* Worksheet + net movement */
  }
      <div className="ocs-calc-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
          <div style={{ fontFamily: mono7, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83" }}>Worksheet</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
            {steps.map((s) => <div key={s.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #ECEDEF" }}>
                <span style={{ fontSize: 14, color: "#585D65" }}>{s.label}</span>
                <span style={{ fontFamily: mono7, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: "#010F31", whiteSpace: "nowrap" }}>{s.value}</span>
              </div>)}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 0 0", borderTop: "2px solid #010F31", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#010F31" }}>{period} churn</div>
              <div style={{ fontSize: 13, color: "#767B83" }}>Wallets, not accounts</div>
            </div>
            <span style={{ marginLeft: "auto", flex: "none", fontFamily: mono7, fontSize: 30, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", borderBottom: "2px solid #FF6828", paddingBottom: 2, color: "#010F31" }}>
              {(churn * 100).toFixed(1)}%
            </span>
          </div>

          <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{churnNote}</p>

          <div style={{ marginTop: 22, borderTop: "1px solid #ECEDEF", paddingTop: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            {outputs.map((o) => <div key={o.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 14, color: "#585D65" }}>{o.label}</span>
                <span style={{ fontFamily: mono7, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: o.color }}>{o.value}</span>
              </div>)}
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderLeft: "2px solid #FF6828", borderRadius: 6, padding: 22 }}>
          <div style={{ fontFamily: mono7, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 10 }}>Net movement</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#42464D" }}>{netNote}</p>
        </div>
      </div>

      <style>{`
        .ocs-calc-grid { display:grid; grid-template-columns:minmax(0,1fr) 400px; gap:16px; }
        .ocs-calc-side { position:sticky; top:88px; }
        .ocs-v2-input:focus { border-color:#FF6828 !important; box-shadow:0 0 0 3px rgba(255,104,40,0.28); }
        @media (max-width:1024px){
          .ocs-calc-grid { grid-template-columns:minmax(0,1fr); }
          .ocs-calc-side { position:static; }
        }
      `}</style>
    </div>;
}

// app/tools/wallet-churn-rate/page.jsx
var metadata19 = {
  title: "Wallet churn rate calculator",
  description: "Churn measured on wallets, not accounts. See what one period compounds to over a year, the average wallet lifespan and lifetime value. Free.",
  alternates: { canonical: "/tools/wallet-churn-rate" },
  openGraph: { title: "Wallet churn rate calculator · OnchainSuite", description: "See what a period's wallet churn compounds to over a year.", url: "/tools/wallet-churn-rate", type: "website" }
};
var themeVars5 = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF", color: "#010F31" };
var wrap3 = { maxWidth: 1200, margin: "0 auto" };
var ARTICLE3 = [
  { h: "Why wallet churn is not customer churn", p1: "A customer cancels; a wallet just stops. There is no cancellation event to count, so churn has to be defined as an absence of activity over a window you choose, and that choice changes the number more than anything else on this page.", p2: "Pick the window from your natural usage cycle. If a healthy wallet transacts weekly, a 30-day silence is a strong sign it has churned. If it stakes and waits, 30 days is nothing and you will scare yourself with a number that means very little." },
  { h: "The compounding is what hurts", p1: "A 6 percent monthly churn rate sounds survivable. Compounded, it means half your active base is gone in eleven months and 52 percent is gone within a year.", p2: "That is why the annual figure sits next to the monthly one above. Teams that only look at the monthly rate consistently underestimate how much acquisition they need to hold flat." },
  { h: "Churn and value are not evenly distributed", p1: "Wallet churn is usually worst in the long tail and mildest among your largest holders, which means a blended rate can look alarming while revenue barely moves, or look calm while your best cohort quietly leaves.", p2: "Run this per cohort: by size, by acquisition channel, by first action. The cohort with the worst churn and the highest revenue per wallet is where retention work pays for itself first." }
];
var BENCHMARKS3 = [
  { label: "DeFi, lending", value: "5.2%", bar: "26%" },
  { label: "Perps, trading", value: "9.8%", bar: "49%" },
  { label: "NFT, collectibles", value: "14.1%", bar: "70%" },
  { label: "Airdrop-acquired", value: "19.4%", bar: "97%" }
];
var RELATED3 = [
  { name: "Dormant wallet reactivation", blurb: "Revenue you can still recover from wallets that went quiet before they churned.", href: "/tools/dormant-wallet-reactivation" },
  { name: "Wallet reachability score", blurb: "How much of your base you can still message before it churns.", href: "/tools/wallet-reachability-score" },
  { name: "Cost per acquisition", blurb: "What replacing a churned wallet actually costs you.", href: "/tools/cost-per-acquisition" }
];
var mono8 = "'JetBrains Mono',monospace";
function WalletChurnRatePage() {
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "Wallet churn rate calculator", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: `${SITE_URL}/tools/wallet-churn-rate`, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars5}>

      <section className="tool-hero" style={{ ...wrap3, padding: "56px 40px 0" }} data-pad>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: "#767B83", display: "flex", gap: 8 }}>
          <a href="/tools" style={{ color: "#767B83", fontWeight: 500 }}>Tools</a>
          <span aria-hidden="true">/</span>
          <span style={{ color: "#42464D" }}>Wallet churn rate</span>
        </nav>
        <h1 style={{ margin: "20px 0 0", fontSize: "clamp(38px,5vw,56px)", lineHeight: 1.04, letterSpacing: "-1px", fontWeight: 600, maxWidth: "16ch", color: "#010F31" }}>Wallet churn rate calculator</h1>
        <p style={{ margin: "20px 0 0", maxWidth: "56ch", fontSize: 17, lineHeight: 1.65, color: "#585D65" }}>Churn measured on wallets, not accounts. Enter one period and see what it compounds to over a year, and how long a wallet lasts at that rate.</p>
        <ToolArt kind="churnrate" className="hero-art" />
      </section>

      <section style={{ ...wrap3, padding: "36px 40px 0" }} data-pad>
        <WalletChurnRateCalc />
      </section>

      {
    /* Article + benchmarks */
  }
      <section style={{ ...wrap3, padding: "64px 40px 0" }} data-pad>
        <div className="ocs-article-grid">
          <div>
            {ARTICLE3.map((a) => <div key={a.h} style={{ paddingBottom: 32 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: 26, letterSpacing: "-0.5px", fontWeight: 600, color: "#010F31" }}>{a.h}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p1}</p>
                <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.72, color: "#42464D" }}>{a.p2}</p>
              </div>)}
            <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderLeft: "2px solid #FF6828", borderRadius: 6, padding: 24 }}>
              <div style={{ fontFamily: mono8, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 10 }}>The formula</div>
              <p style={{ margin: "0 0 8px", fontFamily: mono8, fontSize: 15, lineHeight: 1.7, color: "#010F31" }}>Churn = Wallets that did not come back ÷ Active wallets at start × 100</p>
              <p style={{ margin: 0, fontFamily: mono8, fontSize: 15, lineHeight: 1.7, color: "#010F31" }}>Annual = (1 − (1 − monthly churn)^12) × 100</p>
            </div>
          </div>

          <aside className="ocs-article-side" style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22 }}>
            <div style={{ fontFamily: mono8, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 14 }}>Example figures</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {BENCHMARKS3.map((b) => <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                    <span style={{ color: "#42464D" }}>{b.label}</span>
                    <span style={{ fontFamily: mono8, fontVariantNumeric: "tabular-nums", color: "#010F31" }}>{b.value}</span>
                  </div>
                  <div style={{ height: 3, background: "#ECEDEF", marginTop: 7 }}>
                    <span style={{ display: "block", height: 3, width: b.bar, background: "#2F94FF" }} />
                  </div>
                </div>)}
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "#767B83" }}>Example figures to compare against, not measured data.</p>
          </aside>
        </div>
      </section>

      {
    /* Related tools */
  }
      <section style={{ ...wrap3, padding: "48px 40px 88px" }} data-pad>
        <div style={{ fontFamily: mono8, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Related tools</div>
        <div className="ocs-related-grid">
          {RELATED3.map((r) => <a key={r.href} href={r.href} className="ocs-v2-card" style={{ display: "block", background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22, textDecoration: "none" }}>
              <h3 style={{ margin: "0 0 7px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{r.name}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{r.blurb}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#1727E0" }}>
                Open tool
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </span>
            </a>)}
        </div>
      </section>

      <CloseCta />
      <style>{`
        .ocs-article-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:56px; align-items:start; }
        .ocs-article-side { position:sticky; top:88px; }
        .ocs-related-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .ocs-v2-card { transition:border-color .12s ease; }
        .ocs-v2-card:hover { border-color:#C4C7CC; }
        @media (max-width:1024px){
          .ocs-article-grid { grid-template-columns:1fr; gap:32px; }
          .ocs-article-side { position:static; }
          .ocs-related-grid { grid-template-columns:1fr; }
        }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
    </SiteChrome>;
}

// components/ReachabilityScoreCalc.jsx
var mono9 = "'JetBrains Mono',monospace";
var num4 = (n) => Math.round(n).toLocaleString("en-US");
var ICONS2 = {
  send: <path d="M21 3 10.5 13.5M21 3 14 21l-3.5-7.5L3 10z" />,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 9.5h18M16 12.5h2" /></>,
  bell: <><path d="M6 9a6 6 0 0112 0c0 4.5 1.5 5.5 2 6H4c.5-.5 2-1.5 2-6z" /><path d="M10 20a2 2 0 004 0" /></>,
  network: <><circle cx="6.5" cy="7" r="2" /><circle cx="17.5" cy="9" r="2" /><circle cx="10" cy="18" r="2" /><path d="M8.2 8 9.2 16M16 10.5 11.4 17M8.5 7h7" /></>
};
var DEFS = [
  { key: "email", label: "Verified email addresses", icon: "send", weight: 1, hint: "Confirmed, not bounced. The only channel that survives a device change." },
  { key: "inbox", label: "Wallet inbox enabled", icon: "wallet", weight: 0.8, hint: "Wallets that can receive an onchain-native message today." },
  { key: "push", label: "Push tokens", icon: "bell", weight: 0.65, hint: "App or browser push, live in the last 90 days." },
  { key: "socials", label: "Linked socials", icon: "network", weight: 0.35, hint: "Farcaster, Telegram or Discord handles you can DM." }
];
var COLORS = { email: "#2F94FF", inbox: "#1727E0", push: "#FF6828", socials: "#8B7CF6" };
function ReachabilityScoreCalc() {
  const [total, setTotal] = useState11(6e4);
  const [vals, setVals] = useState11({ email: 14e3, inbox: 21e3, push: 9e3, socials: 4e3 });
  const [overlap, setOverlap] = useState11(26);
  const set = (k, v) => setVals((p3) => ({ ...p3, [k]: Math.max(0, v) }));
  const weightedRaw = DEFS.reduce((sum, d) => sum + Math.min(vals[d.key], total) * d.weight, 0);
  const deduped = weightedRaw * (1 - overlap / 100);
  const reachable = Math.min(deduped, total);
  const score = total > 0 ? Math.round(reachable / total * 100) : 0;
  const band = score >= 60 ? { grade: "Strong", color: "#128355", verdict: "Most of your base is addressable. Segmentation, not collection, is your constraint." } : score >= 40 ? { grade: "Workable", color: "#B53C0B", verdict: "You can run real campaigns, but roughly half your value is sitting in wallets you cannot speak to." } : score >= 20 ? { grade: "Thin", color: "#B53C0B", verdict: "Every campaign result you read is a minority sample of your actual audience." } : { grade: "Blind", color: "#9B2A2E", verdict: "You are measuring a base you cannot reach. Collection comes before any messaging spend." };
  const bars = DEFS.map((d) => ({ color: COLORS[d.key], width: (Math.min(vals[d.key], total) * d.weight * (1 - overlap / 100) / Math.max(total, 1) * 100).toFixed(1) + "%" }));
  const gap = DEFS.map((d) => ({ d, headroom: (total - Math.min(vals[d.key], total)) * d.weight })).sort((a, b) => b.headroom - a.headroom)[0];
  const lift = total > 0 ? Math.round(gap.headroom * 0.25 * (1 - overlap / 100) / total * 100) : 0;
  const steps = DEFS.map((d) => ({ label: `${d.label} × ${d.weight.toFixed(2)}`, value: num4(Math.min(vals[d.key], total) * d.weight) })).concat([
    { label: `− overlap ${overlap}%`, value: "(" + num4(weightedRaw * (overlap / 100)) + ")" },
    { label: `Reachable wallets of ${num4(total)}`, value: num4(reachable) }
  ]);
  return <div className="ocs-calc-grid" style={{ alignItems: "start" }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>Your channels</h2>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: "#585D65" }}>Enter how many wallets you can reach on each channel. Weights reflect how durable each one is.</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 8, color: "#010F31" }}>Total wallets</label>
          <input type="number" value={total} onChange={(e) => setTotal(Math.max(0, Number(e.target.value) || 0))} className="ocs-v2-input" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #DEE0E3", borderRadius: 4, padding: "11px 12px", fontFamily: mono9, fontSize: 15, outline: "none", color: "#010F31" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {DEFS.map((d) => <div key={d.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={COLORS[d.key]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS2[d.icon]}</svg>
                <label style={{ fontSize: 14.5, fontWeight: 500, color: "#010F31" }}>{d.label}</label>
                <span style={{ marginLeft: "auto", fontFamily: mono9, fontSize: 12, color: "#767B83" }}>×{d.weight.toFixed(2)}</span>
              </div>
              <input type="number" value={vals[d.key]} onChange={(e) => set(d.key, Number(e.target.value) || 0)} className="ocs-v2-input" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #DEE0E3", borderRadius: 4, padding: "11px 12px", fontFamily: mono9, fontSize: 15, outline: "none", color: "#010F31" }} />
              <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: "#767B83" }}>{d.hint}</p>
            </div>)}
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <label style={{ fontSize: 14.5, fontWeight: 500, color: "#010F31" }}>Channel overlap</label>
            <span style={{ fontFamily: mono9, fontSize: 14, color: "#010F31" }}>{overlap}%</span>
          </div>
          <input type="range" min={0} max={80} step={1} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} style={{ width: "100%", accentColor: "#1727E0" }} />
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#767B83" }}>Share of reachable wallets addressable on more than one channel.</p>
        </div>

        <div style={{ marginTop: 26, borderTop: "1px solid #ECEDEF", paddingTop: 22 }}>
          <div style={{ fontFamily: mono9, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 12 }}>Coverage of total base</div>
          <div style={{ display: "flex", height: 10, borderRadius: 2, overflow: "hidden", background: "#ECEDEF" }}>
            {bars.map((b, i) => <span key={i} style={{ width: b.width, background: b.color, display: "block" }} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12 }}>
            {DEFS.map((d) => <span key={d.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#585D65" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[d.key] }} />
                {d.label.split(" ")[0]}
              </span>)}
          </div>
        </div>
      </div>

      <div className="ocs-calc-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 28 }}>
          <div style={{ fontFamily: mono9, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83" }}>Worksheet</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
            {steps.map((s) => <div key={s.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #ECEDEF" }}>
                <span style={{ fontSize: 14, color: "#585D65" }}>{s.label}</span>
                <span style={{ fontFamily: mono9, fontSize: 14.5, fontVariantNumeric: "tabular-nums", color: "#010F31", whiteSpace: "nowrap" }}>{s.value}</span>
              </div>)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 0 0", borderTop: "2px solid #010F31", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#010F31" }}>Reachability score</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: band.color }}>{band.grade}</div>
            </div>
            <span style={{ marginLeft: "auto", flex: "none", fontFamily: mono9, fontSize: 30, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", borderBottom: "2px solid #FF6828", paddingBottom: 2, color: "#010F31" }}>{score}</span>
          </div>
          <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{band.verdict}</p>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderLeft: "2px solid #FF6828", borderRadius: 6, padding: 22 }}>
          <div style={{ fontFamily: mono9, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 10 }}>Biggest single gain</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#42464D" }}>Closing a quarter of the gap on {gap.d.label.toLowerCase()} would lift your score by roughly {lift} points. It is the largest weighted headroom in your base right now.</p>
        </div>
      </div>

      <style>{`
        .ocs-calc-grid { display:grid; grid-template-columns:minmax(0,1fr) 400px; gap:16px; }
        .ocs-calc-side { position:sticky; top:88px; }
        .ocs-v2-input:focus { border-color:#FF6828 !important; box-shadow:0 0 0 3px rgba(255,104,40,0.28); }
        @media (max-width:1024px){ .ocs-calc-grid { grid-template-columns:minmax(0,1fr); } .ocs-calc-side { position:static; } }
      `}</style>
    </div>;
}

// app/tools/wallet-reachability-score/page.jsx
var metadata20 = {
  title: "Wallet reachability score",
  description: "Score how much of your wallet base you can actually message across verified email, wallet inbox, push, and socials, weighted by durability. Free, no signup.",
  alternates: { canonical: "/tools/wallet-reachability-score" },
  openGraph: { title: "Wallet reachability score · OnchainSuite", description: "What share of your holders you can actually reach today.", url: "/tools/wallet-reachability-score", type: "website" }
};
var themeVars6 = { "--acc": ACCENT, "--acc-h": ACCENT_HOVER, "--ok": OK, background: "#FFFFFF", color: "#010F31" };
var wrap4 = { maxWidth: 1200, margin: "0 auto" };
var mono10 = "'JetBrains Mono',monospace";
var NOTES = [
  { n: "01", h: "Ask at the moment of value, not the moment of exit", p: "A wallet that has just got value from your product is more likely to share a channel than one asked during an offboarding flow." },
  { n: "02", h: "Overlap is higher than teams assume", p: "The same engaged wallet tends to opt into everything. If you have not measured overlap, assume some, because pretending it is zero inflates your score." },
  { n: "03", h: "Push decays without you noticing", p: "Push tokens go stale over time through reinstalls and permission resets. Score push on tokens that delivered in the last 90 days, not on lifetime opt-ins." },
  { n: "04", h: "Reachability is per segment, not per base", p: "Your whales are almost always more reachable than your long tail. A base score of 40 can hide a top-decile score of 80, which changes what you should build first." }
];
var WEIGHTS = [
  { label: "Verified email", weight: "1.00", why: "Portable, durable, and the only channel that survives a wallet or device change." },
  { label: "Wallet inbox", weight: "0.80", why: "Native to the context, but depends on the user still opening that wallet." },
  { label: "Push token", weight: "0.65", why: "High intent when fresh, but tokens expire quietly and silently stop delivering." },
  { label: "Linked social", weight: "0.35", why: "Reachable in principle, rate-limited and unreliable in practice at any scale." }
];
var BANDS = [
  { range: "60-100", color: "#128355", text: "Strong. Collection is solved; spend your effort on segmentation." },
  { range: "40-59", color: "#B53C0B", text: "Workable. Half your base is dark and it is usually the older half." },
  { range: "20-39", color: "#B53C0B", text: "Thin. Campaign metrics describe a minority of your users." },
  { range: "0-19", color: "#9B2A2E", text: "Blind. Fix collection before spending anything on messaging." }
];
var RELATED4 = [
  { name: "Dormant wallet reactivation", blurb: "Revenue recoverable from wallets that stopped showing up.", href: "/tools/dormant-wallet-reactivation" },
  { name: "Wallet churn rate", blurb: "Monthly and compounding annual churn from active cohorts.", href: "/tools/wallet-churn-rate" },
  { name: "Cost per acquisition", blurb: "Blended and per-channel cost of one acquired wallet.", href: "/tools/cost-per-acquisition" }
];
function ReachabilityPage() {
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "Wallet reachability score", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: `${SITE_URL}/tools/wallet-reachability-score`, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return <SiteChrome>
    <div className="wrap tool-page" style={themeVars6}>
      <section className="tool-hero" style={{ ...wrap4, padding: "56px 40px 0" }} data-pad>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: "#767B83", display: "flex", gap: 8 }}>
          <a href="/tools" style={{ color: "#767B83", fontWeight: 500 }}>Tools</a>
          <span aria-hidden="true">/</span>
          <span style={{ color: "#42464D" }}>Wallet reachability</span>
        </nav>
        <h1 style={{ margin: "20px 0 0", fontSize: "clamp(38px,5vw,56px)", lineHeight: 1.04, letterSpacing: "-1px", fontWeight: 600, maxWidth: "18ch", color: "#010F31" }}>Wallet reachability score</h1>
        <p style={{ margin: "20px 0 0", maxWidth: "58ch", fontSize: 17, lineHeight: 1.65, color: "#585D65" }}>You cannot retain a wallet you cannot reach. Score how much of your base is addressable today, weighted by how durable each channel really is.</p>
        <ToolArt kind="reach" className="hero-art" />
      </section>

      <section style={{ ...wrap4, padding: "36px 40px 0" }} data-pad>
        <ReachabilityScoreCalc />
      </section>

      <section style={{ ...wrap4, padding: "64px 40px 0" }} data-pad>
        <div className="ocs-article-grid">
          <div>
            {NOTES.map((t) => <div key={t.n} style={{ display: "flex", gap: 20, padding: "20px 0", borderTop: "1px solid #ECEDEF" }}>
                <span style={{ fontFamily: mono10, fontSize: 13, fontWeight: 500, color: "#1727E0", flex: "none", width: 28 }}>{t.n}</span>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{t.h}</h3>
                  <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: "#42464D" }}>{t.p}</p>
                </div>
              </div>)}
          </div>
          <aside className="ocs-article-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22 }}>
              <div style={{ fontFamily: mono10, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 14 }}>Channel weights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {WEIGHTS.map((w) => <div key={w.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                      <span style={{ color: "#010F31", fontWeight: 500 }}>{w.label}</span>
                      <span style={{ fontFamily: mono10, fontVariantNumeric: "tabular-nums", color: "#010F31" }}>{w.weight}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "#767B83" }}>{w.why}</p>
                  </div>)}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22 }}>
              <div style={{ fontFamily: mono10, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 14 }}>Score bands</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {BANDS.map((b) => <div key={b.range} style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontFamily: mono10, fontSize: 12.5, color: b.color, flex: "none", width: 56 }}>{b.range}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: "#42464D" }}>{b.text}</span>
                  </div>)}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section style={{ ...wrap4, padding: "48px 40px 88px" }} data-pad>
        <div style={{ fontFamily: mono10, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#767B83", marginBottom: 16 }}>Related tools</div>
        <div className="ocs-related-grid">
          {RELATED4.map((r) => <a key={r.href} href={r.href} className="ocs-v2-card" style={{ display: "block", background: "#FFFFFF", border: "1px solid #DEE0E3", borderRadius: 6, padding: 22, textDecoration: "none" }}>
              <h3 style={{ margin: "0 0 7px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", color: "#010F31" }}>{r.name}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#585D65" }}>{r.blurb}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#1727E0" }}>Open tool
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </span>
            </a>)}
        </div>
      </section>

      <CloseCta />
      <style>{`
        .ocs-article-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:56px; align-items:start; }
        .ocs-article-side { position:sticky; top:88px; }
        .ocs-related-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .ocs-v2-card { transition:border-color .12s ease; }
        .ocs-v2-card:hover { border-color:#C4C7CC; }
        @media (max-width:1024px){ .ocs-article-grid { grid-template-columns:1fr; gap:32px; } .ocs-article-side { position:static; } .ocs-related-grid { grid-template-columns:1fr; } }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
    </SiteChrome>;
}

// app/legal/page.jsx
var metadata21 = {
  title: "Legal",
  description: "OnchainSuite legal documents: privacy, terms, data processing, international transfers, cookies, and sub-processors.",
  alternates: { canonical: "/legal" }
};
var DOCS2 = [
  { href: "/privacy", title: "Privacy Policy", desc: "How we collect, use and protect personal data under UK GDPR." },
  { href: "/terms", title: "Terms of Service", desc: "The agreement for access to and use of the platform." },
  { href: "/dpa", title: "Data Processing Agreement", desc: "Article 28 terms for data we process on your behalf, plus our security measures." },
  { href: "/data-transfers", title: "International Data Transfers", desc: "Safeguards for data leaving the UK, including the UK Extension to the EU-US Data Privacy Framework." },
  { href: "/cookies", title: "Cookie Policy", desc: "How we use cookies and similar technologies under PECR." },
  { href: "/subprocessors", title: "Sub-processors", desc: "The third parties we engage to provide the service." }
];
function LegalPage() {
  return <SiteChrome>
      <div className="wrap">
        <PageHero
    tag="Legal"
    title="Legal and compliance"
    sub={`${COMPANY.legalName} is registered in ${COMPANY.jurisdiction}. These documents set out how we handle personal data and the terms of using OnchainSuite. Last updated ${LEGAL_UPDATED}.`}
  />
        <section className="docs">
          {DOCS2.map((d) => <Link key={d.href} href={d.href} className="doc rv"><div><b>{d.title}</b><span>{d.desc}</span></div><em aria-hidden="true">→</em></Link>)}
          <p className="docs-q">Questions? Email <a href={`mailto:${COMPANY.legalEmail}`}>{COMPANY.legalEmail}</a> for legal matters, or <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a> for privacy and data requests.</p>
        </section>
      </div>
    </SiteChrome>;
}

// components/LegalDownload.jsx
function LegalDownload() {
  return <button type="button" className="ocs-legal-download" onClick={() => window.print()}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </button>;
}

// components/Legal.jsx
var themeVars7 = {
  "--acc": ACCENT,
  "--acc-h": ACCENT_HOVER,
  "--ok": OK
};
var LEGAL_NAV = [
  { href: "/legal", label: "Overview" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/dpa", label: "Data Processing Agreement" },
  { href: "/data-transfers", label: "International Data Transfers" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/subprocessors", label: "Sub-processors" }
];
function LegalShell({
  eyebrow = "Legal",
  title,
  summary,
  current: current2,
  children
}) {
  return <SiteChrome>
    <div className="wrap" style={themeVars7}>
      <div className="legal-grid">
        <aside className="legal-rail" aria-label="Legal documents">
          <nav>
            {LEGAL_NAV.map((l) => <Link key={l.href} href={l.href} className={l.href === current2 ? "on" : void 0} aria-current={l.href === current2 ? "page" : void 0}>{l.label}</Link>)}
          </nav>
        </aside>
        <main className="ocs-legal">
          <h1>{title}</h1>
          <p className="ocs-legal-summary">{summary}</p>
          <div className="ocs-legal-metarow">
            <p className="ocs-legal-meta">Last updated: {LEGAL_UPDATED}</p>
            <LegalDownload />
          </div>
          <div className="ocs-legal-body">{children}</div>
        </main>
      </div>
      <style>{`
        .ocs-legal h1 {
          margin: 18px 0 0; font-size: clamp(32px,4vw,48px); line-height: 1.04;
          letter-spacing: -.02em; font-weight: 600; color: #1C1D1F;
        }
        .ocs-legal-eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 11.5px; letter-spacing: .12em;
          text-transform: uppercase; color: var(--acc); font-weight: 600;
        }
        .ocs-legal-summary { margin: 16px 0 0; font-size: 17px; line-height: 1.6; color: #3B3D42; }
        .ocs-legal-metarow {
          margin: 12px 0 0; display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
        }
        .ocs-legal-meta { margin: 0; font-size: 13.5px; color: #75777C; }
        .ocs-legal-meta a, .ocs-legal a { color: var(--acc); font-weight: 600; }
        .ocs-legal-download {
          display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
          padding: 8px 14px; border-radius: 8px; border: 1px solid #E9E9EC; background: #fff;
          color: #1C1D1F; font-size: 13.5px; font-weight: 600; font-family: inherit;
          transition: border-color .15s ease, background .15s ease;
        }
        .ocs-legal-download:hover { border-color: var(--acc); background: #F8F8F9; color: var(--acc); }
        .ocs-legal-download svg { color: var(--acc); }
        .ocs-legal-body { margin-top: 20px; }
        .ocs-legal-body h2 {
          margin: 40px 0 0; font-size: 22px; font-weight: 700; letter-spacing: -.02em;
          color: #1C1D1F; scroll-margin-top: 88px;
        }
        .ocs-legal-body h3 { margin: 24px 0 0; font-size: 16.5px; font-weight: 700; color: #1C1D1F; }
        .ocs-legal-body p { margin: 12px 0 0; font-size: 15px; line-height: 1.7; color: #3B3D42; }
        .ocs-legal-body ul, .ocs-legal-body ol { margin: 12px 0 0; padding-left: 22px; }
        .ocs-legal-body li { margin: 7px 0 0; font-size: 15px; line-height: 1.7; color: #3B3D42; }
        .ocs-legal-body strong { color: #1C1D1F; font-weight: 700; }
        .ocs-legal-body table { width: 100%; border-collapse: collapse; margin: 16px 0 0; font-size: 13.5px; }
        .ocs-legal-body th, .ocs-legal-body td {
          border: 1px solid #E9E9EC; padding: 9px 12px; text-align: left; vertical-align: top;
          line-height: 1.55; color: #3B3D42;
        }
        .ocs-legal-body th { background: #F8F8F9; color: #1C1D1F; font-weight: 700; }
        .ocs-legal-foot { margin: 56px 0 0; padding: 22px 0 40px; border-top: 1px solid #E9E9EC; }
        .ocs-legal-foot-label {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em;
          text-transform: uppercase; color: #8A93A6;
        }
        .ocs-legal-foot-links { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px 18px; }
        .ocs-legal-foot-links a { font-size: 14px; color: var(--acc); font-weight: 600; }
        @media print {
          .bar, .nav, footer, .legal-rail, .ocs-legal-download { display: none !important; } .legal-grid { display: block !important; } .wrap { border: 0 !important; }
          .ocs-legal { max-width: 100% !important; padding: 0 24px !important; }
          .ocs-legal-body p, .ocs-legal-body li { color: #111 !important; }
          a { color: #111 !important; text-decoration: underline; }
          @page { margin: 18mm; }
        }
      `}</style>
    </div>
    </SiteChrome>;
}

// app/privacy/page.jsx
var metadata22 = {
  title: "Privacy Policy",
  description: "How OnchainSuite collects, uses, and protects personal data under UK GDPR and the Data Protection Act 2018.",
  alternates: { canonical: "/privacy" }
};
function PrivacyPage() {
  return <LegalShell
    eyebrow="Legal"
    title="Privacy Policy"
    summary="How we collect, use, share, and protect personal data, and the rights you have under UK GDPR and the Data Protection Act 2018."
    current="/privacy"
  >
      <h2>1. Who we are</h2>
      <p>
        This policy is issued by <strong>{COMPANY.legalName}</strong> (&ldquo;OnchainSuite&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;), a company registered in {COMPANY.jurisdiction} (company number {COMPANY.number}), with its
        registered office at {COMPANY.office}. We have applied to register with the UK Information
        Commissioner&rsquo;s Office (ICO) as a fee payer (application number {COMPANY.icoApplication}); this page
        will show our registration reference once the ICO confirms it.
      </p>
      <p>
        For questions about this policy or your personal data, contact{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>, or our data protection contact at{" "}
        <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>.
      </p>

      <h2>2. When we are a controller vs a processor</h2>
      <p>
        OnchainSuite plays two different roles, and which one applies determines whose privacy policy governs:
      </p>
      <ul>
        <li>
          <strong>As a controller</strong>, for personal data we decide the purposes of: website visitors, prospects
          who request early access, and the administrators of customer accounts. This policy covers that data.
        </li>
        <li>
          <strong>As a processor</strong>, for personal data we process on behalf of our customers (the protocols and
          teams who use the platform), including the on-chain and engagement data of their end users. There, the{" "}
          <strong>customer is the controller</strong>, their own privacy notice applies to their end users, and our{" "}
          <a href="/dpa">Data Processing Agreement</a> governs how we handle that data on their instructions.
        </li>
      </ul>

      <h2>3. Personal data we collect</h2>
      <h3>Website &amp; marketing</h3>
      <ul>
        <li>Contact details you submit (name, work email, protocol/company, role, and anything in free-text fields).</li>
        <li>Usage and device data (pages viewed, referrer, approximate location from IP, browser) via cookies and analytics, see our <a href="/cookies">Cookie Policy</a>.</li>
      </ul>
      <h3>Account &amp; billing (for customers)</h3>
      <ul>
        <li>Account administrator details, authentication data, and billing/contact information.</li>
      </ul>
      <h3>On-chain &amp; wallet data</h3>
      <p>
        The platform reads <strong>public blockchain data</strong> (wallet addresses and their on-chain activity). On
        its own a wallet address is pseudonymous, but it can become <strong>personal data under UK GDPR</strong> when
        it is, or can be, linked to an identifiable person. An email address or other contact identifier is linked to a
        wallet <strong>only where the wallet holder opts in</strong>. We do not custody assets and never initiate or
        sign transactions; on-chain access is read-only.
      </p>

      <h2>4. Our lawful bases (UK GDPR Article 6)</h2>
      <ul>
        <li><strong>Consent</strong>, for non-essential cookies/analytics and optional marketing communications. You may withdraw consent at any time.</li>
        <li><strong>Contract</strong>, to provide the service to customers and administer accounts.</li>
        <li><strong>Legitimate interests</strong>, to operate, secure, and improve the site and product, and to respond to enquiries, balanced against your rights.</li>
        <li><strong>Legal obligation</strong>, to comply with law (e.g. tax, accounting, and responding to lawful requests).</li>
      </ul>

      <h2>5. How we use personal data</h2>
      <ul>
        <li>To respond to early-access requests, schedule calls, and communicate about the product.</li>
        <li>To provide, maintain, secure, and improve the website and platform.</li>
        <li>To process payments and manage the customer relationship.</li>
        <li>To meet legal, regulatory, and security obligations and to detect and prevent abuse.</li>
      </ul>

      <h2>6. Sharing and sub-processors</h2>
      <p>
        We share personal data with vendors who help us run the service (hosting, email delivery, analytics,
        scheduling, payments). These act as our processors under contract and only on our instructions. A current list
        is on our <a href="/subprocessors">Sub-processors</a> page. We may also disclose data where required by law, to
        protect our rights, or as part of a corporate transaction. We do not sell personal data.
      </p>

      <h2>7. International transfers</h2>
      <p>
        Some vendors are located outside the UK (for example, in the United States). Where personal data is transferred
        outside the UK, we put in place an approved safeguard, the UK International Data Transfer Agreement (IDTA) or
        the UK Addendum to the EU SCCs, and/or reliance on the EU-US Data Privacy Framework (UK Extension) where the
        recipient is certified. Details are on our <a href="/data-transfers">International Data Transfers</a> page.
      </p>

      <h2>8. Retention</h2>
      <p>
        We keep personal data only as long as necessary for the purposes above, then delete or anonymise it. Prospect
        and enquiry data is retained for up to 24 months from last contact; customer account
        and billing records are kept for the life of the contract and for 6 years afterwards
        to meet legal and tax obligations. Data we process on behalf of customers is retained per the{" "}
        <a href="/dpa">DPA</a>.
      </p>

      <h2>9. Your rights</h2>
      <p>Under UK GDPR you have the right to:</p>
      <ul>
        <li>access a copy of your personal data;</li>
        <li>rectify inaccurate data and complete incomplete data;</li>
        <li>erase data (&ldquo;right to be forgotten&rdquo;) in certain circumstances;</li>
        <li>restrict or object to certain processing, including direct marketing;</li>
        <li>data portability; and</li>
        <li>withdraw consent at any time, without affecting prior lawful processing.</li>
      </ul>
      <p>
        To exercise any right, contact <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>. You also
        have the right to complain to the ICO at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>{" "}
        (or your local supervisory authority), though we&rsquo;d appreciate the chance to resolve it first. If your data
        is processed by a customer of ours (us acting as processor), please direct requests to that customer.
      </p>

      <h2>10. Security</h2>
      <p>
        We use technical and organisational measures appropriate to the risk, including encryption in transit and at
        rest, access controls and least-privilege, read-only and non-custodial on-chain access, logging, and vendor due
        diligence. Our detailed measures are described in the annex to the <a href="/dpa">DPA</a>. No system is
        perfectly secure, but we work to protect your data and to notify the relevant parties promptly if a reportable
        breach occurs.
      </p>

      <h2>11. Cookies</h2>
      <p>
        We use cookies and similar technologies as described in our <a href="/cookies">Cookie Policy</a>. Non-essential
        cookies are set only with your consent.
      </p>

      <h2>12. Children</h2>
      <p>
        The service is for business use and is not directed at children. We do not knowingly collect personal data from
        anyone under 18.
      </p>

      <h2>13. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be posted here with a revised &ldquo;last
        updated&rdquo; date and, where appropriate, notified to you directly.
      </p>

      <h2>14. Contact</h2>
      <p>
        {COMPANY.legalName}, {COMPANY.office}. Privacy enquiries:{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>. Data protection contact:{" "}
        <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>.
      </p>
    </LegalShell>;
}

// app/terms/page.jsx
var metadata23 = {
  title: "Terms of Service",
  description: "The terms governing access to and use of the OnchainSuite platform and early-access programme, governed by the laws of England and Wales.",
  alternates: { canonical: "/terms" }
};
function TermsPage() {
  return <LegalShell
    eyebrow="Legal"
    title="Terms of Service"
    summary="The agreement between you and OnchainSuite for access to and use of the platform and early-access programme."
    current="/terms"
  >
      <h2>1. Agreement</h2>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement between you (or the organisation you
        represent, the &ldquo;Customer&rdquo;) and <strong>{COMPANY.legalName}</strong> (&ldquo;OnchainSuite&rdquo;),
        registered in {COMPANY.jurisdiction} (company number {COMPANY.number}). By accessing the website, requesting
        early access, or using the platform, you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2>2. Eligibility &amp; authority</h2>
      <p>
        The service is for business use. You confirm that you are at least 18, that you have authority to bind the
        organisation you act for, and that your use complies with all laws applicable to you.
      </p>

      <h2>3. The service and early access</h2>
      <p>
        OnchainSuite provides lifecycle marketing tooling for blockchain and mainstream companies: it reads the product
        data you bring in and, on the Suite plan, public on-chain activity, and lets you send email and in-app messages. During the early-access period the service is
        provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, may change or be discontinued, and may
        contain features that are incomplete or evolving. Founding rates offered during early access apply on the terms
        communicated to you at sign-up.
      </p>

      <h2>4. Accounts &amp; acceptable use</h2>
      <p>You are responsible for your account, credentials, and the activity under it. You agree not to:</p>
      <ul>
        <li>use the service unlawfully, or to send unlawful, deceptive, or unsolicited messages (you are responsible for your own compliance with PECR/UK GDPR and equivalent marketing and anti-spam laws);</li>
        <li>infringe others&rsquo; rights, or upload data you have no lawful basis or consent to process;</li>
        <li>attempt to breach security, reverse engineer, scrape, overload, or disrupt the service; or</li>
        <li>resell or provide the service to third parties except as expressly permitted.</li>
      </ul>

      <h2>5. Customer data, privacy, and data protection</h2>
      <p>
        For personal data you process through the platform, <strong>you are the controller and OnchainSuite is your
        processor</strong>. Our <a href="/dpa">Data Processing Agreement</a> forms part of these Terms and applies to
        that processing. You warrant that you have a valid lawful basis and have given all required notices for the
        wallet, contact, and engagement data you bring to the platform, including for any opt-in linking of wallets to
        contact identifiers. Our handling of your own data is described in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>6. Fees</h2>
      <p>
        We offer two plans: Suite, priced by the number of contacts with Launch, Growth and Enterprise levels, and Send, priced
        per subscriber. Fees are charged in US dollars. Your plan is billed monthly as described at sign-up or in an order, and usage above a plan&rsquo;s
        allowance bills at list price. Fees are exclusive of VAT and other taxes, which you are responsible for. During
        early access, pricing may be discounted or waived and is subject to the founding-rate terms provided to you.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        OnchainSuite and its licensors own all rights in the service, software, and brand. We grant you a limited,
        non-exclusive, non-transferable right to use the service during your subscription. You retain all rights in your
        data; you grant us the rights needed to provide the service. Feedback you give may be used without obligation.
      </p>

      <h2>8. Third-party services and on-chain data</h2>
      <p>
        The service reads public blockchain data and may integrate third-party services that have their own terms. We
        are <strong>non-custodial</strong>: we never hold assets and never initiate or sign transactions. Nothing in
        the service is financial, investment, legal, or tax advice.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        To the fullest extent permitted by law, the service is provided &ldquo;as is&rdquo; without warranties of any
        kind, express or implied, including fitness for a particular purpose, accuracy, and non-infringement. We do not
        warrant that the service will be uninterrupted or error-free, or that on-chain data will be complete or
        accurate.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        Nothing in these Terms limits liability that cannot be limited by law (including for death or personal injury
        caused by negligence, or for fraud). Subject to that, OnchainSuite is not liable for indirect, incidental, or
        consequential loss, or loss of profits, revenue, data, or goodwill; and our total aggregate liability is limited
        to the greater of the fees you paid in the [12] months before the claim or £[100]. [Liability caps must be set
        with legal advice.]
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You will indemnify OnchainSuite against claims arising from your data, your use of the service in breach of
        these Terms, or your breach of applicable law.
      </p>

      <h2>12. Term &amp; termination</h2>
      <p>
        These Terms apply while you use the service. Either party may terminate as set out in an order or, for
        early-access use, on notice. We may suspend or terminate access for breach or risk to the service. On
        termination, your right to use the service ends and data is handled per the <a href="/dpa">DPA</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>13. Governing law &amp; jurisdiction</h2>
      <p>
        These Terms and any dispute arising from them are governed by the laws of {COMPANY.jurisdiction}, and the courts
        of {COMPANY.jurisdiction} have exclusive jurisdiction.
      </p>

      <h2>14. Changes &amp; contact</h2>
      <p>
        We may update these Terms; material changes will be posted here with a revised date. Questions:{" "}
        <a href={`mailto:${COMPANY.legalEmail}`}>{COMPANY.legalEmail}</a>.
      </p>
    </LegalShell>;
}

// app/dpa/page.jsx
var metadata24 = {
  title: "Data Processing Agreement",
  description: "OnchainSuite's Data Processing Agreement under Article 28 UK GDPR, including processing details, sub-processors, and technical and organisational measures.",
  alternates: { canonical: "/dpa" }
};
function DpaPage() {
  return <LegalShell
    eyebrow="Legal"
    title="Data Processing Agreement"
    summary="The Article 28 terms governing personal data that OnchainSuite processes on behalf of customers, including the technical and organisational measures we apply."
    current="/dpa"
  >
      <h2>1. Parties and role</h2>
      <p>
        This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the <a href="/terms">Terms of Service</a>
        between the Customer (the &ldquo;Controller&rdquo;) and <strong>{COMPANY.legalName}</strong> (the
        &ldquo;Processor&rdquo;). It applies where OnchainSuite processes personal data on the Customer&rsquo;s behalf.
        Where there is a conflict on data protection matters, this DPA prevails.
      </p>

      <h2>2. Definitions</h2>
      <p>
        &ldquo;UK GDPR&rdquo;, &ldquo;controller&rdquo;, &ldquo;processor&rdquo;, &ldquo;personal data&rdquo;,
        &ldquo;processing&rdquo;, &ldquo;data subject&rdquo;, and &ldquo;personal data breach&rdquo; have the meanings
        in the UK GDPR and the Data Protection Act 2018. &ldquo;Applicable Data Protection Law&rdquo; means the UK GDPR,
        the DPA 2018, and, where relevant, the EU GDPR.
      </p>

      <h2>3. Processing on documented instructions</h2>
      <p>
        OnchainSuite processes personal data only on the Customer&rsquo;s documented instructions (including as set out
        in the Terms and this DPA), unless required by law, in which case we will inform the Customer unless legally
        prohibited. We will tell the Customer if, in our opinion, an instruction infringes Applicable Data Protection
        Law.
      </p>
      <p>
        The Customer configures and operates the platform itself. The Customer&rsquo;s configuration and use of the
        platform&rsquo;s features constitutes its documented instructions to us, and the Customer determines which end
        users are messaged, on what basis, and with what content, within the platform&rsquo;s capabilities.
      </p>
      <p>
        The platform does not require or ingest the Customer&rsquo;s internal customer records, CRM data, or contact
        databases. It processes public on-chain activity, contact identifiers that end users have opted in to provide,
        and engagement events generated by the service itself.
      </p>

      <h2>4. Details of processing (Annex 1)</h2>
      <p>
        The processing below applies to the OnchainSuite platform. Concierge is an optional service, and where the
        Customer purchases or is provided Concierge under a written statement of work, whether paid or pro bono, the
        additional processing described in the second table also applies for the duration of that engagement.
      </p>
      <h3>Platform</h3>
      <table>
        <tbody>
          <tr><th>Subject matter</th><td>Provision of the OnchainSuite behaviour-triggered retention platform.</td></tr>
          <tr><th>Duration</th><td>For the term of the Terms, plus the deletion/return period in section 9.</td></tr>
          <tr><th>Nature &amp; purpose</th><td>Reading and normalising public on-chain activity; storing engagement events; triggering and delivering in-app and email messages on the Customer&rsquo;s behalf.</td></tr>
          <tr><th>Types of personal data</th><td>Wallet/public addresses and on-chain activity; opt-in contact identifiers (e.g. email); engagement events (opens, clicks, in-app interactions); segment membership. No special category data is required or intended.</td></tr>
          <tr><th>Categories of data subjects</th><td>The Customer&rsquo;s end users and wallet holders.</td></tr>
        </tbody>
      </table>

      <h3>Concierge (optional)</h3>
      <table>
        <tbody>
          <tr><th>Nature &amp; purpose</th><td>Named OnchainSuite personnel work within the Customer&rsquo;s account to plan, build, and operate lifecycle and email programmes on the Customer&rsquo;s behalf.</td></tr>
          <tr><th>Personnel</th><td>Access is limited to the individuals named in the statement of work, granted for the term of the engagement, and revoked on completion.</td></tr>
          <tr><th>Types of personal data</th><td>As above, plus any personal data the Customer chooses to make available to us for the engagement.</td></tr>
          <tr><th>Duration</th><td>The term of the statement of work.</td></tr>
        </tbody>
      </table>

      <h2>5. Confidentiality and access</h2>
      <p>
        Outside of Concierge, no OnchainSuite employee or contractor is authorised to access, use, or alter the personal
        data a Customer processes through the platform. The platform is self-serve and the Customer operates it.
      </p>
      <p>Access to personal data is granted only:</p>
      <ul>
        <li>to the named personnel assigned to a Concierge engagement, for the term of that engagement, revoked on completion;</li>
        <li>to technical personnel <strong>at the Customer&rsquo;s request</strong>, to investigate or resolve an issue the Customer has raised, for as long as is needed to resolve it; and</li>
        <li>where strictly necessary to maintain the security or integrity of the service, limited to the minimum necessary and logged.</li>
      </ul>
      <p>
        Every person who may access personal data is bound by a duty of confidentiality, by contract or by statute, that
        continues after their engagement with us ends.
      </p>

      <h2>6. Security</h2>
      <p>
        Taking account of the state of the art and the risk, we implement the technical and organisational measures set
        out in <strong>Annex 2</strong> below, and may update them provided protection is not materially reduced.
      </p>

      <h2>7. Sub-processors</h2>
      <p>
        The Customer gives general authorisation for OnchainSuite to engage sub-processors to provide the service. A
        current list is maintained on our <a href="/subprocessors">Sub-processors</a> page. We impose data protection
        obligations on each sub-processor that are no less protective than this DPA and remain responsible for their
        performance. We will give at least 30 days&rsquo; notice of new sub-processors (via the Sub-processors page or
        email), during which the Customer may object on reasonable data protection grounds.
      </p>

      <h2>8. Assistance to the Controller</h2>
      <ul>
        <li>We assist the Customer, by appropriate measures, to respond to data subject requests (access, rectification, erasure, restriction, portability, objection).</li>
        <li>We assist with the Customer&rsquo;s obligations on security, breach notification, data protection impact assessments, and prior consultation (Articles 32–36), taking account of the information available to us.</li>
        <li>We notify the Customer <strong>without undue delay</strong> after becoming aware of a personal data breach affecting their data, with the information reasonably available to help them meet their notification duties.</li>
      </ul>

      <h2>9. Return or deletion</h2>
      <p>
        On termination, the Customer may elect within 30 days to have the personal data returned in a commonly used
        format or deleted. If the Customer makes no election within that window, we delete it. Deletion from live
        systems completes within 90 days of termination. Where applicable law requires us to retain personal data, we
        retain only what the law requires, for only as long as it requires, and it remains subject to this DPA while we
        hold it. We will confirm deletion in writing on request.
      </p>
      <p>
        Where we have held working copies of personal data for a Concierge engagement outside the platform, we delete
        them on completion of that engagement.
      </p>

      <h2>10. Audits</h2>
      <p>
        We make available information necessary to demonstrate compliance with Article 28 and allow for and contribute
        to audits, including inspections, by the Customer or an auditor it mandates, subject to reasonable notice,
        confidentiality, and frequency. We may satisfy audit requests by providing third-party reports or certifications
        where available.
      </p>

      <h2>11. International transfers</h2>
      <p>
        Any transfer of personal data outside the UK is made under an approved transfer mechanism as described on our{" "}
        <a href="/data-transfers">International Data Transfers</a> page, which forms part of this DPA.
      </p>

      <h2>12. Liability &amp; governing law</h2>
      <p>
        Each party&rsquo;s liability under this DPA is subject to the limitations in the Terms. This DPA is governed by
        the laws of {COMPANY.jurisdiction}.
      </p>

      <h2>Annex 2, Technical and organisational measures</h2>
      <ul>
        <li><strong>Encryption</strong>, personal data encrypted in transit (TLS) and at rest.</li>
        <li><strong>Access control</strong>, role-based, least-privilege access; unique credentials; multi-factor authentication for administrative access; prompt revocation on role change.</li>
        <li><strong>Non-custodial, read-only chain access</strong>, we never custody assets and never initiate or sign transactions; on-chain access is read-only.</li>
        <li><strong>Pseudonymisation &amp; data minimisation</strong>, we collect and link contact identifiers only on opt-in and only what is needed for the service.</li>
        <li><strong>Network &amp; application security</strong>, segregation, hardened infrastructure, secrets management, dependency and vulnerability management.</li>
        <li><strong>Logging &amp; monitoring</strong>, audit logging of administrative access and security-relevant events.</li>
        <li><strong>Resilience</strong>, backups, recovery procedures, and tested business continuity.</li>
        <li><strong>Vendor management</strong>, due diligence and data protection terms with sub-processors.</li>
        <li><strong>Personnel</strong>, confidentiality undertakings and security awareness training.</li>
        <li><strong>Breach response</strong>, documented incident response and notification process.</li>
      </ul>
    </LegalShell>;
}

// app/cookies/page.jsx
var metadata25 = {
  title: "Cookie Policy",
  description: "How OnchainSuite uses cookies and similar technologies under PECR and UK GDPR, and how to manage your preferences.",
  alternates: { canonical: "/cookies" }
};
function CookiesPage() {
  return <LegalShell
    eyebrow="Legal"
    title="Cookie Policy"
    summary="How we use cookies and similar technologies, and how you can control them. Read alongside our Privacy Policy."
    current="/cookies"
  >
      <h2>1. What cookies are</h2>
      <p>
        Cookies are small files stored on your device. We also use similar technologies such as local storage and
        pixels. Under the Privacy and Electronic Communications Regulations (PECR) and UK GDPR, we set non-essential
        cookies only with your consent.
      </p>

      <h2>2. Categories we use</h2>
      <p>
        Our website currently sets only strictly necessary cookies. We do not use analytics, advertising, or
        third-party tracking cookies.
      </p>
      <table>
        <tbody>
          <tr><th>Strictly necessary</th><td>Required for the site to function (security, load balancing, and remembering your cookie choice). Always on; no consent required under PECR.</td></tr>
          <tr><th>Analytics, advertising, tracking</th><td>Not used. If we introduce any non-essential cookies in future, we will update this policy and ask for your consent before setting them.</td></tr>
        </tbody>
      </table>

      <h2>3. Managing your choices</h2>
      <p>
        Because we currently set only strictly necessary cookies, we do not show a consent banner. If we introduce
        non-essential cookies, we will ask for your consent first and give you a way to change your choice at any time.
        You can also block or delete cookies in your browser settings, though some features may not work as intended.
      </p>

      <h2>4. Third-party cookies</h2>
      <p>
        We do not currently allow third parties to set cookies through our site. The vendors we use to run the service
        are listed on our <a href="/subprocessors">Sub-processors</a> page; if any begins setting cookies via our site,
        we will update this policy first.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about cookies: <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>. See our{" "}
        <a href="/privacy">Privacy Policy</a> for how we handle personal data more generally.
      </p>
    </LegalShell>;
}

// app/data-transfers/page.jsx
var metadata26 = {
  title: "International Data Transfers",
  description: "How OnchainSuite safeguards personal data transferred outside the UK, including the UK IDTA, SCCs, and the EU-US Data Privacy Framework (UK Extension).",
  alternates: { canonical: "/data-transfers" }
};
function DataTransfersPage() {
  return <LegalShell
    eyebrow="Legal"
    title="International Data Transfers"
    summary="How we safeguard personal data when it moves outside the UK, including the EU-US Data Privacy Framework (UK Extension), the UK IDTA, and Standard Contractual Clauses."
    current="/data-transfers"
  >
      <h2>1. Why transfers happen</h2>
      <p>
        To run the service, OnchainSuite uses infrastructure and vendors that may be located outside the United Kingdom,
        including in the United States and the European Economic Area (EEA). When personal data moves outside the UK, UK
        GDPR requires an approved safeguard. This page explains the mechanisms we rely on. A list of recipients and their
        locations is on our <a href="/subprocessors">Sub-processors</a> page.
      </p>

      <h2>2. Our role on transfers</h2>
      <p>
        Where we transfer personal data we process on behalf of customers, we act as exporter under the customer&rsquo;s
        instructions. Note that <strong>{COMPANY.legalName} is a UK company and does not itself self-certify under the
        EU-US Data Privacy Framework</strong>, DPF certification applies to organisations in the United States that{" "}
        <em>receive</em> personal data. We rely on our recipients&rsquo; certifications and on the mechanisms below.
      </p>

      <h2>3. Transfer mechanisms we rely on</h2>
      <ul>
        <li>
          <strong>Adequacy</strong>, where the destination has UK &ldquo;adequacy&rdquo; (for example, the EEA), no
          additional safeguard is required.
        </li>
        <li>
          <strong>EU-US Data Privacy Framework, UK Extension (the &ldquo;UK-US data bridge&rdquo;)</strong>, for
          transfers to US vendors that are <strong>self-certified</strong> under the EU-US DPF and its UK Extension, we
          rely on that certification as the safeguard. We check a recipient&rsquo;s active status on the official Data
          Privacy Framework list before relying on it.
        </li>
        <li>
          <strong>UK International Data Transfer Agreement (IDTA), or the UK Addendum to the EU SCCs</strong>, for
          transfers to recipients not covered by adequacy or the DPF, we put the IDTA (or the EU Standard Contractual
          Clauses with the UK Addendum) in place.
        </li>
        <li>
          <strong>EU Standard Contractual Clauses</strong>, for any EEA-origin personal data subject to the EU GDPR.
        </li>
      </ul>

      <h2>4. Transfer risk assessments &amp; supplementary measures</h2>
      <p>
        Where we rely on the IDTA or SCCs, we carry out a transfer risk assessment and, where needed, apply
        supplementary measures (such as encryption in transit and at rest, access controls, and data minimisation) to
        ensure protection essentially equivalent to that under UK law.
      </p>

      <h2>5. Onward transfers</h2>
      <p>
        We require sub-processors to apply equivalent safeguards to any onward transfer of personal data they make on
        our behalf.
      </p>

      <h2>6. Your rights and complaints</h2>
      <p>
        You may ask for information about the safeguards applied to a specific transfer by contacting{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>. You can also complain to the UK ICO at{" "}
        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>. Where a transfer relies on
        a recipient&rsquo;s DPF certification, that framework provides additional redress mechanisms in the United
        States.
      </p>

      <h2>7. Changes</h2>
      <p>
        We will update this page as our vendors, their certifications, or the applicable transfer rules change. See the
        &ldquo;last updated&rdquo; date above.
      </p>
    </LegalShell>;
}

// app/subprocessors/page.jsx
var metadata27 = {
  title: "Sub-processors",
  description: "The categories of sub-processor OnchainSuite uses, with their purpose, location and transfer safeguards. Named vendors are available on request.",
  alternates: { canonical: "/subprocessors" }
};
var SUBPROCESSORS = [
  { name: "Cloud infrastructure", purpose: "Application hosting, database and cache", location: "United States", safeguard: "UK IDTA / SCCs" },
  { name: "Website hosting", purpose: "Marketing website and CDN", location: "United States", safeguard: "EU-US DPF (UK Extension) / SCCs" },
  { name: "Email delivery", purpose: "Transactional and campaign email sending", location: "United States", safeguard: "EU-US DPF (UK Extension) / SCCs" },
  { name: "Email verification", purpose: "List hygiene and deliverability checks", location: "United States", safeguard: "UK IDTA / SCCs" },
  { name: "Blockchain data", purpose: "Wallet and on-chain data indexing", location: "United States", safeguard: "UK IDTA / SCCs" },
  { name: "AI / LLM providers", purpose: "Intelligence: embeddings and natural-language querying", location: "United States, China", safeguard: "UK IDTA / SCCs with supplementary measures" },
  { name: "Payments", purpose: "Billing and payment processing", location: "United States", safeguard: "EU-US DPF (UK Extension) / SCCs" }
];
function SubprocessorsPage() {
  return <LegalShell
    eyebrow="Legal"
    title="Sub-processors"
    summary="The third parties we engage to help provide the service. We impose data protection obligations on each and remain responsible for their performance."
    current="/subprocessors"
  >
      <h2>Current sub-processors</h2>
      <p>
        OnchainSuite engages the categories of sub-processor below to deliver the service, as permitted under our{" "}
        <a href="/dpa">Data Processing Agreement</a>. We list them by category; the specific vendors within each category
        are available to customers on request under NDA. Transfers outside the UK are safeguarded as described on our{" "}
        <a href="/data-transfers">International Data Transfers</a> page.
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Purpose</th>
            <th>Location</th>
            <th>Transfer safeguard</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((s) => <tr key={s.name}>
              <td>{s.name}</td>
              <td>{s.purpose}</td>
              <td>{s.location}</td>
              <td>{s.safeguard}</td>
            </tr>)}
        </tbody>
      </table>

      <h2>Changes &amp; notifications</h2>
      <p>
        We update this page when sub-processors change. As set out in the DPA, we give at least 30 days&rsquo; notice of
        new sub-processors, during which customers may object on reasonable data protection grounds. To be notified of
        changes, contact <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </p>
    </LegalShell>;
}

// single/App.jsx
var ROUTES = {
  "/": [Home, null],
  "/pricing": [PricingPage, metadata],
  "/platform/audience": [AudiencePage, metadata2],
  "/platform/segments": [SegmentsPage, metadata3],
  "/platform/loops": [LoopsPage, metadata4],
  "/platform/intelligence-mcp": [McpPage, metadata5],
  "/platform/data": [DataPage, metadata6],
  "/for/blockchain-companies": [BlockchainCompanies, metadata7],
  "/for/mainstream-companies": [MainstreamCompanies, metadata8],
  "/hypothesis": [HypothesisPage, metadata9],
  "/refer": [ReferPage, metadata10],
  "/team": [TeamPage, metadata11],
  "/early-access": [EarlyAccessPage, metadata12],
  "/compare": [CompareHub, metadata13],
  "/tools": [ToolsHub, metadata14],
  "/tools/churn-calculator": [ChurnCalculatorPage, metadata15],
  "/tools/cost-per-acquisition": [CpaPage, metadata16],
  "/tools/dormant-wallet-reactivation": [DormantPage, metadata17],
  "/tools/ltv-calculator": [LtvCalculatorPage, metadata18],
  "/tools/wallet-churn-rate": [WalletChurnRatePage, metadata19],
  "/tools/wallet-reachability-score": [ReachabilityPage, metadata20],
  "/legal": [LegalPage, metadata21],
  "/privacy": [PrivacyPage, metadata22],
  "/terms": [TermsPage, metadata23],
  "/dpa": [DpaPage, metadata24],
  "/cookies": [CookiesPage, metadata25],
  "/data-transfers": [DataTransfersPage, metadata26],
  "/subprocessors": [SubprocessorsPage, metadata27]
};
var SITE_TITLE = "OnchainSuite · Retention built on what your users do";
var titleOf = (m) => {
  const t = m && (typeof m.title === "string" ? m.title : m.title?.default);
  return t ? `${t} · OnchainSuite` : SITE_TITLE;
};
function NotFound() {
  return <div style={{ padding: "120px 24px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      <h1>Page not found</h1>
      <p><a href="#/">Back to the homepage</a></p>
    </div>;
}
function App() {
  const path = usePathname();
  useEffect6(() => {
    if (document.getElementById("ocs-fonts")) return;
    const l = document.createElement("link");
    l.id = "ocs-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
  }, []);
  useEffect6(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#/")) {
        e.preventDefault();
        navigate(href.slice(1));
      } else if (href.startsWith("/") && !href.startsWith("//")) {
        e.preventDefault();
        navigate(href);
      } else if (href.startsWith("#") && href.length > 1) {
        const el = document.getElementById(href.slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  let page;
  let meta = null;
  const slug2 = path.startsWith("/compare/") ? path.slice("/compare/".length) : null;
  if (slug2 && COMPETITORS.some((c) => c.slug === slug2)) {
    const c = COMPETITORS.find((x) => x.slug === slug2);
    page = <ComparePage params={{ slug: slug2 }} />;
    meta = { title: `OnchainSuite and ${c.name} compared` };
  } else if (ROUTES[path]) {
    const [Page, m] = ROUTES[path];
    page = <Page />;
    meta = m;
  } else {
    page = <NotFound />;
  }
  useEffect6(() => {
    document.title = titleOf(meta);
  }, [path]);
  return <>
      <style>{globals_default}</style>
      <style>{ns_default}</style>
      <Spotlight />
      <div key={path}>{page}</div>
    </>;
}
export {
  App as default,
  Home,
  HomeBody,
  HomeMotion,
  SiteChrome,
  PricingPage,
  PricingBody,
  CompareHub,
  ComparePage,
};
