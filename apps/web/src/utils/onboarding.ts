import { type z } from "zod";

import {
  type UpsertOrganizationSettingInputSchema,
  type UpsertOrganizationSettingInput
} from "@tsu-stack/core/organizations";

export const ONBOARDING_STEP_KEYS = [
  "business-details",
  "business-contact",
  "foundation-gate",
  "workspace-ready"
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export type OnboardingFormInput = z.input<typeof UpsertOrganizationSettingInputSchema>;
export type OnboardingFormValues = UpsertOrganizationSettingInput;
