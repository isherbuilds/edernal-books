import { describe, expect, it } from "vite-plus/test";

import {
  buildAccountingPeriods,
  formatFiscalYearLabel,
  formatSequenceNumber,
  getFiscalYearEndDate,
  getFiscalYearStartMonthFromEndDate
} from "@tsu-stack/core/accounting/fiscal-year";

describe("accounting query helpers", () => {
  it("builds monthly periods for a fiscal year", () => {
    const periods = buildAccountingPeriods({
      endDate: "2027-03-31",
      fiscalYearId: "018ff8d9-ae36-7d5b-8f21-8687bde90000",
      organizationId: "org_1",
      startDate: "2026-04-01"
    });

    expect(periods).toHaveLength(12);
    expect(periods[0]).toMatchObject({
      endDate: "2026-04-30",
      name: "Apr 2026",
      startDate: "2026-04-01"
    });
    expect(periods[11]).toMatchObject({
      endDate: "2027-03-31",
      name: "Mar 2027",
      startDate: "2027-03-01"
    });
  });

  it("builds partial first and last periods for custom fiscal ranges", () => {
    const periods = buildAccountingPeriods({
      endDate: "2026-12-15",
      fiscalYearId: "018ff8d9-ae36-7d5b-8f21-8687bde90000",
      organizationId: "org_1",
      startDate: "2026-04-10"
    });

    expect(periods[0]).toMatchObject({
      endDate: "2026-04-30",
      name: "Apr 2026",
      startDate: "2026-04-10"
    });
    expect(periods.at(-1)).toMatchObject({
      endDate: "2026-12-15",
      name: "Dec 2026",
      startDate: "2026-12-01"
    });
  });

  it("formats sequence values without numeric coercion", () => {
    expect(
      formatSequenceNumber({
        padding: 6,
        prefix: "JV-",
        sequenceValue: "42",
        suffix: ""
      })
    ).toBe("JV-000042");
  });

  it("formats fiscal year labels for journal prefixes", () => {
    expect(formatFiscalYearLabel("2025-04-01", "2026-03-31")).toBe("25-26");
  });

  it("derives fiscal year boundaries from canonical date helpers", () => {
    expect(getFiscalYearStartMonthFromEndDate("2027-03-31")).toBe(4);
    expect(getFiscalYearStartMonthFromEndDate("2026-12-15")).toBe(1);
    expect(
      getFiscalYearEndDate({
        booksStartDate: "2026-06-26",
        fiscalYearStartMonth: 4
      })
    ).toBe("2027-03-31");
  });
});
