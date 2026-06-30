import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useItemQuery, useItemsQuery, useSetItemActiveMutation } from "@/hooks/use-records";

import { QueryState } from "@/components/query-state";
import { getQueryState } from "@/components/query-state-model";
import { ItemForm } from "@/components/records/item-form";
import {
  ITEM_KIND_OPTIONS,
  ITEM_USAGE_OPTIONS,
  itemKindLabel,
  itemUsageLabel
} from "@/components/records/item-form-options";
import { ItemsRegister } from "@/components/records/items-register";
import {
  type RecordFilterGroup,
  RecordFilterMenu,
  RecordFilterPills,
  RecordPrimaryAction,
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

  const [query, setQuery] = useState(search.q ?? "");
  const lastUrlQuery = useRef(search.q ?? "");
  const debouncedSearch = useDebouncedValue(query.trim());
  const isEditing = search.view === "edit" && Boolean(search.id);

  useEffect(() => {
    const nextQuery = search.q ?? "";
    if (nextQuery !== lastUrlQuery.current) {
      lastUrlQuery.current = nextQuery;
      setQuery(nextQuery);
    }
  }, [search.q]);

  useEffect(() => {
    const nextQuery = debouncedSearch.length > 0 ? debouncedSearch : undefined;
    const nextValue = nextQuery ?? "";

    if (nextValue === lastUrlQuery.current) {
      return;
    }

    lastUrlQuery.current = nextValue;
    void navigate({ replace: true, search: { ...search, q: nextQuery } });
  }, [debouncedSearch, navigate, search]);

  const itemsQuery = useItemsQuery({
    includeInactive: true,
    kind: search.kind,
    orgSlug,
    q: debouncedSearch.length > 0 ? debouncedSearch : undefined,
    usage: search.usage
  });
  const itemQuery = useItemQuery({ id: search.id ?? "", orgSlug }, isEditing);
  const setItemActive = useSetItemActiveMutation();
  const items: Item[] = [];
  for (const page of itemsQuery.data?.pages ?? []) {
    items.push(...page.items);
  }

  const hasFilters = Boolean(query.trim()) || Boolean(search.kind) || Boolean(search.usage);

  const clearFilters = () => {
    setQuery("");
    setSearch({ kind: undefined, q: undefined, usage: undefined });
  };

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
        onError: () => toast.error(m.owner_records__items_update_error())
      }
    );
  };

  return (
    <RecordsPageLayout
      description={m.owner_records__items_subtitle()}
      title={m.owner_records__items_title()}
    >
      <RecordsToolbar
        pills={
          <RecordFilterPills
            clearLabel={m.owner_records__clear_filters()}
            onClear={clearFilters}
            onRemove={removePill}
            pills={pills}
          />
        }
        search={
          <RecordSearchField
            ariaLabel={m.owner_records__items_search_label()}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            onChange={setQuery}
            placeholder={m.owner_records__items_search_placeholder()}
            value={query}
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

      <ItemsRegister
        hasFilters={hasFilters}
        items={items}
        onClearFilters={clearFilters}
        onCreate={openCreate}
        onEdit={openEdit}
        onLoadMore={() => {
          void itemsQuery.fetchNextPage();
        }}
        onToggleActive={toggleItemActive}
        pagination={{
          hasNextPage: itemsQuery.hasNextPage,
          loadingNextPage: itemsQuery.isFetchingNextPage
        }}
        queryState={getQueryState({
          dataPresent: Boolean(itemsQuery.data),
          empty: items.length === 0,
          error: itemsQuery.error,
          errored: itemsQuery.isError,
          loading: itemsQuery.isLoading
        })}
      />

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
            errorFallback={m.owner_records__items_error_fallback()}
            errorTitle={m.owner_records__items_error_title()}
            state={getQueryState({
              empty: false,
              error: itemQuery.error,
              errored: itemQuery.isError,
              loading: itemQuery.isLoading
            })}
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
