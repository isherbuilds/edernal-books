import { type ReactNode } from "react";

import { Separator } from "@tsu-stack/ui/components/separator";
import { SidebarTrigger } from "@tsu-stack/ui/components/sidebar";

type SiteHeaderProps = {
  title?: ReactNode;
};

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1.5 text-muted-foreground" />
      <Separator
        className="mx-1 data-vertical:h-4 data-vertical:self-auto"
        orientation="vertical"
      />
      {title ? (
        <span className="truncate text-sm font-medium">{title}</span>
      ) : (
        <span className="truncate text-sm font-medium text-muted-foreground">Edernal Books</span>
      )}
    </header>
  );
}
