import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-muted text-secondary-foreground",
        outline: "border-border-strong text-secondary-foreground",
        brand: "border-brand/25 bg-brand/12 text-brand",
        success: "border-success/25 bg-success/12 text-success",
        warning: "border-warning/25 bg-warning/12 text-warning",
        destructive: "border-destructive/25 bg-destructive/12 text-destructive",
        violet: "border-violet/25 bg-violet/12 text-violet",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
