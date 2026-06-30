"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

export { CollapsibleContent } from "@tsu-stack/ui/components/collapsible-content";
export { CollapsibleTrigger } from "@tsu-stack/ui/components/collapsible-trigger";
export { Collapsible };
