import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { PrivacyPolicyPage } from "@/components/legal/privacy-policy-page";

export const Route = createFileRoute("/{-$locale}/_public/privacy-policy")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/privacy-policy",
        locale: params.locale
      },
      description: `Learn how ${appConfig.site.shortName} collects, uses, and protects your account and usage information.`,
      title: "Privacy Policy"
    }),
  component: PrivacyPolicyPage
});
