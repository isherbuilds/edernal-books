import { BoxesIcon } from "lucide-react";

import { type Item } from "@tsu-stack/core/items";
import { m } from "@tsu-stack/i18n/messages";

import { formatMinorUnits } from "@/utils/accounting-format";

import { type DataColumn, DataTable } from "@/components/data-table";
import { DataTableContainer } from "@/components/data-table-container";
import { DataTableLoadMore } from "@/components/data-table-load-more";
import { EmptyState, NoResults } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import { type QueryRenderState } from "@/components/query-state-model";
import { itemKindLabel, itemUsageLabel } from "@/components/records/item-form-options";
import { RecordActiveBadge, RecordRowActions } from "@/components/records/records-shell";

type ItemsRegisterProps = {
  hasFilters: boolean;
  items: Item[];
  onClearFilters: () => void;
  onCreate: () => void;
  onEdit: (item: Item) => void;
  onLoadMore: () => void;
  onToggleActive: (item: Item) => void;
  pagination: {
    hasNextPage: boolean;
    loadingNextPage: boolean;
  };
  queryState: QueryRenderState;
};

export function ItemsRegister({
  hasFilters,
  items,
  onClearFilters,
  onCreate,
  onEdit,
  onLoadMore,
  onToggleActive,
  pagination,
  queryState
}: ItemsRegisterProps) {
  const columns: DataColumn<Item>[] = [
    {
      cell: (item) => item.name,
      cellClassName: "font-medium",
      header: m.owner_records__items_column_name(),
      id: "name"
    },
    {
      cell: (item) => itemKindLabel(item.kind),
      header: m.owner_records__items_column_kind(),
      id: "kind"
    },
    {
      cell: (item) => itemUsageLabel(item.usage),
      header: m.owner_records__items_column_usage(),
      id: "usage"
    },
    {
      cell: (item) => item.unit ?? "-",
      header: m.owner_records__items_column_unit(),
      id: "unit"
    },
    {
      cell: (item) => item.hsnCode ?? "-",
      cellClassName: "tabular-nums",
      header: m.owner_records__items_column_hsn(),
      id: "hsnCode"
    },
    {
      align: "right",
      cell: (item) => (item.salesRateMinor != null ? formatMinorUnits(item.salesRateMinor) : "-"),
      cellClassName: "font-amount tabular-nums",
      header: m.owner_records__items_column_sales_rate(),
      id: "salesRate"
    },
    {
      align: "right",
      cell: (item) =>
        item.purchaseRateMinor != null ? formatMinorUnits(item.purchaseRateMinor) : "-",
      cellClassName: "font-amount tabular-nums",
      header: m.owner_records__items_column_purchase_rate(),
      id: "purchaseRate"
    },
    {
      cell: (item) => (
        <RecordActiveBadge
          activeLabel={m.owner_records__status_active()}
          inactiveLabel={m.owner_records__status_inactive()}
          isActive={item.isActive}
        />
      ),
      header: m.owner_records__items_column_status(),
      id: "status"
    },
    {
      align: "right",
      cell: (item) => (
        <RecordRowActions
          activateLabel={m.owner_records__activate()}
          ariaLabel={m.owner_records__row_actions()}
          deactivateLabel={m.owner_records__deactivate()}
          editLabel={m.owner_records__edit()}
          isActive={item.isActive}
          onEdit={() => onEdit(item)}
          onToggleActive={() => onToggleActive(item)}
        />
      ),
      header: null,
      headClassName: "w-12",
      id: "actions",
      stopRowClick: true
    }
  ];

  return (
    <QueryState
      empty={
        hasFilters ? (
          <NoResults
            actionLabel={m.owner_records__clear_filters()}
            description={m.owner_records__no_results_description()}
            onAction={onClearFilters}
            title={m.owner_records__no_results_title()}
          />
        ) : (
          <EmptyState
            actionLabel={m.owner_records__items_new()}
            description={m.owner_records__items_empty_description()}
            icon={<BoxesIcon className="size-5" />}
            onAction={onCreate}
            title={m.owner_records__items_empty_title()}
          />
        )
      }
      errorFallback={m.owner_records__items_error_fallback()}
      errorTitle={m.owner_records__items_error_title()}
      state={queryState}
    >
      <DataTableContainer>
        <DataTable
          columns={columns}
          getRowId={(item) => item.id}
          minWidthClassName="min-w-[1000px]"
          onRowClick={onEdit}
          rows={items}
        />
        {pagination.hasNextPage ? (
          <div className="border-t">
            <DataTableLoadMore
              isFetchingNextPage={pagination.loadingNextPage}
              loadingLabel={m.owner_records__loading_more()}
              loadLabel={m.owner_records__load_more()}
              onLoadMore={onLoadMore}
            />
          </div>
        ) : null}
      </DataTableContainer>
    </QueryState>
  );
}
