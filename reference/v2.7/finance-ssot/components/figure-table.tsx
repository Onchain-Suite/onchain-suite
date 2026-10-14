// A table of figures inside a card. The financial statements are fixed shapes read top to bottom,
// not data to sort or filter, so they use shadcn's Table directly rather than the kit's DataTable.
//
// Every card carries a description, because a card that does not say what it holds makes the reader
// guess. Numbers are tabular and right-aligned so a column of them can be compared down the page.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Col = { key: string; label: string; align?: 'left' | 'right'; width?: string };
export type Row = { cells: React.ReactNode[]; emphasis?: boolean; tone?: 'good' | 'bad' };

export function FigureTable({
  title, description, columns, rows, footnote, className,
}: {
  title: string;
  description: string;
  columns: Col[];
  rows: Row[];
  footnote?: React.ReactNode;
  className?: string;
}) {
  return (
    // Five columns or more will not fit A4 portrait once every money cell carries both
    // currencies, so the table takes a landscape sheet rather than losing its right-hand
    // columns off the edge of the paper.
    <Card data-print-wide={columns.length >= 5 ? '' : undefined} className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={cn('whitespace-nowrap', c.align === 'right' && 'text-right', c.width)}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground">
                    Nothing to show. That is the expected result here, not a missing figure.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={i} className={cn(r.emphasis && 'bg-muted/40 font-medium')}>
                    {r.cells.map((cell, j) => (
                      <TableCell
                        key={j}
                        className={cn(
                          'whitespace-nowrap',
                          columns[j]?.align === 'right' && 'text-right tabular-nums',
                          j === 0 && 'font-medium text-foreground',
                          r.tone === 'good' && j > 0 && 'text-(--green)',
                          r.tone === 'bad' && j > 0 && 'text-(--red)',
                        )}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {footnote ? <p className="px-6 pt-3 text-xs leading-relaxed text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}

/** A page's sections sit in the page column; the layout owns the gap between them. */
export function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-4 lg:px-6">{children}</div>;
}
