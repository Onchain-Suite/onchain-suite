// direction-b.jsx — "Editorial Protocol"
// Cream + black + burnt accent. Newsreader serif + Inter Tight + JetBrains Mono.
// Editorial / financial-document mood. v3 voice: institutional, authentic, opinionated.

const B_T = window.ThemeB;

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────
function BNav({ page, setPage }) {
  const t = B_T;
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
      background: 'rgba(243,239,230,0.86)', backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${t.lineStrong}`,
      fontFamily: t.body,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: t.display, fontStyle: 'italic', fontWeight: 500, fontSize: 22, color: t.fg, letterSpacing: '-0.015em' }}>Onchain<span style={{ color: t.accent, fontStyle: 'normal' }}>·</span>Suite</span>
          <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted, letterSpacing: '0.1em' }}>v.2.0 · early access</span>
        </div>
        <nav style={{ display: 'flex', gap: 20, marginLeft: 24, alignItems: 'center' }}>
          {links.map(([id, lbl]) => (
            <button key={id} onClick={() => setPage(id)} style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              color: page === id ? t.fg : t.mutedStrong,
              fontFamily: t.body, fontSize: 14, fontWeight: 500,
              padding: '6px 2px',
              borderBottom: page === id ? `2px solid ${t.accent}` : '2px solid transparent',
              transition: 'border-color 140ms, color 140ms',
            }}>{lbl}</button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <button style={{ background: 'transparent', color: t.fg, border: 0, padding: '8px 0', fontFamily: t.body, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign in</button>
          <button onClick={() => setPage('pricing')} style={{ background: t.fg, color: t.bg, border: 0, padding: '11px 18px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 13.5, cursor: 'pointer' }}>Get Early Access</button>
        </div>
      </div>
    </div>
  );
}

function BFooter() {
  const t = B_T;
  const cols = [
    ['Platform', ['Campaigns', 'Automations', 'Audience', 'Analytics', 'Integrations']],
    ['Product', ['How It Works', 'Plays', 'Pricing', 'Changelog']],
    ['Developers', ['Docs', 'API reference', 'In-app SDK', 'Webhooks', 'Status']],
    ['Company', ['About', 'Blog', 'Careers', 'Privacy', 'Contact']],
  ];
  return (
    <footer style={{ background: t.bg, color: t.fg, fontFamily: t.body, borderTop: `1px solid ${t.lineStrong}`, padding: '72px 36px 36px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr 1fr 1fr', gap: 36 }}>
          <div>
            <div style={{ fontFamily: t.display, fontSize: 28, fontWeight: 500, fontStyle: 'italic', letterSpacing: '-0.02em', color: t.fg }}>Onchain<span style={{ color: t.accent, fontStyle: 'normal' }}>·</span>Suite</div>
            <p style={{ marginTop: 14, fontSize: 13.5, color: t.mutedStrong, maxWidth: 300, lineHeight: 1.55 }}>
              Behaviour-triggered retention for onchain protocols. Wallet-first, multi-channel, ready to ship.
            </p>
            <div style={{ marginTop: 22, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.06em' }}>
              hello@onchainsuite.com
            </div>
          </div>
          {cols.map(([title, items]) => (
            <div key={title}>
              <div style={{ fontFamily: t.display, fontSize: 15, fontWeight: 600, color: t.fg, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${t.lineStrong}` }}>{title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {items.map(it => <li key={it} style={{ fontSize: 13.5, color: t.mutedStrong, cursor: 'pointer' }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.04em' }}>© 2026 Datum Labs · OnchainSuite is in early access</span>
          <span style={{ fontFamily: t.display, fontStyle: 'italic', fontSize: 14, color: t.muted }}>&ldquo;A wallet is the user.&rdquo;</span>
        </div>
      </div>
    </footer>
  );
}

function BSectionHeader({ n, label, children }) {
  const t = B_T;
  return (
    <div style={{ borderTop: `2px solid ${t.fg}`, paddingTop: 18, marginBottom: 32, display: 'grid', gridTemplateColumns: '60px 1fr', gap: 18, alignItems: 'baseline' }}>
      <div style={{ fontFamily: t.mono, fontSize: 11, color: t.fg, letterSpacing: '0.12em' }}>§ {n}</div>
      <div>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Landing
// ─────────────────────────────────────────────────────────────
function BLanding() {
  const t = B_T;
  return (
    <div>
      {/* Masthead */}
      <section style={{ padding: '32px 36px 0', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${t.lineStrong}`, paddingBottom: 14, fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.06em' }}>
          <span>VOL. II · ISSUE 0 — MAY 2026</span>
          <span>WALLET-FIRST · MULTI-CHANNEL · IN EARLY ACCESS</span>
          <span>DATUM LABS</span>
        </div>
      </section>

      {/* Hero */}
      <section style={{ padding: '40px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>The thesis</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontWeight: 500, fontSize: 168, lineHeight: 0.88, letterSpacing: '-0.045em', color: t.fg }}>
          Wallets act.<br />
          <span style={{ fontStyle: 'italic', color: t.accent }}>Protocols</span><br />
          respond.
        </h1>
        <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 56, alignItems: 'flex-start' }}>
          <p style={{ fontFamily: t.display, fontSize: 26, fontWeight: 400, color: t.fg, lineHeight: 1.32, margin: 0, letterSpacing: '-0.01em', maxWidth: 640 }}>
            <span style={{ fontStyle: 'italic', color: t.accent }}>OnchainSuite</span> is the retention layer for onchain protocols. Identify users by wallet. Reach them on the channels they actually use. See your first valuable cohort before you build a campaign.
          </p>
          <div style={{ borderLeft: `2px solid ${t.fg}`, paddingLeft: 22 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>What&rsquo;s true in v.2</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 10 }}>
              {[
                'Wallet-first identity. Channels attach as users opt in.',
                'In-app push reaches 100% of connected wallets on day one.',
                'Eight Plays cover the moves every protocol makes.',
                'First valuable cohort within five minutes of connect.',
              ].map((it, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', fontSize: 14, color: t.fg, paddingBottom: 8, borderBottom: `1px dashed ${t.line}` }}>
                  <span style={{ fontFamily: t.mono, color: t.muted }}>0{i + 1}</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <button style={{ background: t.fg, color: t.bg, border: 0, padding: '13px 18px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>Get Early Access</button>
              <button style={{ background: 'transparent', color: t.fg, border: `1.5px solid ${t.fg}`, padding: '13px 18px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>Talk to the team →</button>
            </div>
          </div>
        </div>
      </section>

      {/* Pull quote + push demo */}
      <section style={{ padding: '64px 36px', borderTop: `1px solid ${t.lineStrong}`, borderBottom: `1px solid ${t.lineStrong}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>The problem worth solving</div>
            <blockquote style={{ margin: 0, fontFamily: t.display, fontSize: 50, fontWeight: 400, color: t.fg, lineHeight: 1.06, letterSpacing: '-0.025em' }}>
              <span style={{ color: t.accent, fontStyle: 'italic' }}>&ldquo;</span>You can see the moment a user starts mattering. You can also see the moment they stop. What you can&rsquo;t do is <em style={{ color: t.accent }}>say anything</em> about it.<span style={{ color: t.accent, fontStyle: 'italic' }}>&rdquo;</span>
            </blockquote>
            <div style={{ marginTop: 24, fontFamily: t.mono, fontSize: 12, color: t.muted, letterSpacing: '0.06em' }}>
              — the retention problem onchain isn&rsquo;t visibility. it&rsquo;s response.
            </div>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, paddingTop: 24, borderTop: `1px solid ${t.line}` }}>
              {[['100%', 'reachable, in-app push'], ['five min', 'connect to first cohort'], ['8 / 8', 'plays ready to fork']].map(([n, s]) => (
                <div key={n}>
                  <div style={{ fontFamily: t.display, fontSize: 42, fontWeight: 500, color: t.fg, letterSpacing: '-0.025em', lineHeight: 1 }}>{n}</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: t.mutedStrong, fontFamily: t.mono, letterSpacing: '0.02em' }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 480, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <PushToastDemo theme={t} />
            </div>
          </div>
        </div>
      </section>

      {/* Four ideas */}
      <section style={{ padding: '88px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <BSectionHeader n="01" label="What's different">
          <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 72, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
            Four ideas that <em style={{ color: t.accent }}>make the product work.</em>
          </h2>
        </BSectionHeader>
        <p style={{ fontFamily: t.display, fontSize: 21, fontWeight: 400, color: t.mutedStrong, lineHeight: 1.4, margin: '0 0 40px', maxWidth: 760 }}>
          Most of what&rsquo;s called &ldquo;Web3 marketing&rdquo; is a Web2 tool with a wallet field bolted on. OnchainSuite is built on four ideas the bolt-ons don&rsquo;t have.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, borderTop: `1px solid ${t.lineStrong}` }}>
          {[
            ['01', 'Wallet-first identity', 'A wallet is the user. Email, FID, X handle, Discord are channels — attached when available, never blocking. Most products in this space treat the wallet as a footnote. We treat it as the primary key.'],
            ['02', 'Multi-channel by default', 'Email is one channel. Your users live on more than one. The same trigger fans out to in-app push, email, Telegram, Farcaster, and X — to whichever channels reach a given wallet.'],
            ['03', 'Plays, not a blank canvas', 'Eight pre-built automations cover the moves every protocol makes. Fork one, edit two fields, ship. Build from scratch if you want. Most teams don&rsquo;t.'],
            ['04', 'Value before setup', 'Five minutes from pasting a contract address, OnchainSuite has indexed 90 days of behaviour and surfaced one specific cohort worth acting on.'],
          ].map(([n, h, s], i) => (
            <div key={n} style={{ padding: '32px 36px 32px 0', paddingLeft: i % 2 ? 36 : 0, borderBottom: `1px solid ${t.line}`, borderLeft: i % 2 ? `1px solid ${t.line}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.12em' }}>{n}</span>
                <span style={{ fontFamily: t.display, fontSize: 28, fontWeight: 500, color: t.fg, letterSpacing: '-0.02em' }}>{h}</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 15.5, color: t.mutedStrong, lineHeight: 1.55, maxWidth: 520 }} dangerouslySetInnerHTML={{ __html: s }}></p>
            </div>
          ))}
        </div>
      </section>

      {/* First mile / Cohort */}
      <section style={{ padding: '88px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <BSectionHeader n="02" label="The first mile">
          <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
            <em style={{ color: t.accent }}>Five minutes</em> from connect to insight.
          </h2>
        </BSectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 56 }}>
          <div>
            <p style={{ fontFamily: t.display, fontSize: 21, fontWeight: 400, color: t.mutedStrong, lineHeight: 1.4, margin: 0 }}>
              Most marketing tools ask you to configure things for an hour before they show you anything useful. We don&rsquo;t think that&rsquo;s an acceptable trade.
            </p>
            <div style={{ marginTop: 28, padding: 22, background: t.surface, borderLeft: `3px solid ${t.accent}`, fontFamily: t.display, fontSize: 18, color: t.fg, lineHeight: 1.45, fontStyle: 'italic' }}>
              &ldquo;142 dormant LPs from the last 30 days. Median lifetime deposit $4.2k. 38 are also active on Aave.&rdquo;
              <div style={{ marginTop: 12, fontStyle: 'normal', fontSize: 13, color: t.muted, fontFamily: t.mono }}>one CTA: reach these wallets with an in-app push when they next connect</div>
            </div>
          </div>
          <CohortWidget theme={t} />
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '88px 36px', background: t.surface, borderTop: `1px solid ${t.lineStrong}`, borderBottom: `1px solid ${t.lineStrong}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <BSectionHeader n="03" label="How it works">
            <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
              Connect. Observe. <em style={{ color: t.accent }}>Respond.</em>
            </h2>
          </BSectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 56 }}>
            <p style={{ fontFamily: t.display, fontSize: 21, color: t.mutedStrong, lineHeight: 1.4, margin: 0 }}>
              Three steps. The first takes thirty seconds. The third runs forever. Channel setup, email lists, and SDK installs happen later — none of them gate value.
            </p>
            <OnboardingTimeline theme={t} />
          </div>
        </div>
      </section>

      {/* Four moments */}
      <section style={{ padding: '88px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <BSectionHeader n="04" label="In practice">
          <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
            Four moments. <em style={{ color: t.accent }}>Four responses.</em>
          </h2>
        </BSectionHeader>
        <div style={{ borderTop: `1px solid ${t.lineStrong}` }}>
          {[
            ['On deposit', 'A wallet makes its first deposit above $1,000.', 'In-app welcome the moment it lands. Educational follow-up after 48 hours. A feedback ask after a week.'],
            ['On silence', 'A wallet that used to act every week goes quiet for 30 days.', 'In-app prompt the next time they connect. If that doesn&rsquo;t fire within seven days, an email — assuming the wallet has one linked.'],
            ['On governance', 'A new proposal moves into quorum range.', 'In-app reminder to every active wallet, 24 hours out. A parallel Telegram post into the protocol&rsquo;s announcement channel.'],
            ['On unbonding', 'An LP&rsquo;s cooldown ends in 24 hours.', 'A single in-app push when they next connect. One reminder, no spam.'],
          ].map(([h, tg, r], i) => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '180px 1.1fr 1.4fr', gap: 24, padding: '26px 0', borderBottom: `1px solid ${t.line}`, alignItems: 'baseline' }}>
              <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 500, color: t.fg, letterSpacing: '-0.02em' }}>{h}</div>
              <div style={{ fontFamily: t.body, fontSize: 15, color: t.mutedStrong, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: tg }}></div>
              <div style={{ fontFamily: t.body, fontSize: 15, color: t.fg, lineHeight: 1.55, paddingLeft: 24, borderLeft: `2px solid ${t.accent}` }} dangerouslySetInnerHTML={{ __html: r }}></div>
            </div>
          ))}
        </div>
      </section>

      {/* Channels */}
      <section style={{ padding: '88px 36px', background: t.surface, borderTop: `1px solid ${t.lineStrong}`, borderBottom: `1px solid ${t.lineStrong}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <BSectionHeader n="05" label="Channels">
            <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
              One trigger.<br /><em style={{ color: t.accent }}>Every reachable channel.</em>
            </h2>
          </BSectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 48, alignItems: 'center' }}>
            <p style={{ fontFamily: t.display, fontSize: 21, color: t.mutedStrong, lineHeight: 1.4, margin: 0 }}>
              In-app push is the default — every connected wallet is reachable. Email, Telegram, Farcaster, and X are <em style={{ color: t.fg }}>additive</em>: when the user consents, the wallet becomes reachable on more places, and your triggers fan out automatically.
            </p>
            <ChannelFanout theme={t} />
          </div>
        </div>
      </section>

      {/* Plays */}
      <section style={{ padding: '88px 36px', maxWidth: 1280, margin: '0 auto' }}>
        <BSectionHeader n="06" label="The Plays Library">
          <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
            Eight automations<br /><em style={{ color: t.accent }}>every protocol should be running.</em>
          </h2>
        </BSectionHeader>
        <p style={{ fontFamily: t.display, fontSize: 21, color: t.mutedStrong, lineHeight: 1.4, margin: '0 0 28px', maxWidth: 820 }}>
          We&rsquo;ve built them. Fork one, edit two fields, ship. Starter Plays work the day you connect; Advanced Plays unlock as your protocol matures.
        </p>
        <PlaysGallery theme={t} columns={4} />
      </section>

      {/* Privacy */}
      <section style={{ padding: '88px 36px', borderTop: `1px solid ${t.lineStrong}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <BSectionHeader n="07" label="Privacy">
            <h2 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 64, lineHeight: 0.98, letterSpacing: '-0.035em', color: t.fg, margin: '6px 0 0' }}>
              Identity bridging <em style={{ color: t.accent }}>without identity exposure.</em>
            </h2>
          </BSectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 56 }}>
            <p style={{ fontFamily: t.display, fontSize: 20, color: t.mutedStrong, lineHeight: 1.45, margin: 0 }}>
              Wallet addresses are public. Email, FID, X handle, Discord are not. Where we link them to a wallet, we do it with zero-knowledge proofs: we verify the link without storing the underlying PII in a form that exposes it.
            </p>
            <div style={{ display: 'grid', gap: 0 }}>
              {[
                ['Wallet data', 'Index public on-chain activity. Normalise it across protocols. Surface segments. Nothing you can&rsquo;t do yourself with a Dune account — except faster, and continuous.'],
                ['Channel handles', 'Bridge email / FID / X handle to wallets via ZK proofs. Store the proof and the consent record. Never expose the underlying PII in a form a third party could re-identify.'],
                ['Compliance', 'GDPR-compliant by architecture. Opt-in by the user. Auditable by us. No ad tracking, no third-party data sharing.'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '20px 0', borderBottom: `1px solid ${t.line}` }}>
                  <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ marginTop: 8, fontFamily: t.body, fontSize: 15, color: t.fg, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: v }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '128px 36px', maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ready when you are</div>
        <h2 style={{ marginTop: 16, fontFamily: t.display, fontWeight: 500, fontSize: 128, lineHeight: 0.94, letterSpacing: '-0.04em', color: t.fg }}>
          Stop watching<br /><em style={{ color: t.accent }}>users leave.</em>
        </h2>
        <p style={{ marginTop: 22, fontFamily: t.display, fontSize: 22, color: t.mutedStrong, lineHeight: 1.4, maxWidth: 720, margin: '22px auto 0' }}>
          OnchainSuite is in early access. We&rsquo;re onboarding a focused group of protocols that want to work directly with us, test the platform, and help shape what gets built next.
        </p>
        <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={{ background: t.fg, color: t.bg, border: 0, padding: '15px 26px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Get Early Access</button>
          <button style={{ background: 'transparent', color: t.fg, border: `1.5px solid ${t.fg}`, padding: '15px 26px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Book a demo →</button>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Platform page
// ─────────────────────────────────────────────────────────────
function BPlatform() {
  const t = B_T;
  const sections = [
    ['Home', 'Command centre. Today&rsquo;s churn signals, the last 24 hours of campaign activity, quick actions, the aha-moment surfaced from your most recent indexing run.', 'always-on overview'],
    ['Campaigns', 'One-off sends. Email builder, multi-channel composer, A/B testing, send-time analytics. Use this for the things that don&rsquo;t repeat.', 'one-off · 4 sub-pages'],
    ['Automations', 'Triggered flows. Plays gallery first, blank-canvas builder behind a button. Onchain triggers, multi-step sequences, multi-channel routing.', 'plays + builder'],
    ['Audience', 'Unified contact profiles built around the wallet, with email / FID / X / Discord as channel handles. Segment builder. CSV import / export.', 'wallet-keyed CRM'],
    ['Analytics', 'Performance, churn risk, engagement scoring, revenue attribution, peer benchmarks. A SQL interface for teams that want the raw data.', 'including SQL access'],
    ['Integrations', 'Wallet providers, OAuth for X and Discord, Telegram bot, Farcaster via Neynar, the in-app SDK install, webhooks, API keys.', 'channels + dev plumbing'],
    ['Settings', 'Account, billing, team, security, privacy controls including peer-benchmark opt-out.', 'admin'],
  ];
  return (
    <div>
      <section style={{ padding: '64px 36px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>The platform</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontWeight: 500, fontSize: 132, lineHeight: 0.92, letterSpacing: '-0.04em', color: t.fg, maxWidth: 1100 }}>
          Seven sections.<br /><em style={{ color: t.accent }}>One product.</em>
        </h1>
        <p style={{ marginTop: 22, fontFamily: t.display, fontSize: 24, color: t.mutedStrong, lineHeight: 1.4, maxWidth: 820 }}>
          The platform consolidates what used to be a patchwork of tools into seven task-centred sections. The in-app navigation and this website use the same vocabulary.
        </p>
      </section>

      <section style={{ padding: '40px 36px 88px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ borderTop: `2px solid ${t.fg}` }}>
          {sections.map((s, i) => (
            <div key={s[0]} style={{ display: 'grid', gridTemplateColumns: '60px 220px 1fr 200px', gap: 24, padding: '28px 0', borderBottom: `1px solid ${t.line}`, alignItems: 'baseline' }}>
              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.14em' }}>§ {String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontFamily: t.display, fontSize: 30, fontWeight: 500, color: t.fg, letterSpacing: '-0.02em' }}>{s[0]}</div>
              <div style={{ fontSize: 15, color: t.mutedStrong, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: s[1] }}></div>
              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.08em', textAlign: 'right' }}>{s[2]}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '72px 36px', borderTop: `1px solid ${t.lineStrong}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <BSectionHeader n="08" label="Channel reachability">
            <h2 style={{ fontFamily: t.display, fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.02, margin: '6px 0 0' }}>Reach <em style={{ color: t.accent }}>by channel</em>, per wallet.</h2>
          </BSectionHeader>
          <div style={{ borderTop: `1px solid ${t.lineStrong}` }}>
            {[['Channel','Identifier needed','Source','Reachability'],
              ['In-app push','wallet address only','dApp connected session','100% of connected wallets'],
              ['Email','verified email','synthesis · CSV · OAuth','≥60% within 30 days (target)'],
              ['Telegram','wallet-linked verify','protocol-owned bot','protocol-controlled'],
              ['Farcaster','FID','wallet → FID via Neynar','growing subset'],
              ['X','X handle','OAuth','opt-in subset']].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1.4fr', padding: '16px 0', borderBottom: `1px solid ${t.line}`, fontFamily: i ? t.body : t.mono, fontSize: i ? 15 : 11, color: i ? t.fg : t.muted, letterSpacing: i ? 'normal' : '0.12em', textTransform: i ? 'none' : 'uppercase' }}>
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
// How It Works — three layers
// ─────────────────────────────────────────────────────────────
function BHowItWorks() {
  const t = B_T;
  const layers = [
    { n: '01', tag: 'Identity', code: '3ridge', title: 'Your users have wallets. We link them to <em>everything else</em>.', body: 'Every user is a wallet. Around that wallet, we attach the channels they&rsquo;re reachable on — email, Farcaster ID, X handle, Discord — as they&rsquo;re verified. The link is created with zero-knowledge cryptography: the proof exists, the raw PII is never exposed in a way that could be reconstructed.' },
    { n: '02', tag: 'Intelligence', code: 'Onch3n', title: 'We watch the blockchain so <em>you don&rsquo;t have to</em>.', body: 'Our Protocol Normalisation Engine ingests activity across Ethereum, Solana, Base, Polygon, and more. It translates the underlying complexity — a swap on Uniswap, a swap on Jupiter, a swap on Aerodrome — into one marketer-shaped event: &ldquo;swap.&rdquo; Within five minutes, the cohort most worth your attention is surfaced — with a number, a reason, and a recommended next move.' },
    { n: '03', tag: 'Action', code: 'R3tain', title: 'The right response, on the right channel, <em>the moment it matters</em>.', body: 'Triggers fire across whichever channels reach the wallet — in-app push by default, email when available, Telegram and Farcaster where the user has chosen to be reachable. The same trigger, the same segment, fans out to wherever the wallet is. Analytics come back per channel: opened, dismissed, clicked, replied.' },
  ];
  return (
    <div>
      <section style={{ padding: '64px 36px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>How it works</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontWeight: 500, fontSize: 132, lineHeight: 0.92, letterSpacing: '-0.04em', color: t.fg }}>
          Three layers,<br /><em style={{ color: t.accent }}>doing one job.</em>
        </h1>
        <p style={{ marginTop: 22, fontFamily: t.display, fontSize: 22, color: t.mutedStrong, lineHeight: 1.4, maxWidth: 820 }}>
          When a marketer creates an automation, they pick a trigger and write a message. Under the surface, three integrated systems are doing the work. You don&rsquo;t need to know the names. They&rsquo;re here for the people who do.
        </p>
      </section>

      {layers.map((l, i) => (
        <section key={l.n} style={{ padding: '64px 36px', borderTop: `1px solid ${t.lineStrong}`, background: i % 2 === 0 ? t.bg : t.surface }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.fg, letterSpacing: '0.08em' }}>§ {l.n}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Layer · {l.tag}</span>
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.accent, padding: '3px 8px', border: `1px solid ${t.accent}`, borderRadius: 999, letterSpacing: '0.06em' }}>internal · {l.code}</span>
              </div>
              <h2 style={{ marginTop: 10, fontFamily: t.display, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.05 }} dangerouslySetInnerHTML={{ __html: l.title }}></h2>
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: t.display, fontSize: 19, color: t.mutedStrong, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: l.body }}></p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plays page
// ─────────────────────────────────────────────────────────────
function BPlays() {
  const t = B_T;
  const [tier, setTier] = React.useState('All');
  const tiers = ['All', 'Starter', 'Advanced'];
  return (
    <div>
      <section style={{ padding: '64px 36px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>The Plays Library · v.2.0</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontWeight: 500, fontSize: 124, lineHeight: 0.92, letterSpacing: '-0.04em', color: t.fg }}>
          Eight automations<br /><em style={{ color: t.accent }}>every protocol should be running.</em>
        </h1>
        <p style={{ marginTop: 22, fontFamily: t.display, fontSize: 22, color: t.mutedStrong, lineHeight: 1.4, maxWidth: 820 }}>
          We&rsquo;ve built them. Fork one, edit two fields, ship. Each Play comes with a trigger, a default segment, copy templates, recommended timing, and peer benchmarks from the protocols already using it.
        </p>
      </section>

      <section style={{ padding: '32px 36px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 16, marginBottom: 22, paddingBottom: 14, borderBottom: `1px solid ${t.lineStrong}` }}>
          <div style={{ display: 'flex', gap: 24, fontFamily: t.body, fontSize: 14 }}>
            {tiers.map(c => (
              <button key={c} onClick={() => setTier(c)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: tier === c ? t.fg : t.muted, fontWeight: tier === c ? 600 : 500, paddingBottom: 6, borderBottom: tier === c ? `2px solid ${t.accent}` : '2px solid transparent', fontFamily: t.body, fontSize: 14 }}>{c}</button>
            ))}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.08em' }}>
            STARTER works day one · ADVANCED needs governance, TVL or quests in place
          </div>
        </div>
        <PlaysGallery theme={t} columns={3} tier={tier === 'All' ? null : tier} />
      </section>

      <section style={{ padding: '72px 36px', borderTop: `1px solid ${t.lineStrong}`, background: t.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 48, alignItems: 'flex-start' }}>
          <div>
            <BSectionHeader n="06" label="Play Anatomy">
              <h2 style={{ fontFamily: t.display, fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', color: t.fg, lineHeight: 1.02, margin: '6px 0 0' }}>Every Play is a <em style={{ color: t.accent }}>versioned spec.</em></h2>
            </BSectionHeader>
            <p style={{ fontFamily: t.display, fontSize: 20, color: t.mutedStrong, lineHeight: 1.45, margin: 0, maxWidth: 480 }}>
              Plays live in code, not in DB. A typed object — trigger, segment, channels, copy template, recommended timing, peer benchmark. Fork it and your edits diverge from version 1.
            </p>
          </div>
          <pre style={{ background: t.fg, color: t.bg, borderRadius: 14, padding: 24, margin: 0, fontFamily: t.mono, fontSize: 12.5, lineHeight: 1.7 }}>
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
  - send.inAppPush: { template: welcome }
  - delay: 48h
  - send.email: { template: educate, optional: true }
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
// Pricing — Early Access framing
// ─────────────────────────────────────────────────────────────
function BPricing() {
  const t = B_T;
  return (
    <div>
      <section style={{ padding: '64px 36px 40px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Early Access · Pricing</div>
        <h1 style={{ marginTop: 14, fontFamily: t.display, fontWeight: 500, fontSize: 124, lineHeight: 0.92, letterSpacing: '-0.04em', color: t.fg }}>
          Built with a small group<br /><em style={{ color: t.accent }}>of protocols. On purpose.</em>
        </h1>
        <p style={{ marginTop: 22, fontFamily: t.display, fontSize: 22, color: t.mutedStrong, lineHeight: 1.4, maxWidth: 820 }}>
          OnchainSuite is in early access. We&rsquo;re onboarding a focused group of teams that want to work directly with us, test the platform, and help shape what gets built next.
        </p>
      </section>

      <section style={{ padding: '24px 36px 96px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 0, border: `1px solid ${t.lineStrong}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ background: t.fg, color: t.bg, padding: 40, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 24, right: 24, background: t.accent, color: t.bg, padding: '4px 10px', borderRadius: 999, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.08em' }}>OPEN NOW</span>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(243,239,230,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>What you get</div>
            <div style={{ marginTop: 14, fontFamily: t.display, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>The five things.</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '28px 0 0', display: 'grid', gap: 16 }}>
              {[
                ['Direct line to product.', 'Your feedback lands in the roadmap, not a feature-request portal.'],
                ['Priority onboarding.', 'White-glove integration support from our engineering team.'],
                ['Locked-in launch pricing.', 'Whatever you start at, you stay at — through public release.'],
                ['Beta channels and Plays.', 'See new channels and Plays before they&rsquo;re generally available.'],
                ['Reference customer status.', 'If you want it: first to market on behaviour-triggered retention for Web3.'],
              ].map(([h, s]) => (
                <li key={h} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, fontSize: 14.5, color: 'rgba(243,239,230,0.92)', lineHeight: 1.55 }}>
                  <span style={{ color: t.accent, fontWeight: 600 }}>→</span>
                  <span>
                    <span style={{ color: t.bg, fontWeight: 600 }}>{h}</span>
                    <span style={{ color: 'rgba(243,239,230,0.7)' }} dangerouslySetInnerHTML={{ __html: ` ${s}` }}></span>
                  </span>
                </li>
              ))}
            </ul>
            <button style={{ marginTop: 32, background: t.accent, color: t.bg, border: 0, padding: '14px 22px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 14.5, cursor: 'pointer' }}>Request Early Access →</button>
          </div>

          <div style={{ background: t.bg, padding: 40 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>What we ask in return</div>
            <div style={{ marginTop: 14, fontFamily: t.display, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, color: t.fg }}>Honesty, <em style={{ color: t.accent }}>mostly.</em></div>
            <p style={{ marginTop: 18, fontFamily: t.display, fontSize: 18, color: t.mutedStrong, lineHeight: 1.5 }}>
              We need to see how the product holds up against real protocols, real volumes, and real edge cases. In exchange, the product gets shaped around your problems before anyone else&rsquo;s.
            </p>
            <div style={{ marginTop: 24, padding: 20, border: `1px dashed ${t.lineStrong}`, borderRadius: 10, fontFamily: t.mono, fontSize: 12.5, color: t.fg, lineHeight: 1.85 }}>
              <div style={{ color: t.muted }}>{`// the form, briefly`}</div>
              <div>name <span style={{ color: t.muted }}>—</span> who&rsquo;s the contact</div>
              <div>protocol <span style={{ color: t.muted }}>—</span> name + chains</div>
              <div>scale <span style={{ color: t.muted }}>—</span> wallets you serve today</div>
              <div>challenge <span style={{ color: t.muted }}>—</span> biggest retention gap</div>
              <div style={{ marginTop: 8, color: t.muted }}>{`// we'll be in touch within two business days`}</div>
            </div>
            <button style={{ marginTop: 24, background: 'transparent', color: t.fg, border: `1.5px solid ${t.fg}`, padding: '14px 22px', borderRadius: 999, fontFamily: t.body, fontWeight: 500, fontSize: 14.5, cursor: 'pointer' }}>Schedule a call →</button>
          </div>
        </div>

        <div style={{ marginTop: 48, padding: '32px 36px', background: t.surface, borderRadius: 18, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>About public pricing</div>
            <div style={{ marginTop: 10, fontFamily: t.display, fontSize: 36, fontWeight: 500, color: t.fg, letterSpacing: '-0.02em' }}>We&rsquo;ll publish it <em style={{ color: t.accent }}>when it&rsquo;s real.</em></div>
            <p style={{ marginTop: 8, color: t.mutedStrong, fontSize: 15, lineHeight: 1.55, maxWidth: 620 }}>
              Public pricing arrives with general release. Early-access teams lock in launch rates ahead of that — across every channel, with no per-seat tax.
            </p>
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 13, color: t.fg, display: 'grid', gap: 8, paddingLeft: 32, borderLeft: `1px solid ${t.lineStrong}` }}>
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
function BDocs() {
  const t = B_T;
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
      <section style={{ padding: '64px 36px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Docs · v.2.0</div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, alignItems: 'flex-end' }}>
          <h1 style={{ fontFamily: t.display, fontWeight: 500, fontSize: 110, lineHeight: 0.92, letterSpacing: '-0.04em', color: t.fg, margin: 0 }}>
            Built for engineers.<br /><em style={{ color: t.accent }}>Read like one.</em>
          </h1>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, lineHeight: 1.8, borderLeft: `2px solid ${t.fg}`, paddingLeft: 18 }}>
            <div>last updated · 2026-05-10</div>
            <div>changelog · <span style={{ color: t.accent }}>v.2.0 · multi-channel</span></div>
            <div>status · all systems operational</div>
          </div>
        </div>
      </section>

      <section style={{ padding: '40px 36px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, border: `1px solid ${t.lineStrong}`, borderRadius: 16, overflow: 'hidden' }}>
          {sections.map((s, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            return (
              <div key={s.tag} style={{
                padding: 26,
                borderLeft: col ? `1px solid ${t.line}` : 'none',
                borderTop: row ? `1px solid ${t.line}` : 'none',
                background: (i % 2 === 0) ? t.bg : t.surface,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: t.display, fontSize: 22, fontWeight: 600, color: t.fg, letterSpacing: '-0.015em' }}>{s.tag}</div>
                  <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>{s.items.length} pages</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 0 }}>
                  {s.items.map(it => (
                    <li key={it} style={{ fontSize: 14, color: t.mutedStrong, padding: '8px 0', borderTop: `1px dashed ${t.line}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{it}</span>
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>↗</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ padding: '32px 36px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>Install</div>
        <pre style={{ background: t.fg, color: t.bg, borderRadius: 14, padding: 32, margin: 0, fontFamily: t.mono, fontSize: 14.5, lineHeight: 1.75, overflow: 'hidden' }}>
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
function DirectionB() {
  const t = B_T;
  const [page, setPage] = React.useState('landing');
  const Page = {
    landing: BLanding,
    platform: BPlatform,
    howitworks: BHowItWorks,
    plays: BPlays,
    pricing: BPricing,
    docs: BDocs,
  }[page];
  return (
    <div style={{ background: t.bg, color: t.fg, fontFamily: t.body, minHeight: '100%', width: '100%' }}>
      <BNav page={page} setPage={setPage} />
      <Page />
      <BFooter />
    </div>
  );
}

window.DirectionB = DirectionB;
