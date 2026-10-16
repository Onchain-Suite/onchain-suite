// site-a.jsx — shippable Wallet Native site
// Same content as direction-a.jsx, but the canvas wrapper and React-state router
// are stripped out. Each route is a real HTML entry; nav uses anchor links.

const A_T = window.ThemeA;

// page id → href (relative, so deploy is portable)
const PAGE_HREF = {
  landing:    'index.html',
  platform:   'platform.html',
  howitworks: 'how-it-works.html',
  plays:      'plays.html',
  pricing:    'pricing.html',
  docs:       'docs.html',
};

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────
function ANav({ page }) {
  const t = A_T;
  const links = [
    ['landing', 'Home'],
    ['platform', 'Platform'],
    ['howitworks', 'How It Works'],
    ['plays', 'Plays'],
    ['pricing', 'Pricing'],
    ['docs', 'Docs'],
  ];
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'rgba(10,13,16,0.78)', backdropFilter: 'blur(18px)',
      borderBottom: `1px solid ${t.line}`,
      fontFamily: t.body,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 36px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <a href={PAGE_HREF.landing} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: t.display, fontWeight: 700, fontSize: 17, color: t.fg, letterSpacing: '-0.01em', textDecoration: 'none' }}>
          <span style={{ width: 22, height: 22, background: t.accent, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: t.accentInk, fontSize: 13, fontWeight: 800 }}>◆</span>
          OnchainSuite
        </a>
        <nav style={{ display: 'flex', gap: 2, marginLeft: 12 }}>
          {links.map(([id, lbl]) => (
            <a key={id} href={PAGE_HREF[id]} style={{
              background: page === id ? t.surface : 'transparent',
              color: page === id ? t.fg : t.muted,
              padding: '8px 14px', borderRadius: 8,
              fontFamily: t.body, fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 140ms, background 140ms',
            }}>{lbl}</a>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="#signin" style={{ background: 'transparent', color: t.fg, padding: '8px 12px', fontFamily: t.body, fontSize: 14, textDecoration: 'none' }}>Sign in</a>
          <a href={PAGE_HREF.pricing} style={{ background: t.accent, color: t.accentInk, padding: '10px 16px', borderRadius: 8, fontFamily: t.body, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Get Early Access</a>
        </div>
      </div>
    </div>
  );
}

function AFooter() {
  const t = A_T;
  const cols = [
    ['Platform',   [['Home', PAGE_HREF.landing], ['Campaigns', '#'], ['Automations', '#'], ['Audience', '#'], ['Analytics', '#'], ['Integrations', '#'], ['Settings', '#']]],
    ['Product',    [['How It Works', PAGE_HREF.howitworks], ['Plays Library', PAGE_HREF.plays], ['Pricing', PAGE_HREF.pricing], ['Roadmap', '#'], ['Changelog', '#'], ['Security', '#']]],
    ['Developers', [['Docs', PAGE_HREF.docs], ['API reference', '#'], ['In-app SDK', '#'], ['Webhooks', '#'], ['Open source', '#'], ['Status', '#']]],
    ['Company',    [['About', '#'], ['Manifesto', '#'], ['Blog', '#'], ['Careers · 3 open', '#'], ['Press kit', '#'], ['Contact', '#']]],
  ];
  return (
    <footer style={{ background: t.bg, color: t.fg, fontFamily: t.body, borderTop: `1px solid ${t.line}`, position: 'relative' }}>
      {/* Top strip — CTA + newsletter side by side */}
      <div style={{ position: 'relative', borderBottom: `1px solid ${t.line}`, padding: '48px 36px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>the retention layer for onchain</div>
            <div style={{ marginTop: 10, fontFamily: t.display, fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05, color: t.fg, maxWidth: 580 }}>
              Stop losing users to the next farm.
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={PAGE_HREF.pricing} style={{ background: t.accent, color: t.accentInk, padding: '12px 18px', borderRadius: 10, fontFamily: t.body, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Request early access</a>
              <a href={PAGE_HREF.pricing} style={{ background: 'transparent', color: t.fg, border: `1px solid ${t.lineStrong}`, padding: '12px 18px', borderRadius: 10, fontFamily: t.body, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>Book a 20-min walkthrough</a>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>monthly digest</div>
            <div style={{ marginTop: 8, fontSize: 14, color: t.mutedStrong, lineHeight: 1.5 }}>New Plays, new channels, what we&rsquo;re shipping. No spam.</div>
            <form onSubmit={(e) => e.preventDefault()} style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <input placeholder="you@protocol.xyz" style={{ flex: 1, background: t.surface, border: `1px solid ${t.line}`, color: t.fg, padding: '11px 14px', borderRadius: 10, fontFamily: t.body, fontSize: 13.5, outline: 'none' }} />
              <button type="submit" style={{ background: t.fg, color: t.bg, border: 0, padding: '11px 16px', borderRadius: 10, fontFamily: t.body, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Subscribe</button>
            </form>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div style={{ position: 'relative', padding: '56px 36px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 36 }}>
            <div>
              <a href={PAGE_HREF.landing} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: t.display, fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', color: t.fg, textDecoration: 'none' }}>
                <span style={{ width: 26, height: 26, background: t.accent, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: t.accentInk, fontSize: 15, fontWeight: 800 }}>◆</span>
                OnchainSuite
              </a>
              <div style={{ marginTop: 22, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>find us</div>
              <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 13.5, color: t.mutedStrong, fontFamily: t.body }}>
                <a href="mailto:hello@onchainsuite.com" style={{ color: t.mutedStrong, textDecoration: 'none' }}>hello@onchainsuite.com</a>
                <a href="mailto:press@onchainsuite.com" style={{ color: t.mutedStrong, textDecoration: 'none' }}>press@onchainsuite.com</a>
                <div style={{ color: t.muted, fontFamily: t.mono, fontSize: 11 }}>Datum Labs Ltd · Singapore</div>
              </div>
              <div style={{ marginTop: 22, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>follow</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                {[['X', '#'], ['FC', '#'], ['GH', '#'], ['TG', '#'], ['LI', '#']].map(([s, h]) => (
                  <a key={s} href={h} style={{ width: 34, height: 34, border: `1px solid ${t.line}`, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.mono, fontSize: 11, color: t.mutedStrong, textDecoration: 'none' }}>{s}</a>
                ))}
              </div>
            </div>
            {cols.map(([title, items]) => (
              <div key={title}>
                <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${t.line}` }}>{title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                  {items.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} style={{ fontSize: 13.5, color: t.mutedStrong, textDecoration: 'none' }}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Baseline */}
          <div style={{ marginTop: 56, paddingTop: 20, borderTop: `1px solid ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.04em' }}>
            <span>© 2026 Datum Labs · OnchainSuite is in early access</span>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <a href="#" style={{ color: t.mutedStrong, textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: t.mutedStrong, textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ color: t.mutedStrong, textDecoration: 'none' }}>Cookies</a>
              <a href="#" style={{ color: t.mutedStrong, textDecoration: 'none' }}>Sub-processors</a>
              <a href="#" style={{ color: t.mutedStrong, textDecoration: 'none' }}>DPA</a>
            </div>
            <span>v2.0.4 · built with care in cf · sg · pdx</span>
          </div>
        </div>
      </div>

    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Landing
// ─────────────────────────────────────────────────────────────
function ALanding() {
  const t = A_T;
  return (
    <div>
      <section style={{ padding: '72px 36px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${t.accent}1f 1px, transparent 1px)`, backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 65%)', WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 65%)' }}></div>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <LiveTicker theme={t} />
          </div>
          <h1 style={{ marginTop: 22, fontFamily: t.display, fontSize: 124, lineHeight: 0.92, letterSpacing: '-0.045em', fontWeight: 600, color: t.fg }}>
            Wallets act.<br/>
            <span style={{ background: `linear-gradient(110deg, ${t.accent}, ${t.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Protocols respond.</span>
          </h1>
          <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'flex-end' }}>
            <p style={{ margin: 0, fontSize: 21, lineHeight: 1.45, color: t.mutedStrong, maxWidth: 560 }}>
              The retention layer for onchain protocols. Wallet-first, multi-channel, ready to ship.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <MagneticButton theme={t} primary>Get Early Access</MagneticButton>
              <MagneticButton theme={t}>Talk to the team →</MagneticButton>
            </div>
          </div>
          <div style={{ marginTop: 48, height: 420 }}>
            <EventStream theme={t} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.06em' }}>
            <span>↳ wallet activity, indexed across chains</span>
            <span>↳ one matching Play per event</span>
            <span>↳ delivered to every reachable channel</span>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 0', borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, background: t.bg }}>
        <MarqueeRow theme={t} items={['OUROBOROS', 'NEBULA·FI', 'TIDEPOOL', 'KECCAK CASH', 'PRISM DAO', '0xPROTOCOL', 'AETHER LABS', 'STARDUST', 'MERIDIAN', 'INDIGO·XYZ', 'HYPERSWAP', 'WARPED·FI']} />
      </section>

      <section style={{ padding: '64px 36px', borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 36 }}>
          {[
            { n: 100, suf: '%', label: 'reachable, in-app push', sub: 'every connected wallet' },
            { n: 5, suf: ' min', label: 'connect to first cohort', sub: 'no SDK required to start' },
            { n: 8, suf: '/8', label: 'plays ready to fork', sub: 'starter + advanced' },
            { n: 0, suf: '', label: 'per-seat tax', sub: 'unlimited team seats' },
          ].map((m, i) => (
            <div key={i} style={{ borderLeft: i ? `1px solid ${t.line}` : 'none', paddingLeft: i ? 24 : 0 }}>
              <div style={{ fontFamily: t.display, fontSize: 64, fontWeight: 600, color: t.fg, letterSpacing: '-0.035em', lineHeight: 1 }}>
                <Counter to={m.n} suffix={m.suf} />
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, color: t.fg, fontFamily: t.body, fontWeight: 500 }}>{m.label}</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: t.muted, fontFamily: t.mono, letterSpacing: '0.04em' }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '96px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <h2 style={{ fontFamily: t.display, fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.0, maxWidth: 1000 }}>
          You can see the moment a wallet stops mattering.<br/>
          <span style={{ color: t.muted }}>You can&rsquo;t say anything about it.</span>
        </h2>
        <p style={{ marginTop: 22, fontSize: 18, color: t.mutedStrong, lineHeight: 1.5, maxWidth: 680 }}>
          The retention problem onchain isn&rsquo;t visibility — it&rsquo;s response. We close that loop.
        </p>
      </section>

      <section style={{ padding: '0 36px 110px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontFamily: t.display, fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.0, maxWidth: 880 }}>
                Four ideas that<br/>make the product work.
              </h2>
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.08em' }}>tap to expand →</div>
          </div>
          <IdeasAccordion theme={t} items={[
            { h: 'Wallet-first identity', s: 'A wallet <em>is</em> the user. Email, FID, X, Discord are channels — attached when available, never blocking.', proof: ['primary key · wallet address', 'attach: email · fid · x · discord', 'no email = still reachable'] },
            { h: 'Multi-channel by default', s: 'One trigger fans out to in-app push, email, Telegram, Farcaster, and X — wherever the wallet is reachable.', proof: ['in-app push: 100% of connected wallets', 'email: ≥60% within 30 days', 'fan-out is automatic'] },
            { h: 'Plays, not a blank canvas', s: 'Eight pre-built automations cover the moves every protocol makes. Fork one, edit two fields, ship.', proof: ['4 starter · 4 advanced', 'versioned · forkable', 'peer benchmarks included'] },
            { h: 'Value before setup', s: 'Five minutes from contract address, OnchainSuite has indexed 90 days of behaviour and surfaced one cohort worth acting on.', proof: ['no SDK to see your data', 'first cohort under five min', 'one CTA, one click to fire'] },
          ]} />
        </div>
      </section>

      <section style={{ padding: '110px 36px', background: t.surface, borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: t.display, fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.05 }}>
              Connect.<br/>Observe.<br/>Respond.
            </h2>
            <p style={{ marginTop: 18, fontSize: 17, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 460 }}>
              Three steps. Thirty seconds in, forever out.
            </p>
          </div>
          <div>
            <OnboardingTimeline theme={t} />
          </div>
        </div>
      </section>

      <section style={{ padding: '110px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: t.display, fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.05 }}>
              One trigger.<br/>Every reachable channel.
            </h2>
            <p style={{ marginTop: 18, fontSize: 17, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 440 }}>
              In-app push is the default — every connected wallet is reachable on it. Email, Telegram, Farcaster, and X are additive: when the user gives consent, the wallet becomes reachable on more places, and your triggers fan out automatically.
            </p>
          </div>
          <ChannelFanout theme={t} />
        </div>
      </section>

      <section style={{ padding: '110px 36px', borderTop: `1px solid ${t.line}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: t.display, fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg, lineHeight: 1.05 }}>
              Identity bridging without identity exposure.
            </h2>
            <p style={{ marginTop: 18, fontSize: 16.5, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 480 }}>
              Wallet addresses are public. Email, FID, X handle, Discord — all the channels we reach a user through — are not. Where we link them to a wallet, we do it with zero-knowledge proofs: we verify the link without storing the underlying PII in a form that exposes it.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: t.mono, fontSize: 11 }}>
              {['GDPR-compliant by architecture', 'opt-in by the user', 'auditable by us', 'no third-party data sharing'].map(c => (
                <span key={c} style={{ padding: '6px 10px', border: `1px solid ${t.line}`, borderRadius: 6, color: t.mutedStrong }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: 'grid', gap: 20 }}>
              {[
                ['Wallet data', 'Index public on-chain activity. Normalise it across protocols. Surface segments.', 'Nothing you can&rsquo;t do yourself with a Dune account — except faster, and continuous.'],
                ['Channel handles', 'Bridge email / FID / X handle to wallets via ZK proofs.', 'Store the proof and the consent record. Never expose the underlying PII in a form a third party could re-identify.'],
              ].map(([k, a, b]) => (
                <div key={k} style={{ paddingBottom: 18, borderBottom: `1px dashed ${t.line}` }}>
                  <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ marginTop: 10, fontSize: 15, color: t.fg, lineHeight: 1.5 }}>{a}</div>
                  <div style={{ marginTop: 6, fontSize: 14, color: t.muted, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: b }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Platform
// ─────────────────────────────────────────────────────────────
function APlatform() {
  const t = A_T;
  const sections = [
    { tag: 'Home', desc: 'Command centre. Today&rsquo;s churn signals, the last 24 hours of campaign activity, quick actions, and the aha-moment surfaced from your most recent indexing run.', meta: 'always-on overview' },
    { tag: 'Campaigns', desc: 'One-off sends. Email builder, multi-channel composer, A/B testing, send-time analytics. Use this for the things that don&rsquo;t repeat — a launch, a single announcement, a one-time airdrop notification.', meta: 'one-off · 4 sub-pages' },
    { tag: 'Automations', desc: 'Triggered flows. Plays gallery first, blank-canvas builder behind a button. Onchain triggers, multi-step sequences, multi-channel routing, per-channel analytics.', meta: 'plays + builder' },
    { tag: 'Audience', desc: 'Unified contact profiles built around the wallet, with email / FID / X / Discord as channel handles. Segment builder. CSV import / export.', meta: 'wallet-keyed CRM' },
    { tag: 'Analytics', desc: 'Performance, churn risk, engagement scoring, revenue attribution, peer benchmarks. A SQL interface for teams that want the raw data.', meta: 'including SQL access' },
    { tag: 'Integrations', desc: 'Wallet providers, OAuth for X and Discord, Telegram bot, Farcaster via Neynar, the in-app SDK install, webhooks, API keys.', meta: 'channels + dev plumbing' },
    { tag: 'Settings', desc: 'Account, billing, team, security, privacy controls including peer-benchmark opt-out.', meta: 'admin' },
  ];
  return (
    <div>
      <section style={{ padding: '88px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>the platform</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontSize: 84, fontWeight: 600, letterSpacing: '-0.04em', color: t.fg, lineHeight: 0.98, maxWidth: 1100 }}>
          Seven sections.<br/><span style={{ color: t.accent }}>One product.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 19, color: t.mutedStrong, lineHeight: 1.5, maxWidth: 720 }}>
          The platform consolidates what used to be a patchwork of tools into seven task-centred sections. The in-app navigation and this website use the same vocabulary.
        </p>
      </section>

      <section style={{ padding: '0 36px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ border: `1px solid ${t.line}`, borderRadius: 16, overflow: 'hidden', background: t.surface }}>
          {sections.map((s, i) => (
            <div key={s.tag} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 220px', gap: 24, padding: '28px 32px', borderTop: i ? `1px solid ${t.line}` : 'none', alignItems: 'center' }}>
              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.14em' }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div style={{ fontFamily: t.display, fontSize: 24, fontWeight: 600, color: t.fg, letterSpacing: '-0.015em' }}>{s.tag}</div>
                <p style={{ marginTop: 8, fontSize: 14.5, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 720 }} dangerouslySetInnerHTML={{ __html: s.desc }}></p>
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.06em', textAlign: 'right' }}>{s.meta}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '88px 36px', borderTop: `1px solid ${t.line}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>channel reachability</div>
          <h2 style={{ marginTop: 14, fontFamily: t.display, fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg }}>Reach by channel, per wallet.</h2>
          <div style={{ marginTop: 32, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden' }}>
            {[['Channel','Identifier needed','Source','Reachability'],
              ['In-app push','wallet address only','dApp connected session','100% of connected wallets'],
              ['Email','verified email','synthesis · CSV · OAuth','≥60% within 30 days (target)'],
              ['Telegram','wallet-linked verify','protocol-owned bot','protocol-controlled'],
              ['Farcaster','FID','wallet → FID via Neynar','growing subset'],
              ['X','X handle','OAuth','opt-in subset']].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1.4fr', padding: '16px 22px', borderTop: i ? `1px solid ${t.line}` : 'none', fontFamily: i ? t.body : t.mono, fontSize: i ? 14.5 : 11, color: i ? t.fg : t.muted, letterSpacing: i ? 'normal' : '0.1em', textTransform: i ? 'none' : 'uppercase', background: i ? 'transparent' : t.surface }}>
                {row.map((c, j) => <span key={j}>{c}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// How It Works
// ─────────────────────────────────────────────────────────────
function AHowItWorks() {
  const t = A_T;
  const layers = [
    {
      n: '01', tag: 'IDENTITY', codename: '3ridge',
      title: 'Your users have wallets. We link them to everything else.',
      body: 'Every user is a wallet. Around that wallet, we attach the channels they&rsquo;re reachable on — email, Farcaster ID, X handle, Discord — as they&rsquo;re verified. The link is created with zero-knowledge cryptography: the proof exists, the raw PII is never exposed in a way that could be reconstructed.',
      dev: 'For developers: available via SDK and API for protocols embedding identity into their own platform.',
    },
    {
      n: '02', tag: 'INTELLIGENCE', codename: 'Onch3n',
      title: 'We watch the blockchain so you don&rsquo;t have to.',
      body: 'Our Protocol Normalisation Engine ingests activity across Ethereum, Solana, Base, Polygon, and more. It translates the underlying complexity — a swap on Uniswap, a swap on Jupiter, a swap on Aerodrome — into one marketer-shaped event: &ldquo;swap.&rdquo; Same for deposits, mints, unstakes, governance votes.',
      dev: 'This is also where the aha-moment comes from. Within five minutes of you connecting a contract, the intelligence layer surfaces the cohort most worth your attention — with a number, a reason, and a recommended next move.',
    },
    {
      n: '03', tag: 'ACTION', codename: 'R3tain',
      title: 'The right response, on the right channel, the moment it matters.',
      body: 'Triggers fire across whichever channels reach the wallet — in-app push by default, email when it&rsquo;s available, Telegram and Farcaster where the user has chosen to be reachable. The same trigger, the same segment, fans out to wherever the wallet is.',
      dev: 'Analytics come back per channel: opened, dismissed, clicked, replied.',
    },
  ];
  return (
    <div>
      <section style={{ padding: '88px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>how it works</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontSize: 84, fontWeight: 600, letterSpacing: '-0.04em', color: t.fg, lineHeight: 0.98, maxWidth: 1100 }}>
          Three layers,<br/><span style={{ color: t.accent }}>doing one job.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 19, color: t.mutedStrong, lineHeight: 1.5, maxWidth: 760 }}>
          When a marketer creates an automation, they pick a trigger and write a message. Under the surface, three integrated systems are doing the work. You don&rsquo;t need to know the names. They&rsquo;re here for the people who do.
        </p>
      </section>

      {layers.map((l, i) => (
        <section key={l.n} style={{ padding: '72px 36px', borderTop: `1px solid ${t.line}`, background: i % 2 === 0 ? t.bg : t.surface }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em' }}>{l.n} · LAYER · {l.tag}</span>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, padding: '4px 8px', border: `1px solid ${t.line}`, borderRadius: 999, letterSpacing: '0.06em' }}>internal · {l.codename}</span>
              </div>
              <h2 style={{ marginTop: 16, fontFamily: t.display, fontSize: 40, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg, lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: l.title }}></h2>
              <p style={{ marginTop: 18, fontSize: 16.5, color: t.mutedStrong, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: l.body }}></p>
              <p style={{ marginTop: 14, fontSize: 14.5, color: t.muted, lineHeight: 1.55, fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: l.dev }}></p>
            </div>
            <div style={{ background: i % 2 === 0 ? t.surface : t.bg, border: `1px solid ${t.line}`, borderRadius: 14, padding: 24, fontFamily: t.mono, fontSize: 12.5, color: t.fg, lineHeight: 1.65 }}>
              {l.tag === 'IDENTITY' && (
                <div>
                  <div style={{ color: t.muted, marginBottom: 12 }}>{`// wallet-keyed identity record`}</div>
                  <div>{`{`}</div>
                  <div>&nbsp;&nbsp;wallet: <span style={{ color: t.accent }}>"0x7a3f…91bd"</span>,</div>
                  <div>&nbsp;&nbsp;channels: {`{`}</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;email: <span style={{ color: t.muted }}>[zk_proof, consent]</span>,</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;farcaster: <span style={{ color: t.muted }}>[fid_proof]</span>,</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;x: <span style={{ color: t.muted }}>[oauth_proof]</span>,</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;discord: <span style={{ color: t.muted }}>null</span>,</div>
                  <div>&nbsp;&nbsp;{`}`},</div>
                  <div>&nbsp;&nbsp;pii_stored: <span style={{ color: t.accent }}>false</span>,</div>
                  <div>{`}`}</div>
                </div>
              )}
              {l.tag === 'INTELLIGENCE' && (
                <div>
                  <div style={{ color: t.muted, marginBottom: 12 }}>{`// normalised across chains and DEXes`}</div>
                  <div>uniswap.Swap &nbsp;→ swap</div>
                  <div>jupiter.Swap &nbsp;→ swap</div>
                  <div>aerodrome.Sw  → swap</div>
                  <div>aave.Deposit &nbsp;→ deposit</div>
                  <div>compound.Mint → deposit</div>
                  <div>gov.CastVote &nbsp;→ vote</div>
                  <div style={{ marginTop: 12, color: t.accent }}>$ cohorts.suggest(--top 1)</div>
                  <div>&nbsp;&nbsp;→ 142 dormant LPs · median $4.2k</div>
                  <div>&nbsp;&nbsp;→ next move: in-app push on reconnect</div>
                </div>
              )}
              {l.tag === 'ACTION' && (
                <div>
                  <div style={{ color: t.muted, marginBottom: 12 }}>{`// one trigger, fanned out`}</div>
                  <div>on(<span style={{ color: t.accent }}>"wallet.firstDeposit"</span>, w =&gt; {`{`}</div>
                  <div>&nbsp;&nbsp;send.inAppPush(w, welcome)&nbsp;&nbsp;<span style={{ color: t.muted }}>// default</span></div>
                  <div>&nbsp;&nbsp;send.email(w, welcome).optional()</div>
                  <div>&nbsp;&nbsp;send.farcaster(w, welcome).optional()</div>
                  <div>{`}`})</div>
                  <div style={{ marginTop: 12, color: t.muted }}>{`// analytics, per channel:`}</div>
                  <div>delivered · viewed · dismissed · clicked</div>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plays
// ─────────────────────────────────────────────────────────────
function APlays() {
  const t = A_T;
  const [tier, setTier] = React.useState('All');
  const tiers = ['All', 'Starter', 'Advanced'];
  return (
    <div>
      <section style={{ padding: '88px 36px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>plays · v2.0</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontSize: 84, fontWeight: 600, letterSpacing: '-0.04em', color: t.fg, lineHeight: 0.98 }}>
          Eight automations<br/><span style={{ color: t.accent }}>every protocol should be running.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 19, color: t.mutedStrong, lineHeight: 1.5, maxWidth: 760 }}>
          We&rsquo;ve built them. Fork one, edit two fields, ship. Each Play comes with a trigger, a default segment, copy templates, recommended timing, and peer benchmarks from the protocols already using it.
        </p>
      </section>

      <section style={{ padding: '32px 36px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: t.mono, fontSize: 12 }}>
            {tiers.map(c => (
              <button key={c} onClick={() => setTier(c)} style={{ padding: '8px 14px', border: `1px solid ${tier === c ? t.accent : t.line}`, color: tier === c ? t.accent : t.mutedStrong, borderRadius: 999, background: 'transparent', cursor: 'pointer', fontFamily: t.mono, fontSize: 12 }}>{c}</button>
            ))}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.08em' }}>
            STARTER · works the day you connect &nbsp;·&nbsp; ADVANCED · needs governance, TVL or quests in place
          </div>
        </div>
        <PlaysGallery theme={t} columns={3} tier={tier === 'All' ? null : tier} />
      </section>

      <section style={{ padding: '88px 36px', borderTop: `1px solid ${t.line}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>anatomy</div>
            <h2 style={{ marginTop: 14, fontFamily: t.display, fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', color: t.fg, lineHeight: 1.05 }}>Every Play is a versioned spec.</h2>
            <p style={{ marginTop: 16, fontSize: 16, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 480 }}>
              Plays live in code, not in DB. A Play is a typed object — trigger, segment, channels, copy template, recommended timing, peer benchmark. Fork it and your edits diverge from version 1.
            </p>
            <div style={{ marginTop: 24, display: 'grid', gap: 10, fontFamily: t.mono, fontSize: 12 }}>
              {['trigger', 'segment', 'channels', 'copy template', 'timing', 'peer benchmark'].map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px dashed ${t.line}` }}>
                  <span style={{ color: t.mutedStrong, letterSpacing: '0.05em' }}>{k}</span>
                  <span style={{ color: t.accent }}>typed · editable</span>
                </div>
              ))}
            </div>
          </div>
          <pre style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 14, padding: 24, margin: 0, fontFamily: t.mono, fontSize: 12.5, lineHeight: 1.6, color: t.fg }}>
{`# plays/first-deposit-welcome.yaml
play: first-deposit-welcome
tier: starter
version: 1

trigger:
  event: wallet.firstDeposit
  threshold: 1   # USD

channels:
  default: [in_app, email]

steps:
  - send.inAppPush:
      template: welcome
  - delay: 48h
  - send.email:
      template: educate
      optional: true
  - delay: 7d
  - send.feedbackPrompt

benchmark:
  open_rate: "28–34%"
  source: cross-protocol·anon`}
          </pre>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────
function APricing() {
  const t = A_T;
  return (
    <div>
      <section style={{ padding: '88px 36px 48px', maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>early access · pricing</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontSize: 88, fontWeight: 600, letterSpacing: '-0.04em', color: t.fg, lineHeight: 0.96 }}>
          Built with a small group<br/><span style={{ color: t.accent }}>of protocols. On purpose.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 19, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 760, margin: '22px auto 0' }}>
          OnchainSuite is in early access. We&rsquo;re onboarding a focused group of teams that want to work directly with us, test the platform, and help shape what gets built next.
        </p>
      </section>

      <section style={{ padding: '32px 36px 88px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 14 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 18, padding: 36, position: 'relative', boxShadow: `0 30px 80px ${t.accent}1f` }}>
            <span style={{ position: 'absolute', top: -12, left: 32, background: t.accent, color: t.accentInk, padding: '4px 10px', borderRadius: 999, fontFamily: t.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>open now</span>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>what early access includes</div>
            <h3 style={{ marginTop: 12, fontFamily: t.display, fontSize: 32, fontWeight: 600, color: t.fg, letterSpacing: '-0.02em' }}>The five things you get.</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 14 }}>
              {[
                ['Direct line to product', 'Your feedback lands in the roadmap, not a feature-request portal.'],
                ['Priority onboarding', 'White-glove integration support from our engineering team.'],
                ['Locked-in launch pricing', 'Whatever you start at, you stay at — through public release.'],
                ['Beta channels and Plays', 'See new channels and Plays before they&rsquo;re generally available.'],
                ['Reference customer status', 'If you want it: first to market on behaviour-triggered retention for Web3.'],
              ].map(([h, s]) => (
                <li key={h} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 12, fontSize: 14.5, color: t.fg, lineHeight: 1.5 }}>
                  <span style={{ color: t.accent, marginTop: 1, fontWeight: 600 }}>→</span>
                  <span>
                    <span style={{ fontWeight: 600 }}>{h}.</span>
                    <span style={{ color: t.mutedStrong }} dangerouslySetInnerHTML={{ __html: ` ${s}` }}></span>
                  </span>
                </li>
              ))}
            </ul>
            <button style={{ marginTop: 28, background: t.accent, color: t.accentInk, border: 0, padding: '14px 22px', borderRadius: 10, fontFamily: t.body, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Request Early Access →</button>
          </div>

          <div style={{ background: 'transparent', border: `1px solid ${t.line}`, borderRadius: 18, padding: 36 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>what we ask in return</div>
            <h3 style={{ marginTop: 12, fontFamily: t.display, fontSize: 32, fontWeight: 600, color: t.fg, letterSpacing: '-0.02em' }}>Honesty, mostly.</h3>
            <p style={{ marginTop: 16, fontSize: 15.5, color: t.mutedStrong, lineHeight: 1.6 }}>
              We need to see how the product holds up against real protocols, real volumes, and real edge cases. In exchange, the product gets shaped around your problems before anyone else&rsquo;s.
            </p>
            <div style={{ marginTop: 24, padding: 20, border: `1px dashed ${t.line}`, borderRadius: 10, fontFamily: t.mono, fontSize: 12.5, color: t.fg, lineHeight: 1.8 }}>
              <div style={{ color: t.muted }}>{`// fields we'll ask about`}</div>
              <div>name <span style={{ color: t.muted }}>—</span> who&rsquo;s the contact</div>
              <div>protocol <span style={{ color: t.muted }}>—</span> name + chains</div>
              <div>scale <span style={{ color: t.muted }}>—</span> wallets you serve today</div>
              <div>challenge <span style={{ color: t.muted }}>—</span> biggest retention gap</div>
              <div style={{ marginTop: 10, color: t.muted }}>{`// we'll be in touch within two business days`}</div>
            </div>
            <button style={{ marginTop: 24, background: 'transparent', color: t.fg, border: `1px solid ${t.lineStrong}`, padding: '14px 22px', borderRadius: 10, fontFamily: t.body, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Schedule a call →</button>
          </div>
        </div>

        <div style={{ marginTop: 56, border: `1px solid ${t.line}`, borderRadius: 16, padding: 28, background: t.surface, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>about public pricing</div>
            <div style={{ marginTop: 8, fontFamily: t.display, fontSize: 26, color: t.fg, fontWeight: 600, letterSpacing: '-0.015em' }}>We&rsquo;ll publish it when it&rsquo;s real.</div>
            <p style={{ marginTop: 8, color: t.mutedStrong, fontSize: 14.5, lineHeight: 1.55, maxWidth: 600 }}>
              Public pricing arrives with general release. Early-access teams lock in launch rates ahead of that — across every channel, with no per-seat tax.
            </p>
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.fg, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>seats</span><span>unlimited</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>per-channel tax</span><span>none</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>billing model</span><span>wallets reached</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>public release</span><span>later this year</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Docs
// ─────────────────────────────────────────────────────────────
function ADocs() {
  const t = A_T;
  const sections = [
    { tag: 'Quickstart', items: ['Connect a contract', 'Read the first cohort', 'Fork your first Play', 'Install the in-app SDK', 'Send a test'] },
    { tag: 'SDK reference', items: ['onchainsuite.init()', 'identify(wallet)', 'send.inAppPush()', 'send.email()', 'render(toast | banner | modal)'] },
    { tag: 'Play spec', items: ['Play schema', 'Trigger types', 'Segment DSL', 'Copy templates · dynamic blocks', 'Peer benchmarks'] },
    { tag: 'API', items: ['Wallet records', 'Segments', 'Automations', 'Channel handles', 'Webhooks'] },
    { tag: 'Integrations', items: ['Neynar (Farcaster)', 'Telegram Bot API', 'X OAuth', 'Discord OAuth', 'Slack notifications'] },
    { tag: 'Operations', items: ['ZK identity bridging', 'Sub-processors', 'Data residency', 'Rate limits', 'Status & SLA'] },
  ];
  return (
    <div>
      <section style={{ padding: '88px 36px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>docs · v2.0</div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, alignItems: 'flex-end' }}>
          <h1 style={{ fontFamily: t.display, fontSize: 78, fontWeight: 600, letterSpacing: '-0.04em', color: t.fg, lineHeight: 0.98, margin: 0 }}>
            Built for engineers. <span style={{ color: t.accent }}>Read like one.</span>
          </h1>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, lineHeight: 1.7 }}>
            <div>last updated · 2026-05-10</div>
            <div>changelog · <span style={{ color: t.accent }}>v2.0 · multi-channel</span></div>
            <div>status · all systems operational</div>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 36px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {sections.map((s) => (
            <div key={s.tag} style={{ border: `1px solid ${t.line}`, borderRadius: 14, padding: 22, background: t.surface }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: t.display, fontSize: 18, fontWeight: 600, color: t.fg, letterSpacing: '-0.01em' }}>{s.tag}</div>
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>{s.items.length} pages</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 8 }}>
                {s.items.map(it => (
                  <li key={it} style={{ fontSize: 14, color: t.mutedStrong, padding: '6px 0', borderTop: `1px dashed ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{it}</span>
                    <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>↗</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '40px 36px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>install</div>
        <pre style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, padding: 28, margin: 0, fontFamily: t.mono, fontSize: 14, lineHeight: 1.7, color: t.fg, overflow: 'hidden' }}>
{`# 1. install the in-app SDK
$ npm install @onchainsuite/sdk

# 2. drop it into your dApp
import { OnchainSuite } from '@onchainsuite/sdk';

const oc = OnchainSuite.init({
  apiKey: process.env.ONCHAINSUITE_KEY,
  protocol: 'ouroboros',
});

oc.identify({ wallet: connectedAddress });
oc.render({ surface: 'toast', position: 'top' });

# 3. in-app push is live. email, telegram,
#    farcaster, X fan out as users opt in.`}
        </pre>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Site shell — wraps a page with nav + footer
// ─────────────────────────────────────────────────────────────
const PAGE_COMPONENT = {
  landing:    ALanding,
  platform:   APlatform,
  howitworks: AHowItWorks,
  plays:      APlays,
  pricing:    APricing,
  docs:       ADocs,
};

function OnchainSuiteSite({ page }) {
  const t = A_T;
  const Page = PAGE_COMPONENT[page] || ALanding;
  React.useEffect(() => {
    // Auto-scroll to top on mount (HTML entry pages always load at top, but
    // browser back/forward sometimes restores a position from another route).
    window.scrollTo(0, 0);
  }, []);
  return (
    <div style={{ background: t.bg, color: t.fg, fontFamily: t.body, minHeight: '100vh', width: '100%' }}>
      <ANav page={page} />
      <Page />
      <AFooter />
    </div>
  );
}

window.OnchainSuiteSite = OnchainSuiteSite;
