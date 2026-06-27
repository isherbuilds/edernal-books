import { type z } from "zod";

import {
  type CompleteOrganizationOnboardingInput,
  type CompleteOrganizationOnboardingInputSchema
} from "@tsu-stack/core/organizations";

export const ONBOARDING_STEP_KEYS = [
  "business-details",
  "business-contact",
  "foundation-gate",
  "workspace-ready"
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export type OnboardingFormInput = z.input<typeof CompleteOrganizationOnboardingInputSchema>;
export type OnboardingFormValues = CompleteOrganizationOnboardingInput;
