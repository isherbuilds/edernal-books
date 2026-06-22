import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const Route = createFileRoute("/{-$locale}/_guest/signup")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/signup",
        locale: params.locale
      },
      description: `Create a ${appConfig.site.shortName} account to save your progress and access personalized features.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Sign Up"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { redirect } = Route.useSearch();

  return <SignUpForm redirectTo={redirect} />;
}
