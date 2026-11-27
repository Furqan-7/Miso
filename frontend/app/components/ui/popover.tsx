"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => <PopoverPrimitive.Root data-slot="popover" {...props} />;
const PopoverTrigger = (props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;

function PopoverContent({ className, align = "center", sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-xl border border-border-strong bg-popover p-3 text-popover-foreground shadow-xl shadow-black/40 outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
