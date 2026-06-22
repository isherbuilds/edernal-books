import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import {
  DEFAULT_ORGANIZATION_SETTINGS,
  UpsertOrganizationSettingInputSchema
} from "@tsu-stack/core/organizations";
import { m } from "@tsu-stack/i18n/messages";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { getDateInputValue } from "@/utils/form-input";
import {
  ONBOARDING_STEP_KEYS,
  type OnboardingFormInput,
  type OnboardingStepKey
} from "@/utils/onboarding";

import { useCompleteOnboardingMutation } from "@/hooks/use-organizations";
import { useZodForm } from "@/hooks/use-zod-form";

import {
  FeatureStepSummary,
  getOnboardingStepDefinition,
  OnboardingChecklist,
  type OnboardingStepDefinition
} from "./onboarding-step-definitions";

type OnboardingUser = {
  email?: string | null;
  name?: string | null;
};

type OnboardingPageProps = {
  organizationName: string;
  orgSlug: string;
  stepKey?: OnboardingStepKey;
  user: OnboardingUser | null;
};

const onboardingStepPanelClassName =
  "grid min-h-[18rem] grid-rows-[minmax(0,1fr)_auto] gap-5 sm:min-h-[19rem]";
const onboardingFieldThemeClassName =
  "[&_[data-slot=field-label]]:text-white/80 [&_[data-slot=field-description]]:text-white/[0.45] [&_[data-slot=input]]:border-white/10 [&_[data-slot=input]]:bg-white/[0.03] [&_[data-slot=input]]:text-white [&_[data-slot=input]::placeholder]:text-white/25 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:border-white/10 [&_[data-slot=select-trigger]]:bg-white/[0.03] [&_[data-slot=select-trigger]]:text-white [&_[data-slot=select-content]]:dark [&_[data-slot=select-content]]:border-white/10";
const ONBOARDING_FORM_ID = "onboarding-current-step-form";

export function OnboardingPage({ organizationName, orgSlug, stepKey, user }: OnboardingPageProps) {
  const navigate = useNavigate();
  const userLabel = user?.name ?? user?.email ?? "";
  const currentStepKey = stepKey ?? ONBOARDING_STEP_KEYS[0];
  const currentStep = getOnboardingStepDefinition(currentStepKey);
  const currentStepIndex = ONBOARDING_STEP_KEYS.indexOf(currentStepKey);
  const currentStepNumber = currentStepIndex + 1;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEP_KEYS.length - 1;
  const progress = (currentStepNumber / ONBOARDING_STEP_KEYS.length) * 100;
  const completeOnboardingMutation = useCompleteOnboardingMutation(orgSlug, {
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : m.onboarding_page__settings_save_failed()
      );
    }
  });
  const form = useZodForm(UpsertOrganizationSettingInputSchema, {
    defaultValues: getOnboardingDefaultValues(organizationName, orgSlug, user?.email ?? null)
  });
  const isSaving = completeOnboardingMutation.isPending || form.formState.isSubmitting;
  const isStepSubmitting = isLastStep ? isSaving : form.formState.isValidating;
  const submitFormId = currentStep.kind === "form" ? ONBOARDING_FORM_ID : undefined;
  const submitLabel = isLastStep
    ? isSaving
      ? m.onboarding_page__saving()
      : m.onboarding_page__open_dashboard()
    : m.onboarding_page__continue();
  const finishOnboardingForm = form.handleSubmit(async (values) => {
    try {
      await completeOnboardingMutation.mutateAsync(values);
      await navigate({
        params: {
          orgSlug
        },
        to: "/$orgSlug"
      });
    } catch {
      return;
    }
  });

  function goToStep(nextStepKey: OnboardingStepKey) {
    void navigate({
      params: {
        orgSlug
      },
      search: {
        step: nextStepKey === ONBOARDING_STEP_KEYS[0] ? undefined : nextStepKey
      },
      to: "/$orgSlug/onboarding"
    });
  }

  function goBack() {
    const previousStepKey = ONBOARDING_STEP_KEYS[currentStepIndex - 1];

    if (previousStepKey) {
      goToStep(previousStepKey);
    }
  }

  function goNext() {
    const nextStepKey = ONBOARDING_STEP_KEYS[currentStepIndex + 1];

    if (nextStepKey) {
      goToStep(nextStepKey);
    }
  }

  async function submitCurrentStep() {
    if (currentStep.kind === "form") {
      const isValid = await form.trigger(currentStep.fields, { shouldFocus: true });

      if (isValid) {
        goNext();
      }

      return;
    }

    if (isLastStep) {
      await finishOnboardingForm();
      return;
    }

    goNext();
  }

  return (
    <main className="fixed inset-0 z-50 flex h-dvh overflow-hidden bg-[#0b0b0b] text-white">
      <nav className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full">
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
              <SparklesIcon aria-hidden="true" className="size-4" />
            </div>
            <span className="hidden text-xs text-white/50 sm:inline">{organizationName}</span>
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="hidden text-right text-xs leading-tight sm:grid">
              <span className="text-white/[0.45]">{m.onboarding_page__signed_in()}</span>
              <span className="max-w-44 truncate text-white/80">{userLabel}</span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium">
              {userLabel.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <section className="relative m-2 hidden w-1/2 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-[#080808] p-8 pt-20 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:12px_12px]" />
        <div className="relative z-10 flex w-full max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Badge
              className="w-fit border-white/10 bg-white/[0.03] text-white/60"
              variant="outline"
            >
              {m.onboarding_page__setup_path()}
            </Badge>
            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-3xl font-medium tracking-normal text-white">
                {organizationName}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-white/[0.55]">
                {m.onboarding_page__setup_path_description()}
              </p>
            </div>
          </div>
          <OnboardingChecklist activeStepKey={currentStepKey} />
        </div>
      </section>

      <section className="flex w-full flex-col items-center overflow-y-auto px-6 pt-18 pb-8 lg:w-1/2 lg:px-12 lg:pt-24">
        <div className="flex min-h-full w-full max-w-md flex-col">
          <div className="mb-6 flex justify-center">
            <div className="h-1 w-32 overflow-hidden bg-white/10">
              <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-8 py-8">
            <div className="flex min-h-32 flex-col gap-4">
              <Badge className="border-white/10 bg-white/[0.03] text-white/60" variant="outline">
                {m.onboarding_page__step()} {currentStepNumber} {m.onboarding_page__of()}{" "}
                {ONBOARDING_STEP_KEYS.length}
              </Badge>
              <div className="flex flex-col gap-3">
                <h1 className="font-serif text-2xl font-medium tracking-normal text-white">
                  {currentStep.title()}
                </h1>
                <p className="text-sm leading-relaxed text-white/[0.55]">
                  {currentStep.description()}
                </p>
              </div>
            </div>

            <FormProvider {...form}>
              <div className={onboardingStepPanelClassName}>
                <StepContent onSubmitCurrentStep={submitCurrentStep} step={currentStep} />
                <OnboardingActions
                  canGoBack={!isFirstStep}
                  isSubmitting={isStepSubmitting}
                  onBack={goBack}
                  onContinue={submitCurrentStep}
                  submitFormId={submitFormId}
                  submitLabel={submitLabel}
                />
              </div>
            </FormProvider>
          </div>
        </div>
      </section>
    </main>
  );
}

function getOnboardingDefaultValues(
  organizationName: string,
  orgSlug: string,
  email: string | null
): OnboardingFormInput {
  return {
    baseCurrencyCode: DEFAULT_ORGANIZATION_SETTINGS.baseCurrencyCode,
    booksStartDate: getDateInputValue(),
    countryCode: DEFAULT_ORGANIZATION_SETTINGS.countryCode,
    fiscalYearStartMonth: DEFAULT_ORGANIZATION_SETTINGS.fiscalYearStartMonth,
    legalName: organizationName,
    orgSlug,
    primaryEmail: email ?? "",
    timezone: DEFAULT_ORGANIZATION_SETTINGS.timezone,
    tradeName: null
  };
}

type StepContentProps = {
  onSubmitCurrentStep: () => Promise<void>;
  step: OnboardingStepDefinition;
};

function StepContent({ onSubmitCurrentStep, step }: StepContentProps) {
  if (step.kind === "form") {
    const FormFields = step.FormFields;

    return (
      <form
        className={onboardingFieldThemeClassName}
        id={ONBOARDING_FORM_ID}
        method="post"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmitCurrentStep();
        }}
      >
        <FormFields />
      </form>
    );
  }

  return <FeatureStepSummary step={step} />;
}

type OnboardingActionsProps = {
  canGoBack: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onContinue: () => Promise<void>;
  submitFormId?: string;
  submitLabel: string;
};

function OnboardingActions({
  canGoBack,
  isSubmitting,
  onBack,
  onContinue,
  submitFormId,
  submitLabel
}: OnboardingActionsProps) {
  const submitButtonType = submitFormId ? "submit" : "button";

  return (
    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
      <Button disabled={!canGoBack} onClick={onBack} type="button" variant="secondary">
        <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
        {m.onboarding_page__previous()}
      </Button>

      <Button
        disabled={isSubmitting}
        form={submitFormId}
        onClick={
          submitFormId
            ? undefined
            : () => {
                void onContinue();
              }
        }
        type={submitButtonType}
      >
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {submitLabel}
        {!isSubmitting ? <ArrowRightIcon aria-hidden="true" data-icon="inline-end" /> : null}
      </Button>
    </div>
  );
}
