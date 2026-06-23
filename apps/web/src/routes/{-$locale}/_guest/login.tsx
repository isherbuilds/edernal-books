import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "@/lib/seo";

import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/{-$locale}/_guest/login")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/login",
        locale: params.locale
      },
      description: `Sign in to access your ${appConfig.site.shortName} account and manage your saved application data.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Login"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { redirect } = Route.useSearch();

  return <LoginForm redirectTo={redirect} />;
}
