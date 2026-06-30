import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { PartyKindSchema } from "@tsu-stack/core/parties";
import { SEARCH_QUERY_MAX_LENGTH } from "@tsu-stack/core/text";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { PartiesPage } from "@/components/records/parties-page";

const partiesSearchSchema = z.object({
  id: z.string().optional().catch(undefined),
  kind: PartyKindSchema.optional().catch(undefined),
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional().catch(undefined),
  view: z.enum(["create", "edit"]).optional().catch(undefined)
});

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/records/parties")({
  validateSearch: zodValidator(partiesSearchSchema),
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/records/parties`,
        locale: params.locale
      },
      description: "Manage customers and vendors.",
      robots: {
        follow: false,
        index: false
      },
      title: "Parties"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <PartiesPage orgSlug={orgSlug} />;
}
