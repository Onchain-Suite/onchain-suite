'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// The kit's table: shadcn's data-table recipe (TanStack Table v9 with sorting, a text filter, column
// visibility and paging in the shadcn Table) inside a Card. Generic over the row type; a dashboard
// declares its columns with `defineColumns` and passes rows. See markets-table.tsx for the worked example.
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  columnVisibilityFeature, createColumnHelper, createPaginatedRowModel, createSortedRowModel, FlexRender, rowPaginationFeature,
  rowSortingFeature, tableFeatures, useTable, type Column, type ColumnDef, type ColumnVisibilityState, type RowData, type SortingState,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ArrowsDownUpIcon, CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, ColumnsIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// TanStack v9: declare the features the table uses; anything not listed is left out of the bundle.
// Text search is done on the rows before they reach the table (see `search`), so no filter feature.
export const features = tableFeatures({
  columnVisibilityFeature, rowPaginationFeature, rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
});
export type Features = typeof features;
export type Columns<T extends RowData> = ColumnDef<Features, T, any>[];

/** Build typed columns for a row type: `defineColumns<Market>((col) => [col.accessor('supplied', {...})])`. */
export function defineColumns<T extends RowData>(build: (col: ReturnType<typeof createColumnHelper<Features, T>>) => any[]): Columns<T> {
  return build(createColumnHelper<Features, T>()) as Columns<T>;
}

/** A sortable header: a ghost button that cycles the sort and shows its direction. */
export function SortHeader<T extends RowData, V>({ column, label }: { column: Column<Features, T, V>; label: string }) {
  const dir = column.getIsSorted();
  const Icon = dir === 'asc' ? ArrowUpIcon : dir === 'desc' ? ArrowDownIcon : ArrowsDownUpIcon;
  return (
    <Button variant="ghost" size="sm" className="-mr-3 h-8 px-2" onClick={column.getToggleSortingHandler()}>
      {label}<Icon className={dir ? 'text-foreground' : 'text-muted-foreground'} />
    </Button>
  );
}

export type DataTableProps<T extends RowData> = {
  rows: T[]; columns: Columns<T>; title: string; caption: React.ReactNode;
  /** Stable row id; also used for the row's page when `rowHref` is given. */
  getRowId: (row: T) => string;
  /** Make every row open a page; the first column should also carry a real link for keyboards. */
  rowHref?: (row: T) => string;
  /** Free-text match against a row; enables the filter box. */
  search?: (row: T, query: string) => boolean;
  searchPlaceholder?: string;
  /** Column ids that are numeric (right-aligned, tabular). */
  numeric?: string[];
  /** Labels for the Columns menu, by column id (defaults to the id). */
  labels?: Record<string, string>;
  initialSort?: SortingState;
  pageSize?: number;
  /** The word for one row in the footer count, e.g. "market". */
  noun?: string;
  empty?: string;
};

export function DataTable<T extends RowData>({ rows, columns, title, caption, getRowId, rowHref, search, searchPlaceholder = 'Filter', numeric = [], labels = {}, initialSort = [], pageSize = 10, noun = 'row', empty = 'Nothing matches.' }: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>(initialSort);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const q = query.trim().toLowerCase();
  const data = React.useMemo(() => (q && search ? rows.filter((r) => search(r, q)) : rows), [rows, q, search]);
  const table = useTable({
    features, data, columns,
    state: { sorting, columnVisibility, pagination }, getRowId,
    onSortingChange: setSorting, onColumnVisibilityChange: setColumnVisibility, onPaginationChange: setPagination,
  });
  const num = new Set(numeric);
  const total = data.length;
  const pages = Math.max(1, table.getPageCount());
  return (
    <div className="px-4 lg:px-6">
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-[80ch]">{caption}</CardDescription>
        <CardAction className="flex items-center gap-2">
          {search ? <Input placeholder={searchPlaceholder} className="h-8 w-32 @lg/card:w-44" value={query} onChange={(e) => { setQuery(e.target.value); table.setPageIndex(0); }} /> : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <ColumnsIcon data-icon="inline-start" /><span className="hidden @md/card:inline">Columns</span><CaretDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table.getAllColumns().filter((c) => typeof c.accessorFn !== 'undefined' && c.getCanHide()).map((c) => (
                <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)}>{labels[c.id] ?? c.id}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} colSpan={h.colSpan} className={num.has(h.column.id) ? 'text-right' : ''}>
                    {h.isPlaceholder ? null : <FlexRender header={h} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={rowHref ? 'cursor-pointer' : ''}
                onClick={rowHref ? (e) => { if ((e.target as HTMLElement).closest('a, button')) return; router.push(rowHref(row.original)); } : undefined}>
                {row.getAllCells().filter((c) => c.column.getIsVisible()).map((cell) => (
                  <TableCell key={cell.id} className={num.has(cell.column.id) ? 'text-right' : ''}><FlexRender cell={cell} /></TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">{empty}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">{total} {noun}{total === 1 ? '' : 's'}</div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
            <Select value={`${table.state.pagination.pageSize}`} onValueChange={(v) => { if (v !== null) table.setPageSize(Number(v)); }} items={[10, 20, 50].map((n) => ({ label: `${n}`, value: `${n}` }))}>
              <SelectTrigger size="sm" className="w-20" id="rows-per-page"><SelectValue placeholder={table.state.pagination.pageSize} /></SelectTrigger>
              <SelectContent side="top"><SelectGroup>{[10, 20, 50].map((n) => <SelectItem key={n} value={`${n}`}>{n}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">Page {table.state.pagination.pageIndex + 1} of {pages}</div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><span className="sr-only">First page</span><CaretDoubleLeftIcon /></Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><span className="sr-only">Previous page</span><CaretLeftIcon /></Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><span className="sr-only">Next page</span><CaretRightIcon /></Button>
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(pages - 1)} disabled={!table.getCanNextPage()}><span className="sr-only">Last page</span><CaretDoubleRightIcon /></Button>
          </div>
        </div>
      </CardFooter>
    </Card>
    </div>
  );
}
