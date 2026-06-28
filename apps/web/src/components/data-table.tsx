import { type ReactNode } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";
import { cn } from "@tsu-stack/ui/lib/utils";

/** Bordered, rounded frame around a table (and any pagination/footer beneath it). */
export function DataTableContainer({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border bg-background">{children}</div>;
}

export type DataColumn<T> = {
  align?: "right";
  cell: (row: T) => ReactNode;
  cellClassName?: string;
  header: ReactNode;
  headClassName?: string;
  id: string;
  /** Stops row-click propagation for this cell (e.g. the actions column). */
  stopRowClick?: boolean;
};

type DataTableProps<T> = {
  columns: ReadonlyArray<DataColumn<T>>;
  /** Optional totals/summary content rendered inside `<TableFooter>` (e.g. trial-balance totals). */
  footer?: ReactNode;
  getRowId: (row: T) => string;
  minWidthClassName?: string;
  onRowClick?: (row: T) => void;
  rows: ReadonlyArray<T>;
};

/**
 * Column-driven table — mirrors Midday's `columns` + render approach without the
 * `@tanstack/react-table` dependency. Per-entity differences are just different
 * column defs; the themed `@tsu-stack/ui` `Table` primitive provides the styling.
 */
export function DataTable<T>({
  columns,
  footer,
  getRowId,
  minWidthClassName,
  onRowClick,
  rows
}: DataTableProps<T>) {
  return (
    <Table className={minWidthClassName}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              className={cn(column.align === "right" && "text-right", column.headClassName)}
              key={column.id}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            className={cn(onRowClick && "cursor-pointer")}
            key={getRowId(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((column) => (
              <TableCell
                className={cn(column.align === "right" && "text-right", column.cellClassName)}
                key={column.id}
                onClick={column.stopRowClick ? (event) => event.stopPropagation() : undefined}
              >
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {footer ? <TableFooter>{footer}</TableFooter> : null}
    </Table>
  );
}

type DataTableLoadMoreProps = {
  isFetchingNextPage: boolean;
  loadingLabel: ReactNode;
  loadLabel: ReactNode;
  onLoadMore: () => void;
};

/** Centered "Load more" button for infinite lists, with an inline pending spinner. */
export function DataTableLoadMore({
  isFetchingNextPage,
  loadingLabel,
  loadLabel,
  onLoadMore
}: DataTableLoadMoreProps) {
  return (
    <div className="flex justify-center py-3">
      <Button
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
        size="sm"
        type="button"
        variant="outline"
      >
        {isFetchingNextPage ? <Spinner data-icon="inline-start" /> : null}
        {isFetchingNextPage ? loadingLabel : loadLabel}
      </Button>
    </div>
  );
}
