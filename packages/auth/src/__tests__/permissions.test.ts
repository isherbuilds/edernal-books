import { describe, expect, it } from "vitest";

import {
  canManageBusinessSettings,
  canManageIntegrations,
  canManageMembers,
  canManageOwnerDocuments,
  canPostJournals,
  canReadBusiness,
  hasOrganizationRole,
  isAppRole,
  parseOrganizationRoles,
  type AppRole
} from "#@/permissions";

describe("organization role permissions", () => {
  it("allows owners to manage members", () => {
    expect(canManageMembers("owner")).toBe(true);
  });

  it("allows accountants to post journals", () => {
    expect(canPostJournals("accountant")).toBe(true);
  });

  it("blocks operators from posting journals", () => {
    expect(canPostJournals("operator" satisfies AppRole)).toBe(false);
  });

  it("allows operators to manage owner workflow documents", () => {
    expect(canManageOwnerDocuments("operator")).toBe(true);
  });

  it("keeps developer access focused on integrations", () => {
    expect(canManageIntegrations("developer")).toBe(true);
    expect(canPostJournals("developer")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    expect(canReadBusiness("viewer")).toBe(true);
    expect(canManageBusinessSettings("viewer")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("parses Better Auth comma-separated multi-role strings", () => {
    expect(parseOrganizationRoles("operator, accountant,unknown")).toEqual([
      "operator",
      "accountant"
    ]);
  });

  it("checks any matching role in a multi-role string", () => {
    expect(hasOrganizationRole("operator,accountant", "accountant")).toBe(true);
    expect(hasOrganizationRole("operator,accountant", "developer")).toBe(false);
  });

  it("rejects unknown role strings", () => {
    expect(isAppRole("admin")).toBe(false);
    expect(parseOrganizationRoles("admin")).toEqual([]);
  });
});
