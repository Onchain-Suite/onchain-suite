import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';

const css = `
.osa{display:grid;grid-template-columns:1.05fr 1fr;min-height:100vh;font-family:var(--font-sans);background:var(--bg-page);}
@media (max-width:900px){.osa{grid-template-columns:1fr;}.osa__brand{display:none;}}

/* ---- Left brand panel: layered gradient + faint grid + glow (auth/marketing treatment) ---- */
.osa__brand{position:relative;overflow:hidden;padding:48px 56px;display:flex;flex-direction:column;
  background:linear-gradient(150deg,#2F3BEE 0%,#1727E0 42%,#0A1160 100%);color:#fff;}
.osa__grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(120% 90% at 30% 20%,#000 40%,transparent 100%);}
.osa__glow{position:absolute;width:520px;height:520px;border-radius:var(--radius-round);right:-160px;bottom:-200px;
  background:radial-gradient(circle,rgba(47,148,255,.55),transparent 60%);filter:blur(30px);}
.osa__brandinner{position:relative;display:flex;flex-direction:column;flex:1;}
.osa__logo{height:34px;align-self:flex-start;}
.osa__brandmid{margin-top:auto;display:flex;flex-direction:column;gap:24px;}
.osa__brand h1{margin:0;font-size:56px;line-height:1.04;font-weight:700;letter-spacing:-1.5px;max-width:560px;}
.osa__brand p{margin:0;font-size:19px;line-height:1.5;color:rgba(255,255,255,.72);max-width:460px;}
.osa__checks{display:flex;flex-direction:column;gap:14px;margin-top:8px;}
.osa__check{display:flex;align-items:center;gap:12px;font-size:16px;color:rgba(255,255,255,.92);}
.osa__check span{width:24px;height:24px;border-radius:var(--radius-round);background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osa__trust{position:relative;margin-top:auto;padding-top:40px;display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,.6);}
.osa__dots{display:flex;}
.osa__dots i{width:26px;height:26px;border-radius:var(--radius-round);border:2px solid #1727E0;background:rgba(255,255,255,.85);margin-left:-8px;}
.osa__dots i:first-child{margin-left:0;}

/* ---- Right form panel ---- */
.osa__formwrap{display:flex;align-items:center;justify-content:center;padding:48px;box-sizing:border-box;}
.osa__card{width:100%;max-width:420px;background:var(--bg-surface);border:1px solid var(--border-subtle);
  border-radius:var(--radius-xl);box-shadow:var(--elevation-3);padding:40px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px;}
.osa__badge{align-self:flex-start;background:var(--bg-brand-subtle);color:var(--action-primary);font-size:var(--text-label-s-size);
  font-weight:600;letter-spacing:0.6px;text-transform:uppercase;padding:5px 12px;border-radius:var(--radius-sm);}
.osa__head h2{margin:0 0 6px;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:-0.5px;color:var(--text-primary);}
.osa__head p{margin:0;font-size:var(--text-body-m-size);color:var(--text-secondary);}
.osa__google{display:flex;align-items:center;justify-content:center;gap:10px;height:48px;border-radius:var(--radius-md);
  border:1px solid var(--border-default);background:var(--bg-surface);font-family:inherit;font-size:var(--text-body-m-size);font-weight:500;
  color:var(--text-primary);cursor:pointer;transition:background var(--duration-fast) var(--ease-standard);}
.osa__google:hover{background:var(--surface-hover);}
.osa__divider{display:flex;align-items:center;gap:12px;color:var(--text-tertiary);font-size:var(--text-body-s-size);}
.osa__divider::before,.osa__divider::after{content:'';flex:1;height:1px;background:var(--border-subtle);}
.osa__field{display:flex;flex-direction:column;gap:6px;}
.osa__label{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);}
.osa__label i{color:var(--orange-600);font-style:normal;}
.osa__control{display:flex;align-items:center;gap:10px;height:48px;border:1px solid var(--border-default);border-radius:var(--radius-md);
  padding:0 14px;background:var(--bg-surface);transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osa__control:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osa__control input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-m-size);color:var(--text-primary);min-width:0;}
.osa__control input::placeholder{color:var(--text-tertiary);}
.osa__control .eye{border:none;background:none;padding:2px;color:var(--text-tertiary);cursor:pointer;display:flex;}
.osa__control .eye:hover{color:var(--text-secondary);}
.osa__forgot{align-self:flex-end;font-size:var(--text-body-s-size);font-weight:500;color:var(--text-link);text-decoration:none;}
.osa__forgot:hover{color:var(--text-link-hover);text-decoration:underline;}
.osa__foot{text-align:center;font-size:var(--text-body-s-size);color:var(--text-secondary);}
.osa__foot a{color:var(--text-link);font-weight:600;text-decoration:none;cursor:pointer;}
.osa__foot a:hover{color:var(--text-link-hover);text-decoration:underline;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osa-css')) {
  const s = document.createElement('style'); s.id = 'osa-css'; s.textContent = css; document.head.appendChild(s);
}

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.98 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
);

/** Split-screen auth: layered gradient brand panel + elevated form card. Sign-in / sign-up toggle. */
export function AuthScreen({ mode: initialMode = 'signin', logoSrc = '../../assets/logos/full-horizontal-light.svg' }) {
  const [mode, setMode] = React.useState(initialMode);
  const [show, setShow] = React.useState(false);
  const signup = mode === 'signup';
  return (
    <div className="osa">
      <div className="osa__brand">
        <div className="osa__grid"></div>
        <div className="osa__glow"></div>
        <div className="osa__brandinner">
          <img className="osa__logo" src={logoSrc} alt="Onchain Suite" />
          <div className="osa__brandmid">
            <h1>Onchain growth, on autopilot.</h1>
            <p>The marketing platform built for protocols — turn on-chain activity into audiences, campaigns, and automations.</p>
            <div className="osa__checks">
              {['Turn any wallet into an audience you can actually reach',
                'Launch on-chain-triggered campaigns and automations',
                'Privacy-safe by default — identities stay ZK-verified, never exposed',
                'Track conversions across every journey'].map((t) => (
                <div className="osa__check" key={t}><span><Icon name="check" size={14} strokeWidth={3} /></span>{t}</div>
              ))}
            </div>
          </div>
          <div className="osa__trust">
            <span className="osa__dots"><i></i><i></i><i></i></span>
            Trusted by teams building world-class protocols
          </div>
        </div>
      </div>

      <div className="osa__formwrap">
        <div className="osa__card">
          <span className="osa__badge">Onchain Suite</span>
          <div className="osa__head">
            <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
            <p>{signup ? 'Start turning on-chain activity into growth.' : 'Sign in to your Onchain Suite account.'}</p>
          </div>
          <button type="button" className="osa__google"><GoogleG /> Continue with Google</button>
          <div className="osa__divider">or continue with email</div>
          {signup ? (
            <div className="osa__field">
              <label className="osa__label" htmlFor="osa-name">Full name</label>
              <div className="osa__control"><Icon name="user" size={18} color="var(--text-tertiary)" /><input id="osa-name" placeholder="Ada Chen" /></div>
            </div>
          ) : null}
          <div className="osa__field">
            <label className="osa__label" htmlFor="osa-email">Email address <i>*</i></label>
            <div className="osa__control"><Icon name="mail" size={18} color="var(--text-tertiary)" /><input id="osa-email" type="email" placeholder="you@protocol.xyz" /></div>
          </div>
          <div className="osa__field">
            <label className="osa__label" htmlFor="osa-pw">Password</label>
            <div className="osa__control">
              <Icon name="lock" size={18} color="var(--text-tertiary)" />
              <input id="osa-pw" type={show ? 'text' : 'password'} placeholder={signup ? 'Create a password' : 'Enter your password'} />
              <button type="button" className="eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}><Icon name={show ? 'eye-off' : 'eye'} size={18} /></button>
            </div>
          </div>
          {!signup ? <a className="osa__forgot" href="#">Forgot password?</a> : null}
          <Button size="l" trailingIcon="arrow-right" style={{ width: '100%', height: 48 }}>{signup ? 'Create account' : 'Sign in'}</Button>
          <div className="osa__foot">
            {signup
              ? <span>Already have an account? <a onClick={() => setMode('signin')}>Sign in</a></span>
              : <span>Don't have an account? <a onClick={() => setMode('signup')}>Sign up</a></span>}
          </div>
        </div>
      </div>
    </div>
  );
}
