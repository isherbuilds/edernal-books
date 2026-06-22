import { CircleHelpIcon, SearchIcon, Settings2Icon } from "lucide-react";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { m } from "@tsu-stack/i18n/messages";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@tsu-stack/ui/components/sidebar";

export function NavSecondary({ ...props }: ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const items = getSecondaryNavigation();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton render={<a href={item.url} aria-label={item.title} />}>
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

function getSecondaryNavigation(): {
  icon: ReactNode;
  title: string;
  url: string;
}[] {
  return [
    {
      title: m.app_shell__settings(),
      url: "#",
      icon: <Settings2Icon />
    },
    {
      title: m.app_shell__get_help(),
      url: "#",
      icon: <CircleHelpIcon />
    },
    {
      title: m.app_shell__search(),
      url: "#",
      icon: <SearchIcon />
    }
  ];
}
