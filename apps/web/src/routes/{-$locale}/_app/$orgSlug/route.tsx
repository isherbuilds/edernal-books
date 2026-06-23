import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { isReservedOrganizationSlug } from "@/utils/organization-slugs";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug")({
  beforeLoad: ({ context, params }) => {
    if (isReservedOrganizationSlug(params.orgSlug)) {
      throw notFound();
    }

    const organization = context.organizations.find(
      (organization) => organization.slug === params.orgSlug
    );

    if (!organization) {
      throw notFound();
    }

    return { organization };
  },
  component: Outlet
});
