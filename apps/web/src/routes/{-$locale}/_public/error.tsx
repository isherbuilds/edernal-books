import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/_public/error")({
  beforeLoad: async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    throw new Error(
      "This is a test error to demonstrate error handling in TanStack Start. You can customize this page by editing apps/web/src/routes/{-$locale}/_public/error/index.tsx"
    );
  },
  component: RouteComponent
});

function RouteComponent() {
  return <div>This page will never be rendered.</div>;
}
