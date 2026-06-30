import {
  Building2Icon,
  FileCheck2Icon,
  LayoutDashboardIcon,
  MailCheckIcon,
  type LucideIcon
} from "lucide-react";
import { type ComponentType } from "react";
import { type FieldPath } from "react-hook-form";

import { m } from "@tsu-stack/i18n/messages";

import { type OnboardingFormInput, type OnboardingStepKey } from "@/utils/onboarding";

import {
  BusinessContactFields,
  BusinessDetailsFields
} from "@/components/onboarding/onboarding-step-fields";

type OnboardingFeatureItem = () => string;

type OnboardingStepDefinitionBase = {
  description: () => string;
  icon: LucideIcon;
  key: OnboardingStepKey;
  title: () => string;
};

type OnboardingFormStepDefinition = OnboardingStepDefinitionBase & {
  fields: Array<FieldPath<OnboardingFormInput>>;
  FormFields: ComponentType;
  kind: "form";
};

export type OnboardingFeatureStepDefinition = OnboardingStepDefinitionBase & {
  kind: "feature";
  summaryItems: Array<OnboardingFeatureItem>;
};

export type OnboardingStepDefinition =
  | OnboardingFormStepDefinition
  | OnboardingFeatureStepDefinition;

export const onboardingStepDefinitions = [
  {
    description: m.onboarding_page__business_details_description,
    fields: [
      "legalName",
      "tradeName",
      "booksStartDate",
      "initialFiscalYearEndDate",
      "countryCode",
      "baseCurrencyCode"
    ],
    FormFields: BusinessDetailsFields,
    icon: Building2Icon,
    key: "business-details" satisfies OnboardingStepKey,
    kind: "form",
    title: m.onboarding_page__business_details_title
  },
  {
    description: m.onboarding_page__business_contact_description,
    fields: ["primaryEmail", "primaryPhone"],
    FormFields: BusinessContactFields,
    icon: MailCheckIcon,
    key: "business-contact" satisfies OnboardingStepKey,
    kind: "form",
    title: m.onboarding_page__business_contact_title
  },
  {
    description: m.onboarding_page__foundation_gate_description,
    icon: FileCheck2Icon,
    key: "foundation-gate" satisfies OnboardingStepKey,
    kind: "feature",
    summaryItems: [
      m.onboarding_page__foundation_feature_settings,
      m.onboarding_page__foundation_feature_audit,
      m.onboarding_page__foundation_feature_phases
    ],
    title: m.onboarding_page__foundation_gate_title
  },
  {
    description: m.onboarding_page__workspace_ready_description,
    icon: LayoutDashboardIcon,
    key: "workspace-ready" satisfies OnboardingStepKey,
    kind: "feature",
    summaryItems: [
      m.onboarding_page__workspace_feature_dashboard,
      m.onboarding_page__workspace_feature_settings,
      m.onboarding_page__workspace_feature_next
    ],
    title: m.onboarding_page__workspace_ready_title
  }
] satisfies OnboardingStepDefinition[];

export function getOnboardingStepDefinition(stepKey: OnboardingStepKey): OnboardingStepDefinition {
  const step = onboardingStepDefinitions.find((definition) => definition.key === stepKey);

  if (!step) {
    throw new Error(`Unknown onboarding step: ${stepKey}`);
  }

  return step;
}
