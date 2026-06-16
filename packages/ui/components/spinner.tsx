import { Loader2Icon } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"output">) {
  return (
    <output aria-label="Loading" className={cn("size-4", className)} {...props}>
      <Loader2Icon className="size-4 animate-spin" />
    </output>
  );
}

export { Spinner };
