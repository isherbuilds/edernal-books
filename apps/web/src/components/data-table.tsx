import { type ReactNode } from "react";

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

export type DataColumn<T> = {
  align?: "right";
  cell: (row: T) => ReactNode;
  cellClassName?: string;
  header: ReactNode;
  headClassName?: string;
  id: string;
  stopRowClick?: boolean;
};

type DataTableProps<T> = {
  columns: ReadonlyArray<DataColumn<T>>;
  footer?: ReactNode;
  getRowId: (row: T) => string;
  minWidthClassName?: string;
  onRowClick?: (row: T) => void;
  rows: ReadonlyArray<T>;
};

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
      <TableHeader className="bg-muted/60">
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead
              className={cn(
                "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                column.align === "right" && "text-right",
                column.headClassName
              )}
              key={column.id}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const activateRow = () => onRowClick?.(row);

          return (
            <TableRow
              className={cn(
                onRowClick &&
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              )}
              key={getRowId(row)}
              onClick={onRowClick ? activateRow : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      // Only the row itself activates on Enter/Space; keys from focusable
                      // children (e.g. the row-action menu button) must not trigger the row.
                      if (event.target !== event.currentTarget) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        activateRow();
                      }
                    }
                  : undefined
              }
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
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
          );
        })}
      </TableBody>
      {footer ? <TableFooter>{footer}</TableFooter> : null}
    </Table>
  );
}

export { DataTableContainer } from "@/components/data-table-container";
export { DataTableLoadMore } from "@/components/data-table-load-more";
