import * as React from "react";
import { cn } from "@/app/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-background/60 px-2.5 py-2 text-[13px] leading-relaxed text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-subtle-foreground focus-visible:border-brand/60 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
