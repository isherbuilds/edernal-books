import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/_public/error")({
  component: RouteComponent
});

function RouteComponent() {
  return null;
}
