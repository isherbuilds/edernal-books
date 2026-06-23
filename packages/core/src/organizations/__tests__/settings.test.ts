import { describe, expect, it } from "vite-plus/test";

import { UpsertOrganizationSettingInputSchema } from "#@/organizations/settings";

describe("organization settings schemas", () => {
  it("normalizes blank optional text inputs to null", () => {
    const input = UpsertOrganizationSettingInputSchema.parse({
      booksStartDate: "2026-04-01",
      legalName: "Edernal Books",
      orgSlug: "edernal-books",
      primaryEmail: " ",
      primaryPhone: "",
      tradeName: ""
    });

    expect(input.primaryEmail).toBeNull();
    expect(input.primaryPhone).toBeNull();
    expect(input.tradeName).toBeNull();
  });

  it("rejects unsupported business locale settings", () => {
    expect(() =>
      UpsertOrganizationSettingInputSchema.parse({
        baseCurrencyCode: "AUD",
        booksStartDate: "2026-04-01",
        countryCode: "AU",
        legalName: "Edernal Books",
        orgSlug: "edernal-books",
        timezone: "Australia/Sydney"
      })
    ).toThrow(/Invalid/);
  });

  it("rejects unsupported timezones", () => {
    expect(() =>
      UpsertOrganizationSettingInputSchema.parse({
        booksStartDate: "2026-04-01",
        countryCode: "IN",
        legalName: "Edernal Books",
        orgSlug: "edernal-books",
        timezone: "Asia/Dubai"
      })
    ).toThrow(/Invalid/);
  });
});
