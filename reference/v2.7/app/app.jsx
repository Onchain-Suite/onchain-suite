/* OnchainSuite — Product app
 *
 * Renders the authoritative dashboard from the Onchain Suite design-system bundle
 * (window.OnchainSuiteDesignSystem_070d6e.DashboardApp) — the resolved hi-fi handoff:
 * an 8-section app shell (Dashboard · Campaigns · Audience · Forms · Automations ·
 * Intelligence · Analytics · Settings) plus the first-run onboarding gate, with the
 * Empty/Full state toggle and every cross-screen loop wired.
 *
 * Source of truth: ../design_handoff_dashboard (README.md / PROJECT_README.md).
 * A copy of the handoff screen sources + component contracts lives in ./handoff for reference.
 * My earlier hand-built approximation is preserved in ./app-custom-v1.jsx.bak.
 */

const { DashboardApp } = window.OnchainSuiteDesignSystem_070d6e;

const boot = document.getElementById('boot');
if (boot) boot.classList.add('hide');

ReactDOM.createRoot(document.getElementById('root')).render(
  <DashboardApp logoSrc="assets/logos/icon-coloured-light.svg" />
);
