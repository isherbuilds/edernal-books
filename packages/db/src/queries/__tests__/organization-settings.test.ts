import { describe, expect, it } from "vitest";

import {
  buildOrganizationSettingAuditRow,
  toOrganizationSettingInsert
} from "#@/queries/organization-settings";

describe("organization settings query helpers", () => {
  it("normalizes settings writes with Phase 0 defaults", () => {
    const values = toOrganizationSettingInsert({
      booksStartDate: "2026-04-01",
      legalName: "Edernal Books",
      organizationId: "org_1"
    });

    expect(values).toMatchObject({
      baseCurrencyCode: "INR",
      booksStartDate: "2026-04-01",
      countryCode: "IN",
      fiscalYearStartMonth: 4,
      legalName: "Edernal Books",
      organizationId: "org_1",
      primaryEmail: null,
      primaryPhone: null,
      timezone: "Asia/Kolkata",
      tradeName: null
    });
  });

  it("builds non-blocking user audit rows for settings upserts", () => {
    const row = buildOrganizationSettingAuditRow({
      booksStartDate: "2026-04-01",
      legalName: "Edernal Books",
      organizationId: "org_1",
      source: "user",
      userId: "user_1"
    });

    expect(row).toMatchObject({
      action: "organization_setting.upserted",
      entityId: "org_1",
      entityType: "organization_setting",
      organizationId: "org_1",
      scopeId: "org_1",
      scopeType: "organization",
      userId: "user_1"
    });
    expect(row.payloadJson).toMatchObject({
      metadata: {
        source: "user"
      }
    });
  });
});
