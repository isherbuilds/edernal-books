import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { LockKeyholeIcon } from "lucide-react";
import { z } from "zod";

import { canManageBusinessSettings } from "@tsu-stack/auth/permissions";
import { m } from "@tsu-stack/i18n/messages";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

import { generateAppSeo } from "@/lib/seo";

import { ONBOARDING_STEP_KEYS } from "@/utils/onboarding";

import { OnboardingPage } from "@/components/onboarding/onboarding-page";

const onboardingRouteSearchSchema = z
  .object({
    step: z.enum(ONBOARDING_STEP_KEYS).optional().catch(undefined)
  })
  .catchall(z.unknown())
  .transform(({ step }) => {
    return { step };
  });

export const Route = createFileRoute("/{-$locale}/_app/$orgSlug/onboarding")({
  validateSearch: zodValidator(onboardingRouteSearchSchema),
  beforeLoad: ({ context, params }) => {
    if (context.organization.onboardingCompletedAt) {
      throw redirect({
        params: {
          orgSlug: params.orgSlug
        },
        to: "/$orgSlug"
      });
    }
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.orgSlug}/onboarding`,
        locale: params.locale
      },
      description: "Finish business onboarding for Edernal Books.",
      robots: {
        follow: false,
        index: false
      },
      title: "Onboarding"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { organization, user } = Route.useRouteContext();
  const { orgSlug } = Route.useParams();
  const { step } = Route.useSearch();

  if (!canManageBusinessSettings(organization.role)) {
    return <OnboardingAccessPendingPage organizationName={organization.name} />;
  }

  return (
    <OnboardingPage
      organizationName={organization.name}
      orgSlug={orgSlug}
      stepKey={step}
      user={user}
    />
  );
}

function OnboardingAccessPendingPage({ organizationName }: { organizationName: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0b0b0b] px-6 text-white">
      <section className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
          <LockKeyholeIcon aria-hidden="true" className="size-5" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-white/45">{organizationName}</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            {m.onboarding_page__access_pending_title()}
          </h1>
          <p className="text-sm leading-relaxed text-white/55">
            {m.onboarding_page__access_pending_description()}
          </p>
        </div>
      </section>
    </main>
  );
}
