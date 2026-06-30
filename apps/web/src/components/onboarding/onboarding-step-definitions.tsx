import { CheckIcon } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";
import { Badge } from "@tsu-stack/ui/components/badge";
import { cn } from "@tsu-stack/ui/lib/utils";

import { type OnboardingStepKey, ONBOARDING_STEP_KEYS } from "@/utils/onboarding";

import {
  type OnboardingFeatureStepDefinition,
  onboardingStepDefinitions
} from "@/components/onboarding/onboarding-step-model";

export function FeatureStepSummary({ step }: { step: OnboardingFeatureStepDefinition }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3">
        {step.summaryItems.map((itemMessage) => {
          const item = itemMessage();

          return (
            <div className="grid grid-cols-[20px_1fr] items-start gap-3" key={item}>
              <span className="mt-0.5 flex size-5 items-center justify-center rounded-full border border-white/10 bg-white text-black">
                <CheckIcon aria-hidden="true" className="size-3" />
              </span>
              <span className="text-sm leading-relaxed text-white/65">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OnboardingChecklist({ activeStepKey }: { activeStepKey: OnboardingStepKey }) {
  const activeStepIndex = ONBOARDING_STEP_KEYS.indexOf(activeStepKey);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="absolute top-3 bottom-3 left-3 w-px bg-white/10" />
      {onboardingStepDefinitions.map((step) => {
        const Icon = step.icon;
        const stepIndex = ONBOARDING_STEP_KEYS.indexOf(step.key);
        const isActive = step.key === activeStepKey;
        const isComplete = stepIndex < activeStepIndex;

        return (
          <div className="relative grid grid-cols-[24px_1fr] gap-5" key={step.key}>
            <div
              className={cn(
                "z-10 flex size-6 items-center justify-center rounded-full border bg-[#0b0b0b]",
                isComplete && "border-white bg-white text-black",
                isActive && "border-white text-white",
                !isActive && !isComplete && "border-white/20 text-white/30"
              )}
            >
              {isComplete ? (
                <CheckIcon aria-hidden="true" className="size-3.5" />
              ) : (
                <Icon aria-hidden="true" className="size-3.5" />
              )}
            </div>
            <div className={cn("flex flex-col gap-1 pb-2", !isActive && "opacity-45")}>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">{step.title()}</h2>
                <Badge className="border-white/10 bg-white/[0.03] text-white/40" variant="outline">
                  {step.kind === "form"
                    ? m.onboarding_page__form_step()
                    : m.onboarding_page__feature_step()}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-white/[0.45]">{step.description()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
