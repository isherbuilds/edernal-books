import { describe, expect, it } from "vite-plus/test";

import {
  CreatePartyInputSchema,
  ListPartiesInputSchema,
  PARTY_KINDS,
  PartySchema,
  UpdatePartyInputSchema
} from "#@/parties/index";

describe("party contracts", () => {
  it("supports customer, vendor, and both party kinds", () => {
    expect(PARTY_KINDS).toEqual(["customer", "vendor", "both"]);
  });

  it("accepts minimal create input and trims nullable contact fields", () => {
    expect(
      CreatePartyInputSchema.parse({
        displayName: "  Acme Traders  ",
        email: " ",
        kind: "both",
        orgSlug: "demo"
      })
    ).toEqual({
      displayName: "Acme Traders",
      email: null,
      kind: "both",
      orgSlug: "demo"
    });
  });

  it("rejects unknown kind and empty display names", () => {
    expect(
      CreatePartyInputSchema.safeParse({
        displayName: "",
        kind: "lead",
        orgSlug: "demo"
      }).success
    ).toBe(false);
  });

  it("keeps updates partial but requires id and org slug", () => {
    expect(
      UpdatePartyInputSchema.parse({
        id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        isActive: false,
        orgSlug: "demo"
      })
    ).toEqual({
      id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
      isActive: false,
      orgSlug: "demo"
    });
  });

  it("parses list filters for active customer/vendor views", () => {
    expect(
      ListPartiesInputSchema.parse({
        includeInactive: true,
        kind: "customer",
        orgSlug: "demo",
        q: " acme "
      })
    ).toEqual({
      includeInactive: true,
      kind: "customer",
      orgSlug: "demo",
      q: "acme"
    });
  });

  it("exposes organization-scoped party DTO shape", () => {
    expect(
      PartySchema.parse({
        addressLine1: null,
        addressLine2: null,
        city: null,
        countryCode: "IN",
        createdAt: "2026-06-27T00:00:00.000Z",
        displayName: "Acme Traders",
        email: null,
        id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        isActive: true,
        kind: "both",
        legalName: null,
        normalizedName: "acme traders",
        organizationId: "org_123",
        phone: null,
        postalCode: null,
        state: null,
        updatedAt: "2026-06-27T00:00:00.000Z"
      })
    ).toMatchObject({
      displayName: "Acme Traders",
      kind: "both",
      normalizedName: "acme traders"
    });
  });
});
