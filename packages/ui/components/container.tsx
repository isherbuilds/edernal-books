import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("container mx-auto p-4", className)}>{children}</div>;
}
