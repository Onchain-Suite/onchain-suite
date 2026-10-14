import React from 'react';
import { KPICard } from '../../components/data/KPICard.jsx';
import { Card } from '../../components/data/Card.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { EventCard } from '../../components/product/EventCard.jsx';
import { NotificationPipeline } from '../../components/product/NotificationPipeline.jsx';
import { CampaignFunnel } from '../../components/product/CampaignFunnel.jsx';

/** Dashboard Overview screen: title row → KPI row → pipeline → feed + funnel. */
export function OverviewScreen() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ flex: 1, margin: 0, fontSize: 'var(--text-heading-xl-size)', lineHeight: 'var(--text-heading-xl-line)', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Overview</h1>
        <Badge status="info" live>Live</Badge>
        <Button variant="secondary" size="s" icon="calendar">Last 30 days</Button>
        <Button icon="megaphone">Create campaign</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <KPICard label="ACTIVE WALLETS" value="128,540" delta={12.4} period="vs last 30d" spark={[4, 5, 4, 6, 7, 8, 7, 9, 11]} />
        <KPICard label="MESSAGES DELIVERED" value="1.2M" delta={4.1} period="vs last 30d" spark={[8, 7, 9, 8, 10, 9, 11, 12, 12]} />
        <KPICard label="ENGAGEMENT RATE" value="26.3" unit="%" delta={-1.8} period="vs last 30d" spark={[9, 8, 8, 7, 8, 7, 7, 6, 7]} />
        <KPICard label="CONVERTED ON-CHAIN" value="3,921" delta={22.7} period="vs last 30d" spark={[2, 3, 2, 4, 5, 4, 6, 7, 9]} />
      </div>
      <Card title="Delivery pipeline" actions={<Badge status="warning">Throttled</Badge>}>
        <NotificationPipeline stages={[
          { label: 'Queued', count: '2,410' },
          { label: 'Throttled', count: '318', bottleneck: true },
          { label: 'Sent', count: '48,920' },
          { label: 'Delivered', count: '47,061' },
          { label: 'Failed', count: '182' },
        ]} />
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
        <Card title="Event feed" actions={<Button variant="tertiary" size="s" icon="pause">Pause stream</Button>} compact>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <EventCard type="Swap" status="success" chain="Base" timestamp="14:36 UTC"
              sentence={<span><span className="os-mono">0x1A2b…9F3e</span> swapped 4.2 ETH → USDC on Uniswap</span>}
              payload={{ event: 'Swap', amountIn: '4.2 ETH', amountOut: '14,830 USDC' }} />
            <EventCard type="Unstake" status="warning" chain="Ethereum" timestamp="14:12 UTC"
              sentence={<span><span className="os-mono">0x8Cc4…21aB</span> unstaked 12 ETH from Lido</span>}
              payload={{ event: 'Unstake', amount: '12 ETH' }} />
            <EventCard type="Mint" status="info" chain="Base" timestamp="13:58 UTC"
              sentence={<span><span className="os-mono">0xF31d…77c0</span> minted 3 items from Zora drop</span>}
              payload={{ event: 'Mint', quantity: 3 }} />
          </div>
        </Card>
        <CampaignFunnel title="Re-engage whales" status="success" statusLabel="Active" stages={[
          { label: 'Sent', value: 48920 },
          { label: 'Delivered', value: 47061 },
          { label: 'Engaged', value: 12480 },
          { label: 'Converted on-chain', value: 3921 },
        ]} />
      </div>
    </div>
  );
}
