import { Outlet, createFileRoute } from "@tanstack/react-router";

import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";
import { SidebarInset, SidebarProvider } from "@tsu-stack/ui/components/sidebar";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SiteHeader } from "@/components/app-shell/site-header";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell")({
  beforeLoad: ({ context, params }) => {
    if (!context.organization.onboardingCompletedAt) {
      throw redirect({
        params: {
          orgSlug: params.orgSlug
        },
        to: "/$orgSlug/onboarding"
      });
    }
  },
  component: OrganizationLayout
});

function OrganizationLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <SiteHeader title="Something" />

        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
