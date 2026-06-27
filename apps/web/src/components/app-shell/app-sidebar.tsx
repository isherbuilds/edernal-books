import { SquareLibraryIcon } from "lucide-react";
import { type ComponentProps } from "react";

import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@tsu-stack/ui/components/sidebar";

import { NavDocuments } from "@/components/app-shell/nav-documents";
import { NavMain } from "@/components/app-shell/nav-main";
import { NavSecondary } from "@/components/app-shell/nav-secondary";
import { NavUser } from "@/components/app-shell/nav-user";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  showAccounting: boolean;
};

export function AppSidebar({ showAccounting, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/" aria-label="Edernal Books" />}
            >
              <SquareLibraryIcon />
              <span className="text-base font-semibold">Edernal Books</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain showAccounting={showAccounting} />
        <NavDocuments showAccounting={showAccounting} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
