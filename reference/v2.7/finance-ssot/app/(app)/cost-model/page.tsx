import { CostModelContent } from '@/components/pages/cost-model';
import { SsotControls } from '@/components/ssot-controls';

export default function Page() {
  return <CostModelContent controls={<SsotControls />} />;
}
