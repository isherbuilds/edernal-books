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
      name: "Journal register",
      link: getOrgAppLink(orgSlug, "/$orgSlug/accounting/journal-entries"),
      icon: <DatabaseIcon />
    },
    {
      name: "Trial balance",
      link: getOrgAppLink(orgSlug, "/$orgSlug/reports/trial-balance"),
      icon: <FileChartColumnIcon />
    },
    {
      name: "General ledger",
      link: getOrgAppLink(orgSlug, "/$orgSlug/reports/general-ledger"),
      icon: <FileTextIcon />
    },
    {
      name: "Chart of accounts",
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/chart-of-accounts"),
      icon: <FolderIcon />
    },
    {
      name: "Accounting periods",
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/accounting-periods"),
      icon: <FolderIcon />
    }
  ];
}

function getOrgAppLink(
  orgSlug: string,
  to:
    | "/$orgSlug/accounting/journal-entries"
    | "/$orgSlug/reports/general-ledger"
    | "/$orgSlug/reports/trial-balance"
    | "/$orgSlug/settings/accounting-periods"
    | "/$orgSlug/settings/chart-of-accounts"
): LinkProps {
  return {
    params: {
      orgSlug
    },
    to
  };
}
