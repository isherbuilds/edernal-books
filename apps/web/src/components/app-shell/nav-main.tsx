import { useParams } from "@tanstack/react-router";
import {
  CirclePlusIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  MailIcon,
  ReceiptTextIcon,
  Settings2Icon,
  UsersIcon,
  WalletCardsIcon
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

export function NavMain() {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });

  if (!orgSlug) {
    return null;
  }

  const items = getMainNavigation(orgSlug);

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
            <SidebarMenuItem key={item.title}>
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

function getMainNavigation(orgSlug: string): {
  icon?: ReactNode;
  link: LinkProps;
  title: string;
}[] {
  const dashboardLink = getOrgAppLink(orgSlug, "/$orgSlug");

  return [
    {
      title: m.navbar__dashboard(),
      link: dashboardLink,
      icon: <LayoutDashboardIcon />
    },
    {
      title: m.app_shell__business_settings(),
      link: getOrgAppLink(orgSlug, "/$orgSlug/settings/business"),
      icon: <Settings2Icon />
    },
    {
      title: m.app_shell__invoices(),
      link: dashboardLink,
      icon: <ReceiptTextIcon />
    },
    {
      title: m.app_shell__banking(),
      link: dashboardLink,
      icon: <LandmarkIcon />
    },
    {
      title: m.app_shell__expenses(),
      link: dashboardLink,
      icon: <WalletCardsIcon />
    },
    {
      title: m.app_shell__customers(),
      link: dashboardLink,
      icon: <UsersIcon />
    }
  ];
}

function getOrgAppLink(
  orgSlug: string,
  to: "/$orgSlug" | "/$orgSlug/settings/business"
): LinkProps {
  return {
    params: {
      orgSlug
    },
    to
  };
}
