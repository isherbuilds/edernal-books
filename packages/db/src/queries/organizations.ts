import { and, eq } from "drizzle-orm";

import { type DatabaseOrTransaction } from "#@/client";
import { member, organization } from "#@/schema/auth.schema";

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  organizationSlug: string;
  role: string;
  userId: string;
};

export type GetOrganizationMembershipForAccessInput = {
  orgSlug: string;
  userId: string;
};

export async function getOrganizationMembershipForAccess(
  dbOrTx: DatabaseOrTransaction,
  input: GetOrganizationMembershipForAccessInput
): Promise<OrganizationMembership | undefined> {
  const [result] = await dbOrTx
    .select({
      id: member.id,
      organizationId: member.organizationId,
      organizationSlug: organization.slug,
      role: member.role,
      userId: member.userId
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(organization.slug, input.orgSlug), eq(member.userId, input.userId)))
    .limit(1);

  return result;
}
