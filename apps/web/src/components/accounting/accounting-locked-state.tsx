import { LockIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

export function AccountingLockedState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-6">
      <Empty className="max-w-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon />
          </EmptyMedia>
          <EmptyTitle>Accounting access required</EmptyTitle>
          <EmptyDescription>
            Owner or accountant role required for accounting reports and journal actions.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
