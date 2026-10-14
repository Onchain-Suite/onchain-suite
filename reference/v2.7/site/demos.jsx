// demos.jsx — shared interactive demos used by both directions.
// Each component accepts a `theme` object so it adapts to dark/light directions.
// CRITICAL: all style objects are named-prefixed to avoid global collisions.

const { useState: ocUseState, useEffect: ocUseEffect } = React;
// Local aliases — see https://react.dev for hook API
function useState(...a){return ocUseState(...a)}
function useEffect(...a){return ocUseEffect(...a)}

// ─────────────────────────────────────────────────────────────
// Theme presets
// ─────────────────────────────────────────────────────────────
const ThemeA = {
  // Wallet Native — dark electric
  bg: '#0a0d10',
  surface: '#11161b',
  surfaceAlt: '#161c23',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  fg: '#f2f4f6',
  muted: 'rgba(242,244,246,0.55)',
  mutedStrong: 'rgba(242,244,246,0.75)',
  accent: '#c6ff4f',       // electric chartreuse
  accent2: '#5be7ff',      // electric cyan
  accentInk: '#0a0d10',
  danger: '#ff6b6b',
  display: '"Space Grotesk", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  body: '"Inter Tight", system-ui, sans-serif',
};

const ThemeB = {
  // Editorial Protocol — cream/black/burnt
  bg: '#f3efe6',
  surface: '#ebe5d8',
  surfaceAlt: '#e1d9c7',
  line: 'rgba(20,18,15,0.12)',
  lineStrong: 'rgba(20,18,15,0.28)',
  fg: '#14120f',
  muted: 'rgba(20,18,15,0.6)',
  mutedStrong: 'rgba(20,18,15,0.78)',
  accent: '#c83a14',       // burnt orange / red
  accent2: '#1a3a2e',      // deep green ink
  accentInk: '#f3efe6',
  danger: '#a33015',
  display: '"Newsreader", "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  body: '"Inter Tight", system-ui, sans-serif',
};

// ─────────────────────────────────────────────────────────────
// Shared data
// ─────────────────────────────────────────────────────────────
const PLAYS_DATA = [
  { id: 'first-deposit', tier: 'Starter', title: 'First Deposit Welcome', trigger: 'A wallet’s first successful deposit lands', channel: 'in-app + email', steps: 3, lift: 'peer open rate 28–34%', desc: 'Welcome the moment it lands. Educational follow-up after 48 hours. A feedback ask a week in.', tag: 'Activation' },
  { id: 'churn', tier: 'Starter', title: 'Churn Win-Back', trigger: 'Wallet inactive 30 / 60 / 90 days', channel: 'email + next-visit in-app', steps: 3, lift: 'peer recovery 14–22%', desc: 'A three-step ladder by inactivity tier. Stops the moment the wallet returns.', tag: 'Retention' },
  { id: 'unbond', tier: 'Starter', title: 'LP Unbonding Reminder', trigger: 'Cooldown ends in 24 hours', channel: 'in-app push', steps: 1, lift: 'peer claim rate 64–72%', desc: 'One in-app reminder when the wallet next connects. No email lookup needed.', tag: 'Retention' },
  { id: 'gov-vote', tier: 'Advanced', title: 'Governance Vote Reminder', trigger: 'Proposal hits 24h before quorum', channel: 'in-app + telegram', steps: 1, lift: 'peer turnout +38%', desc: 'A single, well-timed nudge to wallets eligible to vote. Fires only when quorum is at risk.', tag: 'Governance' },
  { id: 'whale', tier: 'Advanced', title: 'Whale Concierge', trigger: 'Wallet crosses a TVL threshold you set', channel: 'email (white-glove)', steps: 1, lift: 'peer reply rate 41–58%', desc: 'A VIP outreach the moment a wallet crosses your threshold. Your team gets a Slack ping; the wallet gets a personal note.', tag: 'Revenue' },
  { id: 'liquidity-migrate', tier: 'Advanced', title: 'Liquidity Migration', trigger: 'v1 LP still active 7 days after v2 launch', channel: 'email + in-app', steps: 2, lift: 'peer migration 51–67%', desc: 'Notify holders of stale pools. Walk them through migration in one tap.', tag: 'Migration' },
  { id: 'upgrade', tier: 'Advanced', title: 'Smart Contract Upgrade', trigger: 'Manual · audit-grade', channel: 'email + in-app + telegram', steps: 1, lift: '99.4% delivery', desc: 'A signed, audit-grade notice. Fans out to every reachable channel. Compliance-ready receipt log.', tag: 'Critical' },
  { id: 'quest', tier: 'Advanced', title: 'Quest / Referral Invite', trigger: 'Active wallet not yet enrolled', channel: 'in-app + farcaster + telegram', steps: 2, lift: 'peer enrolment 22–31%', desc: 'Invite + nudge. Detects on-chain eligibility and routes to whichever channel the wallet prefers.', tag: 'Growth' },
];

const CHANNELS = [
  { id: 'push', label: 'In-app push', sub: '100% reachable · websocket SDK', priority: 1 },
  { id: 'email', label: 'Email', sub: '≥60% via wallet-email synthesis', priority: 2 },
  { id: 'farcaster', label: 'Farcaster', sub: 'FID lookup via Neynar', priority: 3 },
  { id: 'telegram', label: 'Telegram', sub: 'group bot · channel posts', priority: 2 },
  { id: 'x', label: 'X (Twitter)', sub: 'OAuth-linked recipients', priority: 4 },
];

// ─────────────────────────────────────────────────────────────
// Hook: detect when an element is visible (for triggering animations).
// We use IntersectionObserver but always returns true within a design-canvas
// artboard because artboards are rendered above the fold of the canvas.
// ─────────────────────────────────────────────────────────────
function useTicker(intervalMs) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

// ─────────────────────────────────────────────────────────────
// PushToastDemo — wallet/dapp frame with animated in-app push toast.
// Loops every ~6s: shows dapp UI, then a toast slides in with a CTA.
// ─────────────────────────────────────────────────────────────
function PushToastDemo({ theme, variant = 'card' }) {
  const t = theme;
  const tick = useTicker(5800);
  const phase = (tick % 100);
  // Toast appears at second 1, exits at second 5
  const visible = true; // always show in design exploration
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tick]);

  const dapp = (
    <div style={{ background: t.bg, color: t.fg, padding: '20px 22px', height: '100%', fontFamily: t.body, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: t.muted, fontFamily: t.mono }}>
        <span>● ouroboros.fi</span>
        <span style={{ background: t.surface, padding: '4px 10px', borderRadius: 999, border: `1px solid ${t.line}` }}>0x7a3f…91bd</span>
      </div>
      <div style={{ marginTop: 38, fontFamily: t.display, fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>
        TVL <span style={{ color: t.accent }}>$248.1M</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: t.muted, fontFamily: t.mono }}>+2.4% · 24h</div>
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['Deposit','Borrow','Stake','Claim'].map((l, i) => (
          <div key={l} style={{ background: t.surface, border: `1px solid ${t.line}`, padding: '14px 16px', borderRadius: 10, fontSize: 14, color: t.mutedStrong, display: 'flex', justifyContent: 'space-between' }}>
            <span>{l}</span>
            <span style={{ color: i === 0 ? t.accent : t.muted, fontFamily: t.mono, fontSize: 12 }}>{i === 0 ? '↗' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Toast translation/opacity
  const toastY = stage === 0 ? -40 : stage === 1 ? 0 : -40;
  const toastOp = stage === 1 ? 1 : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.line}`, background: t.bg }}>
      {dapp}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14,
        transform: `translateY(${toastY}px)`,
        opacity: toastOp,
        transition: 'transform 540ms cubic-bezier(.2,.9,.25,1.15), opacity 320ms',
        background: t.fg, color: t.bg, borderRadius: 12,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: `0 16px 40px rgba(0,0,0,0.35)`,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.display, fontWeight: 700, color: t.accentInk, flex: '0 0 auto' }}>◆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>Your LP cooldown ends in 23h 41m</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, fontFamily: t.mono }}>via OnchainSuite · LP Unbonding Play</div>
        </div>
        <button style={{ background: t.bg, color: t.fg, border: 0, padding: '8px 12px', borderRadius: 8, fontFamily: t.body, fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}>Claim</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CohortWidget — the "aha-moment" report card.
// ─────────────────────────────────────────────────────────────
function CohortWidget({ theme, compact = false }) {
  const t = theme;
  const [hoverIdx, setHoverIdx] = useState(-1);
  const bars = [
    { label: 'Dormant LPs (30d)', value: 142, w: 100, hi: true },
    { label: 'Also active on Aave', value: 38, w: 27 },
    { label: 'Median deposit', value: '$4.2k', w: 64 },
    { label: 'Reachable on in-app', value: 142, w: 100 },
    { label: 'Reachable on email', value: 87, w: 61 },
  ];
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16, padding: compact ? 20 : 28, fontFamily: t.body, color: t.fg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: t.mono, fontSize: 12, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.accent, boxShadow: `0 0 12px ${t.accent}` }}></span>
          Aha · auto-indexed · 2 min 41 sec
        </div>
        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>cohort id · 9f3a</span>
      </div>
      <div style={{ marginTop: 18, fontFamily: t.display, fontSize: compact ? 28 : 38, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.08 }}>
        <span style={{ color: t.accent }}>142 dormant LPs</span> from the last 30 days.
      </div>
      <div style={{ marginTop: 8, fontSize: 15, color: t.mutedStrong, maxWidth: 540 }}>
        Median lifetime deposit <strong style={{ color: t.fg, fontWeight: 600 }}>$4.2k</strong>. 38 are also active on Aave. 87 have an email on file; all 142 are reachable on in-app push.
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {bars.map((b, i) => (
          <div key={b.label}
               onMouseEnter={() => setHoverIdx(i)}
               onMouseLeave={() => setHoverIdx(-1)}
               style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px dashed ${t.line}` }}>
            <span style={{ fontSize: 12, color: t.mutedStrong, fontFamily: t.mono, letterSpacing: '0.02em' }}>{b.label}</span>
            <div style={{ height: 8, background: t.surfaceAlt, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${b.w}%`, height: '100%', background: b.hi ? t.accent : t.accent2, transition: 'width 600ms cubic-bezier(.2,.7,.3,1)', transitionDelay: `${i * 90}ms` }}></div>
            </div>
            <span style={{ fontSize: 13, color: t.fg, fontFamily: t.mono, textAlign: 'right' }}>{b.value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={{ background: t.accent, color: t.accentInk, border: 0, padding: '12px 18px', borderRadius: 10, fontFamily: t.body, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Send in-app push → all 142
        </button>
        <button style={{ background: 'transparent', color: t.fg, border: `1px solid ${t.lineStrong}`, padding: '12px 18px', borderRadius: 10, fontFamily: t.body, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
          Open in builder
        </button>
        <button style={{ background: 'transparent', color: t.muted, border: 0, padding: '12px 0', fontFamily: t.body, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>
          dismiss
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PlaysGallery — 8 plays grid; hover or click to expand.
// ─────────────────────────────────────────────────────────────
function PlaysGallery({ theme, columns = 4, tier = null }) {
  const t = theme;
  const [open, setOpen] = useState(null);
  const items = tier ? PLAYS_DATA.filter(p => p.tier === tier) : PLAYS_DATA;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 14, fontFamily: t.body }}>
      {items.map((p) => {
        const isOpen = open === p.id;
        return (
          <div key={p.id}
               onMouseEnter={() => setOpen(p.id)}
               onMouseLeave={() => setOpen(null)}
               onClick={() => setOpen(isOpen ? null : p.id)}
               style={{
                 background: isOpen ? t.surfaceAlt : t.surface,
                 border: `1px solid ${isOpen ? t.lineStrong : t.line}`,
                 borderRadius: 14, padding: 18, color: t.fg,
                 transition: 'background 180ms, border-color 180ms, transform 180ms',
                 transform: isOpen ? 'translateY(-2px)' : 'none',
                 cursor: 'pointer', minHeight: 168, display: 'flex', flexDirection: 'column',
                 boxShadow: isOpen ? `0 18px 40px rgba(0,0,0,0.25)` : 'none',
               }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: t.mono, fontSize: 10, color: p.tier === 'Starter' ? t.accent : t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{p.tier} · {p.tag}</span>
              <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>{p.steps}-step</span>
            </div>
            <div style={{ marginTop: 12, fontFamily: t.display, fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15 }}>{p.title}</div>
            <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 11, color: t.mutedStrong, lineHeight: 1.4 }}>
              <div>trigger · <span style={{ color: t.fg }}>{p.trigger}</span></div>
              <div style={{ marginTop: 2 }}>channel · <span style={{ color: t.fg }}>{p.channel}</span></div>
            </div>
            <div style={{
              maxHeight: isOpen ? 100 : 0, opacity: isOpen ? 1 : 0,
              transition: 'max-height 220ms, opacity 220ms', overflow: 'hidden',
            }}>
              <div style={{ marginTop: 10, fontSize: 12.5, color: t.mutedStrong, lineHeight: 1.45 }}>{p.desc}</div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px dashed ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: t.mono, fontSize: 11, color: t.accent }}>{p.lift}</span>
              <span style={{ fontFamily: t.body, fontSize: 12, color: t.muted }}>Fork →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ChannelFanout — SVG diagram of one trigger fanning to N channels.
// Animated dots travel from trigger to each channel endpoint.
// ─────────────────────────────────────────────────────────────
function ChannelFanout({ theme }) {
  const t = theme;
  const W = 760, H = 360;
  const triggerX = 90, triggerY = H / 2;
  const channelX = W - 260;
  const channelYs = CHANNELS.map((_, i) => 40 + i * (H - 80) / (CHANNELS.length - 1));

  return (
    <div style={{ position: 'relative', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16, padding: 24, fontFamily: t.body, color: t.fg }}>
      <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
        One trigger · fan-out delivery
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="fanwire" x1="0" x2="1">
            <stop offset="0" stopColor={t.accent} stopOpacity="0.9" />
            <stop offset="1" stopColor={t.accent2} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* wires */}
        {channelYs.map((y, i) => {
          const path = `M ${triggerX + 80} ${triggerY} C ${triggerX + 200} ${triggerY}, ${channelX - 120} ${y}, ${channelX} ${y}`;
          return (
            <g key={i}>
              <path d={path} stroke="url(#fanwire)" strokeWidth="1.4" fill="none" />
              <circle r="3" fill={t.accent}>
                <animateMotion dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} path={path} />
              </circle>
            </g>
          );
        })}
        {/* trigger node */}
        <g transform={`translate(${triggerX}, ${triggerY})`}>
          <circle r="44" fill={t.bg} stroke={t.lineStrong} strokeWidth="1" />
          <circle r="44" fill="none" stroke={t.accent} strokeWidth="1.5" strokeDasharray="3 5" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
          </circle>
          <text textAnchor="middle" y="-4" fontFamily={t.display} fontSize="13" fontWeight="600" fill={t.fg}>0x7a3f</text>
          <text textAnchor="middle" y="12" fontFamily={t.mono} fontSize="9" fill={t.muted}>first deposit</text>
        </g>
        {/* trigger label */}
        <text x={triggerX} y={triggerY + 82} textAnchor="middle" fontFamily={t.mono} fontSize="10" fill={t.muted} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Trigger</text>
        {/* channel nodes */}
        {CHANNELS.map((c, i) => (
          <g key={c.id} transform={`translate(${channelX}, ${channelYs[i]})`}>
            <rect x="0" y="-18" width="240" height="36" rx="8" fill={t.bg} stroke={t.line} strokeWidth="1" />
            <text x="14" y="-2" fontFamily={t.display} fontSize="13" fontWeight="600" fill={t.fg}>{c.label}</text>
            <text x="14" y="12" fontFamily={t.mono} fontSize="9.5" fill={t.muted}>{c.sub}</text>
            <text x="226" y="4" textAnchor="end" fontFamily={t.mono} fontSize="10" fill={t.accent}>P{c.priority}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OnboardingTimeline — 5-step animated timeline.
// ─────────────────────────────────────────────────────────────
const ONBOARD_STEPS = [
  { n: '01', t: 'Connect', s: 'Paste your protocol’s contract address. Pick the chains you care about. No SDK install required to start.', dur: 'thirty seconds' },
  { n: '02', t: 'Observe', s: 'OnchainSuite indexes 90 days of activity and normalises it across chains. One specific cohort, one specific reason.', dur: 'under five minutes', highlight: true },
  { n: '03', t: 'Respond', s: 'Fork a Play, install the in-app SDK or upload an email list, and your trigger is live across every reachable channel.', dur: 'runs forever' },
];

function OnboardingTimeline({ theme }) {
  const t = theme;
  const tick = useTicker(1200);
  const active = tick % ONBOARD_STEPS.length;
  return (
    <div style={{ position: 'relative', fontFamily: t.body, color: t.fg }}>
      <div style={{ position: 'absolute', left: 28, top: 28, bottom: 28, width: 2, background: t.line }}></div>
      <div style={{ position: 'absolute', left: 28, top: 28, width: 2, height: `${(active / (ONBOARD_STEPS.length - 1)) * 100}%`, background: t.accent, transition: 'height 800ms cubic-bezier(.2,.7,.3,1)' }}></div>
      {ONBOARD_STEPS.map((s, i) => {
        const isActive = i === active;
        const isPast = i <= active;
        return (
          <div key={s.n} style={{ position: 'relative', paddingLeft: 70, paddingBottom: 28, paddingTop: 4 }}>
            <div style={{
              position: 'absolute', left: 14, top: 4, width: 30, height: 30,
              borderRadius: 999,
              background: isPast ? t.accent : t.surface,
              border: `1px solid ${isPast ? t.accent : t.lineStrong}`,
              color: isPast ? t.accentInk : t.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.mono, fontSize: 11, fontWeight: 600,
              transition: 'all 350ms', transform: isActive ? 'scale(1.15)' : 'scale(1)',
              boxShadow: isActive ? `0 0 24px ${t.accent}66` : 'none',
            }}>{s.n}</div>
            <div style={{ fontFamily: t.display, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: s.highlight ? t.accent : t.fg }}>{s.t}</div>
            <div style={{ marginTop: 4, fontSize: 14, color: t.mutedStrong, maxWidth: 520 }}>{s.s}</div>
            <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.04em' }}>{s.dur}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MarqueeRow — endless horizontal scroller, used for protocol logos / metrics
// ─────────────────────────────────────────────────────────────
function MarqueeRow({ items, theme, speed = 38 }) {
  const t = theme;
  return (
    <div style={{ overflow: 'hidden', position: 'relative', width: '100%', maskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)' }}>
      <div style={{ display: 'flex', gap: 48, animation: `oc-marquee ${speed}s linear infinite`, width: 'max-content' }}>
        {[...items, ...items, ...items].map((it, i) => (
          <div key={i} style={{ fontFamily: t.mono, fontSize: 13, color: t.muted, letterSpacing: '0.08em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 6, height: 6, background: t.accent, borderRadius: 999 }}></span>
            {it}
          </div>
        ))}
      </div>
      <style>{`@keyframes oc-marquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }`}</style>
    </div>
  );
}

// Expose all to global scope so the other Babel scripts can read them.
Object.assign(window, {
  ThemeA, ThemeB, PLAYS_DATA, CHANNELS, ONBOARD_STEPS,
  PushToastDemo, CohortWidget, PlaysGallery, ChannelFanout, OnboardingTimeline, MarqueeRow,
  useTicker,
});
