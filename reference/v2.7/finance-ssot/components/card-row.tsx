// Cards side by side that end on the same line. The first card sets the row's height; every other card
// fills its cell and scrolls inside when its content is longer (a list beside a chart). On phones the
// cards stack, each at its own height. Use it wherever two or three cards share a row and one of them
// is a list or a table; a bare grid stretches the short card to the tall one instead.
import * as React from 'react';
import { cn } from '@/lib/utils';

const FILL = '@3xl/main:absolute @3xl/main:inset-0 flex flex-col [&>*]:min-h-0 [&>*]:flex-1 [&>*]:overflow-hidden [&>*>[data-slot=card-content]]:min-h-0 [&>*>[data-slot=card-content]]:overflow-y-auto';

export function CardRow({ children, columns = 2, className }: { children: React.ReactNode; columns?: 2 | 3; className?: string }) {
  const [lead, ...rest] = React.Children.toArray(children).filter(Boolean);
  return (
    <div data-slot="card-row" className={cn('grid grid-cols-1 gap-4', columns === 3 ? '@4xl/main:grid-cols-3' : '@3xl/main:grid-cols-2', className)}>
      {lead}
      {rest.map((card, i) => (
        <div key={i} className="relative">
          <div className={FILL}>{card}</div>
        </div>
      ))}
    </div>
  );
}
