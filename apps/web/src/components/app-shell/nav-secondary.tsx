import { useParams } from "@tanstack/react-router";
import { CircleHelpIcon, SearchIcon, Settings2Icon } from "lucide-react";
import { type ComponentPropsWithoutRef } from "react";

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

export function NavSecondary({ ...props }: ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {orgSlug ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link
                    {...getOrgAppLink(orgSlug, "/$orgSlug/settings")}
                    aria-label={m.app_shell__settings()}
                  />
                }
                tooltip={m.app_shell__settings()}
              >
                <Settings2Icon />
                <span>{m.app_shell__settings()}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton aria-label={m.app_shell__search()} tooltip={m.app_shell__search()}>
              <SearchIcon />
              <span>{m.app_shell__search()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={m.app_shell__get_help()}
              tooltip={m.app_shell__get_help()}
            >
              <CircleHelpIcon />
              <span>{m.app_shell__get_help()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
