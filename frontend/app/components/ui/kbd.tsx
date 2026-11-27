import { cn } from "@/app/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" className={cn("pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded border border-border-strong bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground", className)} {...props} />;
}

export { Kbd };
