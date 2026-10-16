import { CatalogueContent } from '@/components/pages/catalogue';
import { SsotControls } from '@/components/ssot-controls';

export default function Page() {
  return <CatalogueContent controls={<SsotControls />} />;
}
