import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[color,background-color,border-color,box-shadow,opacity] outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset] hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-border-strong bg-card text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-secondary-foreground hover:bg-accent hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 has-[>svg]:px-2.5",
        sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs has-[>svg]:px-2",
        lg: "h-10 rounded-lg px-5 text-sm has-[>svg]:px-4",
        icon: "size-8",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
