import { useParams } from "@tanstack/react-router";
import {
  CirclePlusIcon,
  LayoutDashboardIcon,
  MailIcon,
  NotebookTabsIcon,
  Settings2Icon
} from "lucide-react";
import { type ReactNode } from "react";

import { m } from "@tsu-stack/i18n/messages";
import { Link, type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@tsu-stack/ui/components/sidebar";

import { getOrgAppLink } from "@/components/app-shell/nav-links";

type NavMainProps = {
  showAccounting: boolean;
};

export function NavMain({ showAccounting }: NavMainProps) {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });

  if (!orgSlug) {
    return null;
  }

  const items = getMainNavigation(orgSlug, showAccounting);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              aria-disabled="true"
              disabled
              tooltip={m.app_shell__new_entry()}
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <CirclePlusIcon />
              <span>{m.app_shell__new_entry()}</span>
            </SidebarMenuButton>
            <Button
              aria-disabled="true"
              disabled
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon />
              <span className="sr-only">{m.app_shell__inbox_documents()}</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton render={<Link {...item.link} />} tooltip={item.title}>
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

type MainNavigationItem = {
  icon?: ReactNode;
  key: string;
  link: LinkProps;
  title: ReturnType<typeof m.navbar__dashboard>;
};

function getMainNavigation(orgSlug: string, showAccounting: boolean): MainNavigationItem[] {
  const items: MainNavigationItem[] = [
    {
      key: "dashboard",
      title: m.navbar__dashboard(),
      link: getOrgAppLink(orgSlug, "/$orgSlug"),
      icon: <LayoutDashboardIcon />
    },
    {
      key: "business-settings",
      title: m.app_shell__business_settings(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/business"),
      icon: <Settings2Icon />
    }
  ];

  if (showAccounting) {
    items.push({
      key: "journal-entries",
      title: m.app_shell__ledger(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/accounting/journal-entries"),
      icon: <NotebookTabsIcon />
    });
  }

  return items;
}
