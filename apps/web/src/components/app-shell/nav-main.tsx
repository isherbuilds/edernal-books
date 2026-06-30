import { useLocation, useParams } from "@tanstack/react-router";
import { CirclePlusIcon, LayoutDashboardIcon } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@tsu-stack/ui/components/sidebar";

import { getOrgAppLink } from "@/components/app-shell/nav-links";

export function NavMain() {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });
  const pathname = useLocation({ select: (location) => location.pathname });

  if (!orgSlug) {
    return null;
  }

  const isDashboardActive = pathname.replace(/\/$/, "").endsWith(`/${orgSlug}`);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-disabled="true"
              className="bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              disabled
              tooltip={m.app_shell__new_entry()}
            >
              <CirclePlusIcon />
              <span>{m.app_shell__new_entry()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isDashboardActive}
              render={<Link {...getOrgAppLink(orgSlug, "/$orgSlug")} />}
              tooltip={m.navbar__dashboard()}
            >
              <LayoutDashboardIcon />
              <span>{m.navbar__dashboard()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
