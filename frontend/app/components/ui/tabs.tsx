"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-3", className)} {...props} />;
}
/** Underline tabs, like the reference's Summary / Assigned / Created row. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn("inline-flex h-10 w-full items-center gap-1 overflow-x-auto border-b border-border text-muted-foreground", className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative -mb-px inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-secondary-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-foreground data-[state=active]:text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
