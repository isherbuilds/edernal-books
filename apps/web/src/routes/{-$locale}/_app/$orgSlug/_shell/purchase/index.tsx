import { createFileRoute } from "@tanstack/react-router";

import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/_shell/purchase/")({
  beforeLoad: ({ params }) => {
    throw redirect({ params: { orgSlug: params.orgSlug }, to: "/$orgSlug/purchase/bills" });
  }
});
