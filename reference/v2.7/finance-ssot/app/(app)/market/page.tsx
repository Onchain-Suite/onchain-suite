import { MarketContent } from '@/components/pages/market';
import { SsotControls } from '@/components/ssot-controls';

export default function Page() {
  return <MarketContent controls={<SsotControls />} />;
}
