import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_CURSOR_LIMIT } from "#@/pagination";
import {
  CreatePartyInputSchema,
  ListPartiesInputSchema,
  PARTY_ERROR_CODES,
  PARTY_KINDS,
  PartyErrorCodeSchema,
  PartySchema,
  UpdatePartyInputSchema
} from "#@/parties/index";

describe("party contracts", () => {
  it("supports customer, vendor, and both party kinds", () => {
    expect(PARTY_KINDS).toEqual(["customer", "vendor", "both"]);
  });

  it("keeps party write error codes in the party contract", () => {
    expect(PARTY_ERROR_CODES).toEqual([
      "PARTY_CURSOR_INVALID",
      "PARTY_DUPLICATE_NAME",
      "PARTY_NOT_FOUND"
    ]);

    for (const code of PARTY_ERROR_CODES) {
      expect(PartyErrorCodeSchema.parse(code)).toBe(code);
    }

    expect(PartyErrorCodeSchema.safeParse("NOPE").success).toBe(false);
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
      gstRegistrationType: "unregistered",
      kind: "both",
      orgSlug: "demo"
    });
  });

  it("normalizes and validates GSTIN and PAN, defaulting registration type", () => {
    expect(
      CreatePartyInputSchema.parse({
        displayName: "Acme Traders",
        gstin: " 29abcde1234f1z5 ",
        kind: "customer",
        orgSlug: "demo",
        pan: "abcde1234f"
      })
    ).toMatchObject({
      gstRegistrationType: "unregistered",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F"
    });

    expect(
      CreatePartyInputSchema.safeParse({
        displayName: "Acme Traders",
        gstin: "not-a-gstin",
        kind: "customer",
        orgSlug: "demo"
      }).success
    ).toBe(false);
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
      limit: DEFAULT_CURSOR_LIMIT,
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
        gstRegistrationType: "unregistered",
        gstin: null,
        id: "018ff8d9-ae36-7d5b-8f21-8687bde90001",
        isActive: true,
        kind: "both",
        legalName: null,
        normalizedName: "acme traders",
        organizationId: "org_123",
        pan: null,
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
