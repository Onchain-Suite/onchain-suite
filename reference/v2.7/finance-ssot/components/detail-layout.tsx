'use client';
// Two columns on a wide screen with a draggable divider (shadcn Resizable); stacked on phones. The main
// column sets the height: the aside is an absolutely positioned column inside its panel, so it takes the
// main column's height instead of adding its own, and its last card grows to the bottom and scrolls inside
// when the list is longer. Both columns therefore end on the same line.
import { useIsMobile } from '@/hooks/use-mobile';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export function DetailLayout({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
  const isMobile = useIsMobile();
  if (isMobile) return <div className="flex flex-col gap-4 px-4">{main}{aside}</div>;
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[640px] px-4 lg:px-6">
      {/* The main column's last card grows to the layout's floor, so a short page still ends on one line with the aside. */}
      <ResizablePanel defaultSize="64%" minSize="40%"><div className="flex h-full flex-col gap-4 pr-4 [&>*:last-child]:flex-1">{main}</div></ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="36%" minSize="24%">
        <div className="relative h-full">
          <div data-slot="aside" className="absolute inset-0 flex flex-col gap-4 overflow-y-auto pl-4 [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1 [&>*:last-child]:overflow-hidden [&>*:last-child>[data-slot=card-content]]:min-h-0 [&>*:last-child>[data-slot=card-content]]:overflow-y-auto">{aside}</div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
