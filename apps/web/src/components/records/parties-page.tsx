import { getRouteApi } from "@tanstack/react-router";
import { UserRoundIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { type Party, type PartyKind, PartyKindSchema } from "@tsu-stack/core/parties";
import { SEARCH_QUERY_MAX_LENGTH } from "@tsu-stack/core/text";
import { m } from "@tsu-stack/i18n/messages";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePartiesQuery, usePartyQuery, useSetPartyActiveMutation } from "@/hooks/use-records";

import {
  type DataColumn,
  DataTable,
  DataTableContainer,
  DataTableLoadMore
} from "@/components/data-table";
import { EmptyState, NoResults } from "@/components/page-layout";
import { QueryState } from "@/components/query-state";
import {
  PARTY_KIND_OPTIONS,
  PartyForm,
  gstRegistrationTypeLabel,
  partyKindLabel
} from "@/components/records/party-form";
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

const route = getRouteApi("/{-$locale}/_app/$orgSlug/_shell/records/parties");

type PartiesSearch = {
  id?: string;
  kind?: PartyKind;
  q?: string;
  view?: "create" | "edit";
};

type PartiesPageProps = {
  orgSlug: string;
};

export function PartiesPage({ orgSlug }: PartiesPageProps) {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const setSearch = (patch: Partial<PartiesSearch>) => {
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

  const partiesQuery = usePartiesQuery({
    includeInactive: true,
    kind: search.kind,
    orgSlug,
    q: debouncedSearch.length > 0 ? debouncedSearch : undefined
  });
  const partyQuery = usePartyQuery({ id: search.id ?? "", orgSlug }, isEditing);
  const setPartyActive = useSetPartyActiveMutation();
  const parties = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.parties) ?? [],
    [partiesQuery.data]
  );

  const hasFilters = Boolean(query.trim()) || Boolean(search.kind);

  const clearFilters = () => {
    setQuery("");
    setSearch({ kind: undefined, q: undefined });
  };

  const filterGroups: RecordFilterGroup[] = [
    {
      allLabel: m.owner_records__filter_all(),
      id: "kind",
      label: m.owner_records__parties_kind_label(),
      onValueChange: (value) => {
        const parsed = PartyKindSchema.safeParse(value);
        setSearch({ kind: parsed.success ? parsed.data : undefined });
      },
      options: PARTY_KIND_OPTIONS,
      value: search.kind ?? "all"
    }
  ];

  const pills = search.kind ? [{ key: "kind", label: partyKindLabel(search.kind) }] : [];

  const openCreate = () => setSearch({ id: undefined, view: "create" });
  const openEdit = (party: Party) => setSearch({ id: party.id, view: "edit" });
  const closeSheet = () => setSearch({ id: undefined, view: undefined });

  const editingParty = isEditing ? (partyQuery.data ?? null) : null;
  const sheetOpen = search.view === "create" || isEditing;

  const togglePartyActive = (party: Party) => {
    setPartyActive.mutate(
      { id: party.id, isActive: !party.isActive, orgSlug },
      {
        onError: () => toast.error(m.owner_records__parties_update_error())
      }
    );
  };

  const columns: DataColumn<Party>[] = [
    {
      cell: (party) => party.displayName,
      cellClassName: "font-medium",
      header: m.owner_records__parties_column_name(),
      id: "name"
    },
    {
      cell: (party) => partyKindLabel(party.kind),
      header: m.owner_records__parties_column_kind(),
      id: "kind"
    },
    {
      cell: (party) => gstRegistrationTypeLabel(party.gstRegistrationType),
      header: m.owner_records__parties_column_gst_type(),
      id: "gstType"
    },
    {
      cell: (party) => party.gstin ?? "-",
      cellClassName: "tabular-nums",
      header: m.owner_records__parties_column_gstin(),
      id: "gstin"
    },
    {
      cell: (party) => party.email ?? "-",
      header: m.owner_records__parties_column_email(),
      id: "email"
    },
    {
      cell: (party) => party.phone ?? "-",
      header: m.owner_records__parties_column_phone(),
      id: "phone"
    },
    {
      cell: (party) => party.city ?? "-",
      header: m.owner_records__parties_column_city(),
      id: "city"
    },
    {
      cell: (party) => (
        <RecordActiveBadge
          activeLabel={m.owner_records__status_active()}
          inactiveLabel={m.owner_records__status_inactive()}
          isActive={party.isActive}
        />
      ),
      header: m.owner_records__parties_column_status(),
      id: "status"
    },
    {
      align: "right",
      cell: (party) => (
        <RecordRowActions
          activateLabel={m.owner_records__activate()}
          ariaLabel={m.owner_records__row_actions()}
          deactivateLabel={m.owner_records__deactivate()}
          editLabel={m.owner_records__edit()}
          isActive={party.isActive}
          onEdit={() => openEdit(party)}
          onToggleActive={() => togglePartyActive(party)}
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
      description={m.owner_records__parties_subtitle()}
      title={m.owner_records__parties_title()}
    >
      <RecordsToolbar
        pills={
          <RecordFilterPills
            clearLabel={m.owner_records__clear_filters()}
            onClear={clearFilters}
            onRemove={() => setSearch({ kind: undefined })}
            pills={pills}
          />
        }
        search={
          <RecordSearchField
            ariaLabel={m.owner_records__parties_search_label()}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            onChange={setQuery}
            placeholder={m.owner_records__parties_search_placeholder()}
            value={query}
          />
        }
      >
        <RecordFilterMenu
          ariaLabel={m.owner_records__filters()}
          groups={filterGroups}
          label={m.owner_records__filters()}
        />
        <RecordPrimaryAction label={m.owner_records__parties_new()} onClick={openCreate} />
      </RecordsToolbar>

      <QueryState
        empty={
          hasFilters ? (
            <NoResults
              actionLabel={m.owner_records__clear_filters()}
              description={m.owner_records__no_results_description()}
              onAction={clearFilters}
              title={m.owner_records__no_results_title()}
            />
          ) : (
            <EmptyState
              actionLabel={m.owner_records__parties_new()}
              description={m.owner_records__parties_empty_description()}
              icon={<UserRoundIcon className="size-5" />}
              onAction={openCreate}
              title={m.owner_records__parties_empty_title()}
            />
          )
        }
        error={partiesQuery.error}
        errorFallback={m.owner_records__parties_error_fallback()}
        errorTitle={m.owner_records__parties_error_title()}
        hasData={Boolean(partiesQuery.data)}
        isEmpty={parties.length === 0}
        isError={partiesQuery.isError}
        isLoading={partiesQuery.isLoading}
      >
        <DataTableContainer>
          <DataTable
            columns={columns}
            getRowId={(party) => party.id}
            minWidthClassName="min-w-[1040px]"
            onRowClick={openEdit}
            rows={parties}
          />
          {partiesQuery.hasNextPage ? (
            <div className="border-t">
              <DataTableLoadMore
                isFetchingNextPage={partiesQuery.isFetchingNextPage}
                loadingLabel={m.owner_records__loading_more()}
                loadLabel={m.owner_records__load_more()}
                onLoadMore={() => {
                  void partiesQuery.fetchNextPage();
                }}
              />
            </div>
          ) : null}
        </DataTableContainer>
      </QueryState>

      <RecordSheet
        description={
          isEditing
            ? m.owner_records__parties_edit_description()
            : m.owner_records__parties_create_description()
        }
        onOpenChange={(open) => {
          if (!open) {
            closeSheet();
          }
        }}
        open={sheetOpen}
        title={
          isEditing
            ? m.owner_records__parties_edit_title()
            : m.owner_records__parties_create_title()
        }
      >
        {isEditing ? (
          <QueryState
            empty={null}
            error={partyQuery.error}
            errorFallback={m.owner_records__parties_error_fallback()}
            errorTitle={m.owner_records__parties_error_title()}
            isEmpty={false}
            isError={partyQuery.isError}
            isLoading={partyQuery.isLoading}
          >
            {editingParty ? (
              <PartyForm
                key={editingParty.id}
                onClose={closeSheet}
                orgSlug={orgSlug}
                party={editingParty}
              />
            ) : null}
          </QueryState>
        ) : (
          <PartyForm key="create" onClose={closeSheet} orgSlug={orgSlug} party={null} />
        )}
      </RecordSheet>
    </RecordsPageLayout>
  );
}
