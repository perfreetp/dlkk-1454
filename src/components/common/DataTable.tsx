/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';

export interface ColumnDef<T = any> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  icon?: LucideIcon;
}

interface DataTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  emptyMessage?: string;
  getRowClassName?: (row: T, index: number) => string | undefined;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable<T>({
  columns,
  data,
  onRowClick,
  selectable = false,
  emptyMessage = '暂无数据',
  getRowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.id) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(col.id);
      setSortDir('asc');
    }
  };

  const sortedData = [...data];
  if (sortKey && sortDir) {
    const col = columns.find((c) => c.id === sortKey);
    if (col?.accessorKey) {
      sortedData.sort((a: any, b: any) => {
        const av = a[col.accessorKey!];
        const bv = b[col.accessorKey!];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
  }

  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  };

  const getCellValue = (row: T, col: ColumnDef<T>, rowIndex: number): React.ReactNode => {
    if (col.cell) return col.cell(row, rowIndex);
    if (col.accessorKey) return (row as any)[col.accessorKey];
    return null;
  };

  const alignClass = (align?: string) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-12">
          <EmptyState title={emptyMessage} description="稍后再试或添加新数据" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:bg-slate-100 transition-colors',
                    alignClass(col.align)
                  )}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.icon && <col.icon className="h-3.5 w-3.5" />}
                    {col.header}
                    {col.sortable && sortKey === col.id && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'transition-colors',
                  (rowIndex % 2 === 1) && 'bg-slate-50/50',
                  onRowClick && 'cursor-pointer hover:bg-primary-50/60',
                  selectedRows.has(rowIndex) && 'bg-primary-50',
                  getRowClassName?.(row, rowIndex)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-4 py-3.5 w-12" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRow(rowIndex)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-4 py-3.5 text-sm text-slate-700',
                      alignClass(col.align)
                    )}
                  >
                    {getCellValue(row, col, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
