export const queryTtl = {
  accountingListGc: 1000 * 60 * 5,
  accountingListStale: 1000 * 30,
  organizationListGc: 1000 * 60 * 10,
  organizationListStale: 1000 * 60 * 5,
  searchGc: 1000 * 60 * 10,
  searchStale: 1000 * 60 * 2,
  settingsGc: 1000 * 60 * 15,
  settingsStale: 1000 * 60 * 5
} as const;
