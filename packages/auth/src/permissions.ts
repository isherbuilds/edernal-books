export const APP_ROLES = ["owner", "operator", "accountant", "developer", "viewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const roleSet = new Set<string>(APP_ROLES);

export function isAppRole(role: string): role is AppRole {
  return roleSet.has(role);
}

export function parseOrganizationRoles(role: string | string[] | null | undefined): AppRole[] {
  const roles = Array.isArray(role) ? role : (role ?? "").split(",");

  return roles.map((value) => value.trim()).filter(isAppRole);
}

export function hasOrganizationRole(
  currentRole: string | string[] | null | undefined,
  requiredRole: AppRole
): boolean {
  return parseOrganizationRoles(currentRole).includes(requiredRole);
}

export function canReadBusiness(role: AppRole): boolean {
  return (
    role === "owner" ||
    role === "operator" ||
    role === "accountant" ||
    role === "developer" ||
    role === "viewer"
  );
}

export function canManageBusinessSettings(role: AppRole): boolean {
  return role === "owner";
}

export function canManageMembers(role: AppRole): boolean {
  return role === "owner";
}

export function canManageOwnerDocuments(role: AppRole): boolean {
  return role === "owner" || role === "operator" || role === "accountant";
}

export function canPostJournals(role: AppRole): boolean {
  return role === "owner" || role === "accountant";
}

export function canManageIntegrations(role: AppRole): boolean {
  return role === "owner" || role === "developer";
}
