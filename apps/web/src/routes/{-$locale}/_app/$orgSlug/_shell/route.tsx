import { Outlet, createFileRoute } from "@tanstack/react-router";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import { SidebarInset, SidebarProvider } from "@tsu-stack/ui/components/sidebar";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SiteHeader } from "@/components/app-shell/site-header";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell")({
  component: OrganizationLayout
});

function OrganizationLayout() {
  const { organization } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar showAccounting={canAccessAccounting(organization.role)} />

      <SidebarInset>
        <SiteHeader />

        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
