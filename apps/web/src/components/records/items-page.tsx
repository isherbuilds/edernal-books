import { getRouteApi } from "@tanstack/react-router";
import { BoxesIcon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  type Item,
  type ItemKind,
  ItemKindSchema,
  type ItemUsage,
  ItemUsageSchema
} from "@tsu-stack/core/items";
import { SEARCH_QUERY_MAX_LENGTH } from "@tsu-stack/core/text";
import { m } from "@tsu-stack/i18n/messages";

import { formatMinorUnits } from "@/utils/accounting-format";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useItemQuery, useItemsQuery, useSetItemActiveMutation } from "@/hooks/use-records";

import {
  type DataColumn,
  DataTable,
  DataTableContainer,
  DataTableLoadMore
} from "@/components/data-table";
import { EmptyState, NoResults } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import {
  ITEM_KIND_OPTIONS,
  ITEM_USAGE_OPTIONS,
  ItemForm,
  itemKindLabel,
  itemUsageLabel
} from "@/components/records/item-form";
import { handleRecordMutationError } from "@/components/records/record-error";
import {
  type RecordFilterGroup,
  RecordActiveBadge,
  RecordFilterMenu,
  RecordFilterPills,
  RecordPrimaryAction,
  RecordRowActions,
  RecordSearchField,
  RecordSheet,
  RecordsPageLayout,
  RecordsToolbar
} from "@/components/records/records-shell";

const route = getRouteApi("/{-$locale}/_app/$orgSlug/_shell/records/items");

type ItemsSearch = {
  id?: string;
  kind?: ItemKind;
  q?: string;
  usage?: ItemUsage;
  view?: "create" | "edit";
};

type ItemsPageProps = {
  orgSlug: string;
};

export function ItemsPage({ orgSlug }: ItemsPageProps) {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const setSearch = (patch: Partial<ItemsSearch>) => {
    void navigate({ replace: true, search: { ...search, ...patch } });
  };

  const debouncedSearch = useDebouncedValue((search.q ?? "").trim());
  const isEditing = search.view === "edit" && Boolean(search.id);

  const itemsQuery = useItemsQuery({
    includeInactive: true,
    kind: search.kind,
    orgSlug,
    q: debouncedSearch.length > 0 ? debouncedSearch : undefined,
    usage: search.usage
  });
  const itemQuery = useItemQuery({ id: search.id ?? "", orgSlug }, isEditing);
  const setItemActive = useSetItemActiveMutation();
  const items = useMemo(
    () => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [itemsQuery.data]
  );

  const hasFilters =
    Boolean((search.q ?? "").trim()) || Boolean(search.kind) || Boolean(search.usage);

  const filterGroups: RecordFilterGroup[] = [
    {
      allLabel: m.owner_records__filter_all(),
      id: "kind",
      label: m.owner_records__items_kind_label(),
      onValueChange: (value) => {
        const parsed = ItemKindSchema.safeParse(value);
        setSearch({ kind: parsed.success ? parsed.data : undefined });
      },
      options: ITEM_KIND_OPTIONS,
      value: search.kind ?? "all"
    },
    {
      allLabel: m.owner_records__filter_all(),
      id: "usage",
      label: m.owner_records__items_usage_label(),
      onValueChange: (value) => {
        const parsed = ItemUsageSchema.safeParse(value);
        setSearch({ usage: parsed.success ? parsed.data : undefined });
      },
      options: ITEM_USAGE_OPTIONS,
      value: search.usage ?? "all"
    }
  ];

  const pills = [
    search.kind ? { key: "kind", label: itemKindLabel(search.kind) } : null,
    search.usage ? { key: "usage", label: itemUsageLabel(search.usage) } : null
  ].filter((pill) => pill !== null);

  const removePill = (key: string) => {
    setSearch(key === "kind" ? { kind: undefined } : { usage: undefined });
  };

  const openCreate = () => setSearch({ id: undefined, view: "create" });
  const openEdit = (item: Item) => setSearch({ id: item.id, view: "edit" });
  const closeSheet = () => setSearch({ id: undefined, view: undefined });

  const editingItem = isEditing ? (itemQuery.data ?? null) : null;
  const sheetOpen = search.view === "create" || isEditing;

  const toggleItemActive = (item: Item) => {
    setItemActive.mutate(
      { id: item.id, isActive: !item.isActive, orgSlug },
      {
        onError: (error) =>
          handleRecordMutationError(error, {
            onDuplicateName: () => toast.error(m.owner_records__items_duplicate_name()),
            onFallback: () =>
              toast.error(
                error instanceof Error ? error.message : m.owner_records__items_update_error()
              )
          })
      }
    );
  };

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
          onEdit={() => openEdit(item)}
          onToggleActive={() => toggleItemActive(item)}
        />
      ),
      header: null,
      headClassName: "w-12",
      id: "actions",
      stopRowClick: true
    }
  ];

  return (
    <RecordsPageLayout
      description={m.owner_records__items_subtitle()}
      eyebrow={m.owner_records__eyebrow()}
      icon={<BoxesIcon className="size-4" />}
      title={m.owner_records__items_title()}
    >
      <RecordsToolbar
        pills={
          <RecordFilterPills
            clearLabel={m.owner_records__clear_filters()}
            onClear={() => setSearch({ kind: undefined, q: undefined, usage: undefined })}
            onRemove={removePill}
            pills={pills}
          />
        }
        search={
          <RecordSearchField
            ariaLabel={m.owner_records__items_search_label()}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            onChange={(value) => setSearch({ q: value || undefined })}
            placeholder={m.owner_records__items_search_placeholder()}
            value={search.q ?? ""}
          />
        }
      >
        <RecordFilterMenu
          ariaLabel={m.owner_records__filters()}
          groups={filterGroups}
          label={m.owner_records__filters()}
        />
        <RecordPrimaryAction label={m.owner_records__items_new()} onClick={openCreate} />
      </RecordsToolbar>

      <QueryState
        empty={
          hasFilters ? (
            <NoResults
              actionLabel={m.owner_records__clear_filters()}
              description={m.owner_records__no_results_description()}
              onAction={() => setSearch({ kind: undefined, q: undefined, usage: undefined })}
              title={m.owner_records__no_results_title()}
            />
          ) : (
            <EmptyState
              actionLabel={m.owner_records__items_new()}
              description={m.owner_records__items_empty_description()}
              icon={<BoxesIcon className="size-5" />}
              onAction={openCreate}
              title={m.owner_records__items_empty_title()}
            />
          )
        }
        error={itemsQuery.error}
        errorFallback={m.owner_records__items_error_fallback()}
        errorTitle={m.owner_records__items_error_title()}
        hasData={Boolean(itemsQuery.data)}
        isEmpty={items.length === 0}
        isError={itemsQuery.isError}
        isLoading={itemsQuery.isLoading}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(item) => item.id}
            minWidthClassName="min-w-[1000px]"
            onRowClick={openEdit}
            rows={items}
          />
          {itemsQuery.hasNextPage ? (
            <div className="border-t">
              <DataTableLoadMore
                isFetchingNextPage={itemsQuery.isFetchingNextPage}
                loadingLabel={m.owner_records__loading_more()}
                loadLabel={m.owner_records__load_more()}
                onLoadMore={() => {
                  void itemsQuery.fetchNextPage();
                }}
              />
            </div>
          ) : null}
        </DataTableContainer>
      </QueryState>

      <RecordSheet
        description={
          isEditing
            ? m.owner_records__items_edit_description()
            : m.owner_records__items_create_description()
        }
        onOpenChange={(open) => {
          if (!open) {
            closeSheet();
          }
        }}
        open={sheetOpen}
        title={
          isEditing ? m.owner_records__items_edit_title() : m.owner_records__items_create_title()
        }
      >
        {isEditing ? (
          <QueryState
            empty={null}
            error={itemQuery.error}
            errorFallback={m.owner_records__items_error_fallback()}
            errorTitle={m.owner_records__items_error_title()}
            isEmpty={false}
            isError={itemQuery.isError}
            isLoading={itemQuery.isLoading}
          >
            {editingItem ? (
              <ItemForm
                item={editingItem}
                key={editingItem.id}
                onClose={closeSheet}
                orgSlug={orgSlug}
              />
            ) : null}
          </QueryState>
        ) : (
          <ItemForm item={null} key="create" onClose={closeSheet} orgSlug={orgSlug} />
        )}
      </RecordSheet>
    </RecordsPageLayout>
  );
}
