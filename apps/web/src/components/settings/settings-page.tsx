import { Building2Icon, CalendarDaysIcon, ListTreeIcon, type LucideIcon } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";

import { type OrgAppLinkTo, getOrgAppLink } from "@/components/app-shell/nav-links";
import { PageHeader, PageLayout } from "@/components/page-layout";

type SettingsCard = {
  description: string;
  icon: LucideIcon;
  id: string;
  title: string;
  to: OrgAppLinkTo;
};

type SettingsPageProps = {
  orgSlug: string;
};

export function SettingsPage({ orgSlug }: SettingsPageProps) {
  const cards: SettingsCard[] = [
    {
      description: m.settings_hub__business_description(),
      icon: Building2Icon,
      id: "business",
      title: m.app_shell__business_settings(),
      to: "/$orgSlug/settings/business"
    },
    {
      description: m.settings_hub__periods_description(),
      icon: CalendarDaysIcon,
      id: "periods",
      title: m.app_shell__accounting_periods(),
      to: "/$orgSlug/settings/accounting-periods"
    },
    {
      description: m.settings_hub__chart_description(),
      icon: ListTreeIcon,
      id: "chart",
      title: m.app_shell__chart_of_accounts(),
      to: "/$orgSlug/settings/chart-of-accounts"
    }
  ];

  return (
    <PageLayout>
      <PageHeader description={m.settings_hub__description()} title={m.app_shell__settings()} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              {...getOrgAppLink(orgSlug, card.to)}
              className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-border/80 hover:bg-muted/30"
            >
              <div className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{card.title}</span>
                <span className="text-xs text-muted-foreground">{card.description}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
