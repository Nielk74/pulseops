"use client";

import { useState } from "react";
import Link from "next/link";
import { RiArrowRightSLine, RiArrowUpDownLine, RiFlaskLine } from "@remixicon/react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState
} from "@tanstack/react-table";
import { StatusBadge } from "@/components/status-badge";
import { formatDuration, formatPercent } from "@/shared/utils/format";

export interface TestTableRow {
  id: string;
  testName: string;
  testType: string;
  durationMs: number;
  medianMs?: number;
  deltaPercent: number;
  anomalyType: string;
  probableCause?: string;
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text
  }
});
const columnHelper = createColumnHelper<typeof features, TestTableRow>();
const columns = columnHelper.columns([
  columnHelper.accessor("testName", {
    header: "Test",
    cell: ({ row }) => <Link href={`/tests/${row.original.id}`} className="flex min-h-11 items-center gap-3 font-medium text-white hover:text-emerald-300"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-400/10 text-blue-300"><RiFlaskLine aria-hidden="true" className="h-4 w-4" /></span>{row.original.testName}</Link>
  }),
  columnHelper.accessor("testType", { header: "Type", cell: ({ getValue }) => <span className="font-mono text-xs text-slate-400">{getValue()}</span> }),
  columnHelper.accessor("durationMs", { header: "Current", cell: ({ getValue }) => <span className="font-mono tabular-nums text-white">{formatDuration(getValue())}</span> }),
  columnHelper.accessor("medianMs", { header: "Median", cell: ({ getValue }) => <span className="font-mono tabular-nums">{formatDuration(getValue())}</span> }),
  columnHelper.accessor("deltaPercent", { header: "Delta", cell: ({ getValue }) => { const value = getValue(); return <span className={`font-mono tabular-nums ${Math.abs(value) >= 20 ? "text-amber-300" : "text-slate-400"}`}>{formatPercent(value, { signed: true })}</span>; } }),
  columnHelper.accessor("anomalyType", { header: "Status", cell: ({ getValue }) => { const status = getValue(); return <StatusBadge status={status === "NONE" ? "HEALTHY" : status} label={status === "NONE" ? "Normal" : status === "FAST" ? "Suspicious" : "Slow"} />; } }),
  columnHelper.accessor("probableCause", { header: "Probable cause", cell: ({ getValue }) => <span className="block max-w-48 truncate">{getValue() ?? "—"}</span> }),
  columnHelper.display({ id: "open", enableSorting: false, header: () => <span className="sr-only">Open</span>, cell: ({ row }) => <Link href={`/tests/${row.original.id}`} aria-label={`Explain ${row.original.testName}`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><RiArrowRightSLine aria-hidden="true" className="h-5 w-5" /></Link> })
]);

export function TestsTable({ data }: { data: TestTableRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "anomalyType", desc: true }]);
  const table = useTable({ features, data, columns, state: { sorting }, onSortingChange: setSorting });

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => { const sorted = header.column.getIsSorted(); return <th key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md text-left hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><table.FlexRender header={header} /><RiArrowUpDownLine aria-hidden="true" className="h-3.5 w-3.5" /></button> : <table.FlexRender header={header} />}</th>; })}</tr>)}</thead>
        <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getAllCells().map((cell) => <td key={cell.id}><table.FlexRender cell={cell} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
