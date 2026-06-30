import { useLocation, useParams } from "@tanstack/react-router";
import {
  ChartNoAxesColumnIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  NotebookTextIcon,
  ShoppingCartIcon,
  UsersRoundIcon,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

import { m } from "@tsu-stack/i18n/messages";
import { Link, type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@tsu-stack/ui/components/sidebar";

import { getOrgAppLink } from "@/components/app-shell/nav-links";

type NavLeaf = {
  id: string;
  link: LinkProps;
  /** Path fragment that marks this item active. */
  match: string;
  name: string;
};

type NavGroup = {
  icon: LucideIcon;
  id: string;
  items: NavLeaf[];
  /** Path fragments that mark this group as the active section. */
  match: string[];
  name: string;
};

type NavDocumentsProps = {
  showAccounting: boolean;
};

export function NavDocuments({ showAccounting }: NavDocumentsProps) {
  const orgSlug = useParams({
    select: (params) => params.orgSlug,
    strict: false
  });
  const pathname = useLocation({ select: (location) => location.pathname });

  if (!orgSlug || !showAccounting) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu className="gap-0.5">
        {getNavGroups(orgSlug).map((group) => (
          <NavGroupCollapsible group={group} key={group.id} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavGroupCollapsible({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActiveSection = group.match.some((fragment) => pathname.includes(fragment));
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  return (
    <Collapsible onOpenChange={setOpen} open={isActiveSection || open} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        className="group/collapsible"
        render={<SidebarMenuButton aria-label={group.name} tooltip={group.name} />}
      >
        <Icon />
        <span className="font-medium">{group.name}</span>
        <ChevronRightIcon className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[panel-open]/collapsible:rotate-90 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mr-0 gap-0.5 pr-0">
          {group.items.map((item) => (
            <SidebarMenuSubItem key={item.id}>
              <SidebarMenuSubButton
                isActive={pathname.includes(item.match)}
                render={<Link {...item.link} aria-label={item.name} />}
              >
                <span>{item.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getNavGroups(orgSlug: string): NavGroup[] {
  return [
    {
      icon: HandCoinsIcon,
      id: "sales",
      items: [
        {
          id: "invoices",
          link: getOrgAppLink(orgSlug, "/$orgSlug/sales/invoices"),
          match: "/sales/invoices",
          name: m.app_shell__invoices()
        },
        {
          id: "receipts",
          link: getOrgAppLink(orgSlug, "/$orgSlug/sales/receipts"),
          match: "/sales/receipts",
          name: m.app_shell__receipts()
        }
      ],
      match: ["/sales"],
      name: m.app_shell__sales()
    },
    {
      icon: ShoppingCartIcon,
      id: "purchase",
      items: [
        {
          id: "bills",
          link: getOrgAppLink(orgSlug, "/$orgSlug/purchase/bills"),
          match: "/purchase/bills",
          name: m.app_shell__bills()
        },
        {
          id: "payments",
          link: getOrgAppLink(orgSlug, "/$orgSlug/purchase/payments"),
          match: "/purchase/payments",
          name: m.app_shell__payments()
        }
      ],
      match: ["/purchase"],
      name: m.app_shell__purchase()
    },
    {
      icon: UsersRoundIcon,
      id: "records",
      items: [
        {
          id: "parties",
          link: getOrgAppLink(orgSlug, "/$orgSlug/records/parties"),
          match: "/records/parties",
          name: m.app_shell__parties()
        },
        {
          id: "items",
          link: getOrgAppLink(orgSlug, "/$orgSlug/records/items"),
          match: "/records/items",
          name: m.app_shell__items()
        }
      ],
      match: ["/records"],
      name: m.app_shell__records()
    },
    {
      icon: NotebookTextIcon,
      id: "accounting",
      items: [
        {
          id: "journal-register",
          link: getOrgAppLink(orgSlug, "/$orgSlug/accounting/journal-entries"),
          match: "/accounting/journal-entries",
          name: m.app_shell__journal_register()
        },
        {
          id: "chart-of-accounts",
          link: getOrgAppLink(orgSlug, "/$orgSlug/settings/chart-of-accounts"),
          match: "/settings/chart-of-accounts",
          name: m.app_shell__chart_of_accounts()
        }
      ],
      match: ["/accounting/journal-entries", "/settings/chart-of-accounts"],
      name: m.app_shell__accounting()
    },
    {
      icon: ChartNoAxesColumnIcon,
      id: "reports",
      items: [
        {
          id: "trial-balance",
          link: getOrgAppLink(orgSlug, "/$orgSlug/reports/trial-balance"),
          match: "/reports/trial-balance",
          name: m.app_shell__trial_balance()
        },
        {
          id: "general-ledger",
          link: getOrgAppLink(orgSlug, "/$orgSlug/reports/general-ledger"),
          match: "/reports/general-ledger",
          name: m.app_shell__general_ledger()
        }
      ],
      match: ["/reports"],
      name: m.app_shell__reports()
    }
  ];
}
