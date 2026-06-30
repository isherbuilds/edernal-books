import { type ReactNode } from "react";

export function DataTableContainer({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border bg-background">{children}</div>;
}
