import { describe, expect, it } from "vite-plus/test";

import {
  canManageBusinessSettings,
  organizationAccessControl,
  organizationRoles
} from "#@/permissions";

describe("organization role permissions", () => {
  it("allows owners to manage business settings", () => {
    expect(canManageBusinessSettings("owner")).toBe(true);
  });

  it("blocks non-owners from managing business settings", () => {
    expect(canManageBusinessSettings("accountant")).toBe(false);
    expect(canManageBusinessSettings("viewer")).toBe(false);
  });

  it("allows owners in Better Auth multi-role strings", () => {
    expect(canManageBusinessSettings("viewer, owner")).toBe(true);
  });

  it("wires starter roles to Better Auth organization access control", () => {
    expect(organizationAccessControl.statements.organization).toContain("update");
    expect(organizationRoles.owner.authorize({ organization: ["update"] }).success).toBe(true);
    expect(organizationRoles.accountant.authorize({ organization: ["update"] }).success).toBe(
      false
    );
    expect(organizationRoles.viewer.authorize({ organization: ["update"] }).success).toBe(false);
  });
});
