"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

/** Pill-style multi/single select, used for roles, work modes, sizes. */
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn("flex flex-wrap gap-1.5", className)} {...props} />;
}
function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 text-[13px] text-secondary-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=on]:border-brand/50 data-[state=on]:bg-brand/12 data-[state=on]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
