import { and, asc, eq, isNull } from "drizzle-orm";

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

export type ListOrganizationsForUserInput = {
  userId: string;
};

export type OrganizationListItem = {
  id: string;
  name: string;
  onboardingCompletedAt: Date | null;
  role: string;
  slug: string;
};

export type MarkOrganizationOnboardingCompletedInput = {
  completedAt: Date;
  organizationId: string;
};
export type MarkOrganizationOnboardingCompletedResult = {
  alreadyCompleted: boolean;
  completedAt: Date;
};

export async function listOrganizationsForUser(
  dbOrTx: DatabaseOrTransaction,
  input: ListOrganizationsForUserInput
): Promise<OrganizationListItem[]> {
  return await dbOrTx
    .select({
      id: organization.id,
      name: organization.name,
      onboardingCompletedAt: organization.onboardingCompletedAt,
      role: member.role,
      slug: organization.slug
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, input.userId))
    .orderBy(asc(organization.name));
}

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

export async function markOrganizationOnboardingCompleted(
  dbOrTx: DatabaseOrTransaction,
  input: MarkOrganizationOnboardingCompletedInput
): Promise<MarkOrganizationOnboardingCompletedResult> {
  const [updated] = await dbOrTx
    .update(organization)
    .set({
      onboardingCompletedAt: input.completedAt
    })
    .where(
      and(eq(organization.id, input.organizationId), isNull(organization.onboardingCompletedAt))
    )
    .returning({
      onboardingCompletedAt: organization.onboardingCompletedAt
    });

  if (updated?.onboardingCompletedAt) {
    return {
      alreadyCompleted: false,
      completedAt: updated.onboardingCompletedAt
    };
  }

  const [existing] = await dbOrTx
    .select({
      onboardingCompletedAt: organization.onboardingCompletedAt
    })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);

  if (existing?.onboardingCompletedAt) {
    return {
      alreadyCompleted: true,
      completedAt: existing.onboardingCompletedAt
    };
  }

  throw new Error("Organization not found while completing onboarding.");
}
