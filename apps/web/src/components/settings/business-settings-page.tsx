import { Building2Icon } from "lucide-react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { Container } from "@tsu-stack/ui/components/container";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import {
  useBusinessSettingsQuery,
  useUpsertBusinessSettingsMutation
} from "@/hooks/use-business-settings";

type BusinessSettingsPageProps = {
  canManageSettings: boolean;
  orgSlug: string;
};

export function BusinessSettingsPage({ canManageSettings, orgSlug }: BusinessSettingsPageProps) {
  const settingQuery = useBusinessSettingsQuery(orgSlug);
  const upsertSetting = useUpsertBusinessSettingsMutation(orgSlug, {
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : m.business_settings__save_failed());
    },
    onSuccess: () => {
      toast.success(m.business_settings__saved());
    }
  });

  return (
    <Container className="flex max-w-5xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2Icon aria-hidden="true" className="size-4" />
          {orgSlug}
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">
          {m.business_settings_page__title()}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {m.business_settings_page__description()}
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{m.business_settings_page__form_title()}</CardTitle>
          <CardDescription>{m.business_settings_page__form_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          {settingQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : settingQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="text-sm font-medium text-destructive">
                {m.business_settings__save_failed()}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {settingQuery.error instanceof Error
                  ? settingQuery.error.message
                  : m.business_settings__invalid_input()}
              </p>
            </div>
          ) : (
            <BusinessSettingsForm
              key={settingQuery.data?.updatedAt ?? orgSlug}
              disabled={upsertSetting.isPending || !canManageSettings}
              onSubmit={async (input) => {
                await upsertSetting.mutateAsync(input);
              }}
              orgSlug={orgSlug}
              setting={settingQuery.data}
              submitLabel={
                upsertSetting.isPending
                  ? m.business_settings__saving()
                  : m.business_settings__save()
              }
            />
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
