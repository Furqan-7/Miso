"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-lg !border !border-border-strong !bg-popover !text-foreground !shadow-xl !shadow-black/40 !text-[13px]",
          description: "!text-muted-foreground",
          error: "!border-destructive/40",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
