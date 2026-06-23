import { createFileRoute } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { getOrganizationsListQueryOptions } from "@/hooks/use-organizations";

import { HomePage } from "@/components/home/home-page";

export const Route = createFileRoute("/{-$locale}/_public/")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());

    if (!user) {
      return;
    }

    const organizations = await context.queryClient.ensureQueryData(
      getOrganizationsListQueryOptions()
    );
    const organization = organizations[0];

    if (!organization) {
      throw redirect({
        to: "/organizations/new"
      });
    }

    throw redirect({
      params: {
        orgSlug: organization.slug
      },
      to: organization.onboardingCompletedAt ? "/$orgSlug" : "/$orgSlug/onboarding"
    });
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/",
        locale: params.locale
      },
      description: appConfig.site.description
    }),
  component: HomePage
});
