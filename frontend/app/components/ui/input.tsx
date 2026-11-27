import * as React from "react";
import { cn } from "@/app/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-md border border-input bg-background/60 px-2.5 py-1 text-[13px] text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-subtle-foreground selection:bg-brand/30 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-brand/60 focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
