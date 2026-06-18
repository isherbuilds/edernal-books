import { ORPCError, os } from "@orpc/server";
import { type z } from "zod";

import { type OrgSlugInput } from "@tsu-stack/core/organizations";
import { getOrganizationMembershipForAccess } from "@tsu-stack/db/queries";

import { type OrpcContext } from "#@/lib/context/types";

const o = os.$context<OrpcContext>();

export const publicProcedure = o;

const authCookieSecurity = {
  spec: (spec: Record<string, unknown>) => {
    return {
      ...spec,
      security: [{ authCookie: [] }]
    };
  }
};

const requireAuth = o.middleware(async ({ context, next }) => {
  const { authSession } = context;

  if (!authSession?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      authSession
    }
  });
});

const requireOrganization = o.middleware(async ({ context, next }, input: OrgSlugInput) => {
  const { authSession } = context;

  if (!authSession?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const membership = await getOrganizationMembershipForAccess(context.db, {
    ...input,
    userId: authSession.user.id
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN");
  }

  context.logger.set({
    organization: {
      id: membership.organizationId,
      role: membership.role,
      slug: membership.organizationSlug
    }
  });

  return next({
    context: {
      organizationId: membership.organizationId,
      organizationMembership: membership,
      organizationRole: membership.role,
      organizationSlug: membership.organizationSlug,
      authSession
    }
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth).route(authCookieSecurity);

export function organizationProcedure<TInput extends OrgSlugInput>(inputSchema: z.ZodType<TInput>) {
  return publicProcedure.input(inputSchema).use(requireOrganization).route(authCookieSecurity);
}
