// demos-v2.jsx — modern interactive components for the rebuilt Direction A landing.
// Loaded after demos.jsx; shares the ThemeA/ThemeB tokens defined there.

const { useState: v2useState, useEffect: v2useEffect, useRef: v2useRef } = React;

// ─────────────────────────────────────────────────────────────
// EventStream — the new hero. Three columns: wallet events stream in
// on the left, OnchainSuite matches in the middle (a play lights up),
// and channels fire on the right. Loops continuously.
// ─────────────────────────────────────────────────────────────
const EVENTS = [
  { wallet: '0x7a3f…91bd', verb: 'unbonded', detail: 'LP · ouroboros · 24h cooldown', play: 'LP Unbonding Reminder', channels: ['push'] },
  { wallet: '0x4c2a…0e3d', verb: 'deposited', detail: '$1,840 USDC · first-time', play: 'First Deposit Welcome', channels: ['push', 'email'] },
  { wallet: '0xff01…aab2', verb: 'went quiet', detail: '30d inactive · was weekly', play: 'Churn Win-Back', channels: ['push', 'email'] },
  { wallet: '0xd9e0…7c41', verb: 'crossed', detail: '$50k TVL threshold', play: 'Whale Concierge', channels: ['email'] },
  { wallet: '0x1b8c…5fa6', verb: 'proposed', detail: 'OUR-0091 in quorum range', play: 'Governance Vote Reminder', channels: ['push', 'telegram'] },
  { wallet: '0x9012…b3de', verb: 'staked', detail: '$3,200 · 90-day lock', play: 'First Deposit Welcome', channels: ['push'] },
];

function EventStream({ theme }) {
  const t = theme;
  const [cursor, setCursor] = v2useState(0);
  const [fireIdx, setFireIdx] = v2useState(null);

  v2useEffect(() => {
    const id = setInterval(() => {
      setCursor(c => (c + 1) % EVENTS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  v2useEffect(() => {
    setFireIdx(null);
    const t1 = setTimeout(() => setFireIdx(cursor), 800);
    return () => clearTimeout(t1);
  }, [cursor]);

  const current = EVENTS[cursor];
  const channels = [
    { id: 'push', label: 'in-app push', sub: '100% reach' },
    { id: 'email', label: 'email', sub: 'where linked' },
    { id: 'telegram', label: 'telegram', sub: 'protocol bot' },
    { id: 'farcaster', label: 'farcaster', sub: 'via Neynar' },
  ];

  // Build a rotating window of recent events
  const window5 = Array.from({ length: 5 }).map((_, i) => {
    const idx = (cursor - i + EVENTS.length) % EVENTS.length;
    return { ...EVENTS[idx], _i: i };
  });

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: t.bg, border: `1px solid ${t.line}`, borderRadius: 18, overflow: 'hidden',
      fontFamily: t.body, color: t.fg,
      boxShadow: `0 30px 80px -20px rgba(0,0,0,0.55)`,
    }}>
      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${t.line} 1px, transparent 1px), linear-gradient(90deg, ${t.line} 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.6 }}></div>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${t.accent}15, transparent 60%)` }}></div>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 0.9fr 1fr', height: '100%' }}>
        {/* LEFT — onchain events */}
        <div style={{ padding: '20px 18px', borderRight: `1px solid ${t.line}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: t.mono, fontSize: 10.5, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: t.accent2, boxShadow: `0 0 10px ${t.accent2}` }}></span>
            onchain events
          </div>
          <div style={{ marginTop: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
            {window5.map((e, i) => (
              <div key={`${e.wallet}-${cursor}-${i}`} style={{
                padding: '10px 12px', borderRadius: 10,
                background: i === 0 ? t.surfaceAlt : 'transparent',
                border: i === 0 ? `1px solid ${t.lineStrong}` : `1px solid transparent`,
                opacity: 1 - i * 0.18,
                transform: `translateY(${i === 0 ? 0 : 0}px)`,
                transition: 'opacity 600ms, transform 600ms',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: t.mono, fontSize: 11 }}>
                  <span style={{ color: t.accent2 }}>{e.wallet}</span>
                  <span style={{ color: t.muted, fontSize: 9.5 }}>· now</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500, color: t.fg }}>
                  {e.verb}
                </div>
                <div style={{ marginTop: 2, fontSize: 11.5, color: t.mutedStrong, fontFamily: t.mono }}>{e.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE — match engine */}
        <div style={{ padding: '20px 16px', borderRight: `1px solid ${t.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase', position: 'absolute', top: 20, left: 16 }}>
            match
          </div>
          {/* Pulsing core */}
          <div style={{ width: 110, height: 110, borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, ${t.accent}40, transparent 70%)`,
              animation: 'oc-pulse 2.4s ease-in-out infinite',
            }}></div>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.display, fontSize: 22, fontWeight: 800, color: t.accentInk,
              boxShadow: `0 0 40px ${t.accent}80`,
            }}>◆</div>
          </div>
          {/* Play match label */}
          <div style={{ marginTop: 18, padding: '8px 12px', borderRadius: 999, background: t.surface, border: `1px solid ${t.lineStrong}`, fontFamily: t.mono, fontSize: 11, color: t.fg, transition: 'all 220ms' }}>
            <span style={{ color: t.muted }}>play · </span>{current.play}
          </div>
        </div>

        {/* RIGHT — channels fan-out */}
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: t.mono, fontSize: 10.5, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <span>response</span>
            <span style={{ color: t.accent }}>firing</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {channels.map((c, i) => {
              const active = fireIdx === cursor && current.channels.includes(c.id);
              return (
                <div key={c.id} style={{
                  position: 'relative',
                  padding: '12px 14px', borderRadius: 12,
                  background: active ? t.accent : t.surface,
                  border: `1px solid ${active ? t.accent : t.line}`,
                  color: active ? t.accentInk : t.fg,
                  transition: 'all 380ms cubic-bezier(.2,.9,.25,1.15)',
                  transform: active ? 'translateX(-4px)' : 'translateX(0)',
                  boxShadow: active ? `0 12px 30px ${t.accent}40` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: t.body, fontSize: 13.5, fontWeight: 600 }}>{c.label}</span>
                    <span style={{ fontFamily: t.mono, fontSize: 10, opacity: active ? 0.7 : 0.5 }}>{active ? 'sent' : c.sub}</span>
                  </div>
                  {active && (
                    <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 10.5, opacity: 0.8 }}>→ delivered to {current.wallet}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes oc-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IdeasAccordion — clickable accordion for the Four Ideas section.
// ─────────────────────────────────────────────────────────────
function IdeasAccordion({ theme, items }) {
  const t = theme;
  const [open, setOpen] = v2useState(0);
  return (
    <div style={{ borderTop: `1px solid ${t.line}` }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{
            borderBottom: `1px solid ${t.line}`,
            transition: 'background 240ms',
            background: isOpen ? t.surface : 'transparent',
          }}>
            <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
              width: '100%', display: 'grid', gridTemplateColumns: '80px 1fr auto',
              gap: 24, padding: '26px 28px', background: 'transparent', border: 0,
              cursor: 'pointer', alignItems: 'center', textAlign: 'left',
            }}>
              <span style={{ fontFamily: t.mono, fontSize: 11, color: isOpen ? t.accent : t.muted, letterSpacing: '0.14em' }}>0{i + 1}</span>
              <span style={{ fontFamily: t.display, fontSize: 30, fontWeight: 600, color: t.fg, letterSpacing: '-0.02em' }}>{it.h}</span>
              <span style={{
                width: 38, height: 38, borderRadius: 999,
                border: `1px solid ${isOpen ? t.accent : t.lineStrong}`,
                color: isOpen ? t.accent : t.fg,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 280ms, border-color 200ms',
                transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                fontFamily: t.display, fontSize: 18, fontWeight: 500,
              }}>+</span>
            </button>
            <div style={{
              maxHeight: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0,
              transition: 'max-height 360ms cubic-bezier(.2,.7,.3,1), opacity 280ms',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '0 28px 28px 132px',
                display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 36, alignItems: 'flex-start',
              }}>
                <p style={{ margin: 0, fontSize: 17, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 620 }} dangerouslySetInnerHTML={{ __html: it.s }}></p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: t.mono, fontSize: 11.5, color: t.muted, letterSpacing: '0.02em' }}>
                  {it.proof.map((p, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: t.accent }}>→</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Counter — animated count-up on mount (with optional formatter).
// ─────────────────────────────────────────────────────────────
function Counter({ to, prefix = '', suffix = '', duration = 1400, decimals = 0 }) {
  const [v, setV] = v2useState(0);
  const ref = v2useRef(null);
  v2useEffect(() => {
    const start = performance.now();
    let raf;
    function step(now) {
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(to * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  const formatted = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────
// LiveTicker — narrow strip with a rotating "now firing" line.
// ─────────────────────────────────────────────────────────────
function LiveTicker({ theme }) {
  const t = theme;
  const items = [
    'LP Unbonding Reminder → 12 wallets · ouroboros.fi',
    'First Deposit Welcome → 4 wallets · nebula·fi',
    'Churn Win-Back → 38 wallets · tidepool',
    'Governance Vote Reminder → 211 wallets · prism dao',
    'Whale Concierge → 1 wallet · keccak cash',
  ];
  const [i, setI] = v2useState(0);
  v2useEffect(() => {
    const id = setInterval(() => setI(x => (x + 1) % items.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '6px 12px', border: `1px solid ${t.line}`,
      borderRadius: 999, fontFamily: t.mono, fontSize: 11,
      color: t.mutedStrong, letterSpacing: '0.04em',
      background: t.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.accent, boxShadow: `0 0 10px ${t.accent}` }}></span>
      <span style={{ color: t.muted }}>now firing</span>
      <span style={{ color: t.fg, minWidth: 360, display: 'inline-block', overflow: 'hidden' }}>
        <span key={i} style={{ display: 'inline-block', animation: 'oc-tickerin 420ms cubic-bezier(.2,.9,.25,1.05)' }}>
          {items[i]}
        </span>
      </span>
      <style>{`@keyframes oc-tickerin { from { transform: translateY(10px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MagneticButton — primary CTA with hover lift + gradient sweep.
// ─────────────────────────────────────────────────────────────
function MagneticButton({ theme, primary, children, onClick }) {
  const t = theme;
  const [hover, setHover] = v2useState(false);
  const styleBase = {
    position: 'relative', overflow: 'hidden',
    padding: '14px 22px', borderRadius: 10,
    fontFamily: t.body, fontWeight: 600, fontSize: 15,
    cursor: 'pointer', border: 0, transition: 'transform 220ms, box-shadow 220ms',
    transform: hover ? 'translateY(-2px)' : 'translateY(0)',
  };
  if (primary) {
    return (
      <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
        style={{
          ...styleBase,
          background: t.accent, color: t.accentInk,
          boxShadow: hover ? `0 18px 40px ${t.accent}55, 0 0 0 1px ${t.accent}` : `0 6px 20px ${t.accent}28`,
        }}>
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        <span style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)`,
          transform: hover ? 'translateX(120%)' : 'translateX(-120%)',
          transition: 'transform 700ms cubic-bezier(.2,.7,.3,1)',
        }}></span>
      </button>
    );
  }
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{
        ...styleBase,
        background: 'transparent', color: t.fg,
        border: `1px solid ${hover ? t.fg : t.lineStrong}`,
      }}>
      {children}
    </button>
  );
}

Object.assign(window, { EventStream, IdeasAccordion, Counter, LiveTicker, MagneticButton });
