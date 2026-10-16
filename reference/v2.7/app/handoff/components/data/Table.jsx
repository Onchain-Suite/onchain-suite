import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Checkbox } from '../forms/Checkbox.jsx';

const css = `
.os-table{width:100%;border-collapse:collapse;font-family:var(--font-sans);font-size:var(--text-body-s-size);background:var(--bg-surface);}
.os-table th{position:sticky;top:0;background:var(--bg-surface);text-align:left;padding:10px 12px;
  font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);
  border-bottom:1px solid var(--border-default);white-space:nowrap;}
.os-table th.os-table--num,.os-table td.os-table--num{text-align:right;font-variant-numeric:tabular-nums;}
.os-table td{padding:0 12px;height:44px;border-bottom:1px solid var(--border-subtle);color:var(--text-primary);}
.os-table--compact td{height:36px;}
.os-table tbody tr{transition:background var(--duration-fast) var(--ease-standard);}
.os-table tbody tr:hover{background:var(--surface-hover);}
.os-table tbody tr.os-table__row--click{cursor:pointer;}
.os-table tbody tr.os-table__row--selected{background:var(--bg-selected);}
.os-table__sort{display:inline-flex;align-items:center;gap:4px;border:none;background:none;padding:0;font:inherit;letter-spacing:inherit;
  text-transform:inherit;color:inherit;cursor:pointer;}
.os-table__sort:hover{color:var(--text-primary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-table-css')) {
  const s = document.createElement('style'); s.id = 'os-table-css'; s.textContent = css; document.head.appendChild(s);
}

/** Table: numerals right + tabular, status as Badge, no zebra stripes, hover tint, sticky header.
    columns: { key, label, numeric?, sortable?, render?(row) } */
export function Table({ columns = [], rows = [], selectable = false, selected = [], onSelect, onRowClick, sortKey, sortDir = 'desc', onSort, compact = false, rowKey = 'id', style, className }) {
  const allSelected = selectable && rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => onSelect && onSelect(allSelected ? [] : rows.map((r) => r[rowKey]));
  const toggleRow = (id) => onSelect && onSelect(selected.includes(id) ? selected.filter((s) => s !== id) : selected.concat(id));
  return (
    <table className={`os-table${compact ? ' os-table--compact' : ''}${className ? ' ' + className : ''}`} style={style}>
      <thead>
        <tr>
          {selectable ? <th style={{ width: 36 }}><Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onChange={toggleAll} /></th> : null}
          {columns.map((c) => (
            <th key={c.key} scope="col" className={c.numeric ? 'os-table--num' : ''} aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
              {c.sortable ? (
                <button className="os-table__sort" onClick={() => onSort && onSort(c.key)}>
                  {c.label}
                  {sortKey === c.key ? <Icon name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} strokeWidth={2} style={{ width: 12, height: 12 }} /> : null}
                </button>
              ) : c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = row[rowKey];
          return (
            <tr key={id} className={`${selected.includes(id) ? 'os-table__row--selected' : ''}${onRowClick ? ' os-table__row--click' : ''}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {selectable ? <td><Checkbox checked={selected.includes(id)} onChange={() => toggleRow(id)} /></td> : null}
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'os-table--num' : ''}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
