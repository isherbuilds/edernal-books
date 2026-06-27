import { useParams } from "@tanstack/react-router";
import { DatabaseIcon, FileChartColumnIcon, FileTextIcon, FolderIcon } from "lucide-react";
import { type ReactNode } from "react";

import { m } from "@tsu-stack/i18n/messages";
import { Link, type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@tsu-stack/ui/components/sidebar";

import { getOrgAppLink } from "@/components/app-shell/nav-links";

type NavDocumentsProps = {
  showAccounting: boolean;
};

export function NavDocuments({ showAccounting }: NavDocumentsProps) {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });

  if (!orgSlug || !showAccounting) {
    return null;
  }

  const items = getDocuments(orgSlug);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{m.app_shell__records()}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<Link {...item.link} aria-label={item.name} />}>
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function getDocuments(orgSlug: string): {
  icon: ReactNode;
  link: LinkProps;
  name: string;
}[] {
  return [
    {
      name: m.app_shell__journal_register(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/accounting/journal-entries"),
      icon: <DatabaseIcon />
    },
    {
      name: m.app_shell__trial_balance(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/reports/trial-balance"),
      icon: <FileChartColumnIcon />
    },
    {
      name: m.app_shell__general_ledger(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/reports/general-ledger"),
      icon: <FileTextIcon />
    },
    {
      name: m.app_shell__chart_of_accounts(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/chart-of-accounts"),
      icon: <FolderIcon />
    },
    {
      name: m.app_shell__accounting_periods(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/accounting-periods"),
      icon: <FolderIcon />
    }
  ];
}
