import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RootLayout } from "@/components/app-shell/root-layout";

export const Route = createFileRoute("/{-$locale}/_public")({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
