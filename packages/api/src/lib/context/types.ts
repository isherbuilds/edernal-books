import { type AuthSession } from "@tsu-stack/auth/index";
import { type Database } from "@tsu-stack/db";
import { type OrganizationMembership } from "@tsu-stack/db/queries";
import { type RequestLogger } from "@tsu-stack/logger/server";

export type OrpcContext = {
  db: Database;
  authSession: AuthSession | null;
  logger: RequestLogger;
};

export type AuthenticatedOrpcContext = Omit<OrpcContext, "authSession"> & {
  authSession: AuthSession;
};

export type OrganizationOrpcContext = AuthenticatedOrpcContext & {
  organizationId: string;
  organizationMembership: OrganizationMembership;
  organizationRole: string;
  organizationSlug: string;
};
