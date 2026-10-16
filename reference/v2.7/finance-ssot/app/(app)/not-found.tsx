import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <PageHeader eyebrow="Not found" question="There is nothing at this address." answer="The link may be out of date, or the thing it pointed at may have been removed." />
      <div className="px-4 lg:px-6"><Button variant="outline" nativeButton={false} render={<Link href="/" />}>Back to the start</Button></div>
    </>
  );
}
