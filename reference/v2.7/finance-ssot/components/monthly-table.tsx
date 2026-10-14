'use client';
// A month-by-month schedule. Every month is a row, so a reader can follow one number from the
// driver that produces it through to the statement it lands in. Scrolls rather than paginates,
// because a schedule you have to page through is not a schedule you can check.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type MonthCol<T> = {
  key: string;
  label: string;
  get: (r: T, i: number) => React.ReactNode;
  emphasis?: boolean;
  /** A column that is the result of the ones before it, ruled off so the arithmetic reads. */
  total?: boolean;
};

export function MonthlyTable<T>({
  title, description, rows, columns, footnote, height = 'max-h-[520px]',
}: {
  title: string;
  description: string;
  rows: T[];
  columns: MonthCol<T>[];
  footnote?: React.ReactNode;
  height?: string;
}) {
  return (
    // data-print-wide: these run to fifteen columns and cannot fit A4 portrait, so they
    // take a landscape sheet of their own rather than losing the right-hand months.
    <Card data-print-wide className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className={cn('overflow-auto', height)}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn('whitespace-nowrap bg-card', c.key !== 'm' && 'text-right', c.total && 'border-l border-border')}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        'whitespace-nowrap',
                        c.key !== 'm' && 'text-right tabular-nums',
                        c.key === 'm' && 'font-medium text-foreground',
                        c.total && 'border-l border-border font-medium',
                      )}
                    >
                      {c.get(r, i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {footnote ? <p className="px-6 pt-3 text-xs leading-relaxed text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}
