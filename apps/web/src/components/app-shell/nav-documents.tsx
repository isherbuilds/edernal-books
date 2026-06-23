import {
  DatabaseIcon,
  FileChartColumnIcon,
  FileTextIcon,
  FolderIcon,
  MoreHorizontalIcon,
  ShareIcon,
  Trash2Icon
} from "lucide-react";
import { type ReactNode } from "react";

import { m } from "@tsu-stack/i18n/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@tsu-stack/ui/components/sidebar";

export function NavDocuments() {
  const { isMobile } = useSidebar();
  const items = getDocuments();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{m.app_shell__records()}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<a href={item.url} aria-label={item.name} />}>
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuAction showOnHover className="aria-expanded:bg-muted" />}
              >
                <MoreHorizontalIcon />
                <span className="sr-only">{m.app_shell__more()}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem disabled>
                  <FolderIcon />
                  <span>{m.app_shell__open()}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <ShareIcon />
                  <span>{m.app_shell__share()}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled variant="destructive">
                  <Trash2Icon />
                  <span>{m.app_shell__delete()}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton aria-disabled="true" className="text-sidebar-foreground/70" disabled>
            <MoreHorizontalIcon className="text-sidebar-foreground/70" />
            <span>{m.app_shell__more()}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function getDocuments(): {
  icon: ReactNode;
  name: string;
  url: string;
}[] {
  return [
    {
      name: m.app_shell__ledger(),
      url: "#",
      icon: <DatabaseIcon />
    },
    {
      name: m.app_shell__reports(),
      url: "#",
      icon: <FileChartColumnIcon />
    },
    {
      name: m.app_shell__gst_returns(),
      url: "#",
      icon: <FileTextIcon />
    }
  ];
}
