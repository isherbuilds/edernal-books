import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { ItemKindSchema, ItemUsageSchema } from "@tsu-stack/core/items";
import { SEARCH_QUERY_MAX_LENGTH } from "@tsu-stack/core/text";

import { generateAppSeo } from "@/lib/seo";

import { AccountingLockedState } from "@/components/accounting/accounting-locked-state";
import { ItemsPage } from "@/components/records/items-page";

const itemsSearchSchema = z.object({
  id: z.string().optional().catch(undefined),
  kind: ItemKindSchema.optional().catch(undefined),
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional().catch(undefined),
  usage: ItemUsageSchema.optional().catch(undefined),
  view: z.enum(["create", "edit"]).optional().catch(undefined)
});

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/records/items")({
  validateSearch: zodValidator(itemsSearchSchema),
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/records/items`,
        locale: params.locale
      },
      description: "Manage goods and services.",
      robots: {
        follow: false,
        index: false
      },
      title: "Items"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();

  if (!canAccessAccounting(organization.role)) {
    return <AccountingLockedState />;
  }

  return <ItemsPage orgSlug={orgSlug} />;
}
