import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { HomePage } from "@/components/home/home-page";

export const Route = createFileRoute("/{-$locale}/_public/home")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/home",
        locale: params.locale
      },
      description: appConfig.site.description
    }),
  component: HomePage
});
