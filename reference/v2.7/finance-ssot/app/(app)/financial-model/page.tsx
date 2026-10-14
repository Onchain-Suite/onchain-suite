import { FinancialModelContent } from '@/components/pages/financial-model';
import { SsotControls } from '@/components/ssot-controls';

export default function Page() {
  return <FinancialModelContent controls={<SsotControls />} />;
}
