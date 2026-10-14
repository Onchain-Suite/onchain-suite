# Dashboard UI kit

High-fidelity recreation of the Onchain Suite app, rebuilt against **real product screenshots** (uploads/Screenshot 2026-07-13…): floating sidebar card (Dashboard · Campaigns · Audience · Settings, orange user avatar), transparent top bar with workspace switcher, ⌘K search, notifications, and the light/dark theme toggle.

Screens:
- **Dashboard** (`HomeScreen`) — greeting hero, assistant prompt bar, "Get started" task carousel. Matches screenshot.
- **Campaigns** (`CampaignsScreen`) — header with View library / List / Calendar / Create campaign, 5-card KPI strip, search + filter dropdowns, empty state. Matches screenshot.
- **Audience** (`AudienceScreen`) — spec-based (no screenshot provided): filter chips + wallet grid + drawer.

Note: the real product uses larger corner radii than the token scale (sidebar items ~24px, cards 12–16px, buttons ~10px) — the kit copies the screenshots verbatim per recreation rules; those values are scoped to this kit, not tokens.

`index.html` is interactive: sidebar navigates, theme toggles and persists, and a floating **Empty / Full** switch flips the workspace between its first-run empty state (matching the uploaded screenshots) and a data-filled state. Empty = no data yet (onboarding tasks, zeroed KPIs, empty-campaign prompt); Full = live workspace (real KPI row + event feed + campaign funnel on the dashboard, populated campaign table). All primitives (KPICard, EventCard, CampaignFunnel, Badge, Button) come from `components/` — the shell chrome is kit-local. Radii, type scale, spacing, and the orange focus/accent rules follow the system tokens.
