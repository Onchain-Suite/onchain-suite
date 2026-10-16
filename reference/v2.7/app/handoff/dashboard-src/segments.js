// Shared segment source of truth — read by Intelligence (saved segments),
// the Campaign wizard (selector), and anywhere else that references audiences.
// email/wallet = reachable count on each channel; count = total wallets.
export const SEGMENTS = [
  { id: 'whales', name: 'Base whales', desc: 'Balance > 10 ETH · active 7d', count: 1204, email: 1040, wallet: 1204, synced: '2 min ago' },
  { id: 'new2', name: 'New Season 2 buyers', desc: 'Bought a pack in the last 7 days', count: 512, email: 460, wallet: 512, synced: '18 min ago' },
  { id: 'active', name: 'Active traders 30d', desc: 'Any swap or trade in the last 30 days', count: 2860, email: 2140, wallet: 2860, synced: '1h ago' },
  { id: 'dormant', name: 'Dormant, was active', desc: 'No activity 30d · LTV > 5 ETH', count: 978, email: 612, wallet: 1120, synced: '1h ago' },
];
