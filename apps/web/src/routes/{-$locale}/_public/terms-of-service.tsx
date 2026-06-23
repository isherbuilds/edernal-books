import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { TermsOfServicePage } from "@/components/legal/terms-of-service-page";

export const Route = createFileRoute("/{-$locale}/_public/terms-of-service")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/terms-of-service",
        locale: params.locale
      },
      description: `Review the rules, responsibilities, and terms for using ${appConfig.site.shortName}.`,
      title: "Terms of Service"
    }),
  component: TermsOfServicePage
});
