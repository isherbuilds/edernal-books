import { createAccessControl, type Role } from "better-auth/plugins/access";

const ORGANIZATION_ROLES = ["owner", "accountant", "viewer"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const organizationAccessControl = createAccessControl({
  ac: ["create", "read", "update", "delete"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  organization: ["update", "delete"],
  team: ["create", "update", "delete"]
});

const readOnlyOrganizationRole = organizationAccessControl.newRole({
  ac: ["read"],
  invitation: [],
  member: [],
  organization: [],
  team: []
});

export const organizationRoles = {
  accountant: readOnlyOrganizationRole,
  owner: organizationAccessControl.newRole({
    ac: ["create", "read", "update", "delete"],
    invitation: ["create", "cancel"],
    member: ["create", "update", "delete"],
    organization: ["update", "delete"],
    team: ["create", "update", "delete"]
  }),
  viewer: readOnlyOrganizationRole
} satisfies Record<OrganizationRole, Role>;

export function canManageBusinessSettings(role: string): boolean {
  return role.split(",").some((value) => value.trim() === "owner");
}

export function canAccessAccounting(role: string): boolean {
  return role.split(",").some((value) => {
    const roleName = value.trim();
    return roleName === "owner" || roleName === "accountant";
  });
}
