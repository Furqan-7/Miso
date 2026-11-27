import { cn } from "@/app/lib/utils";

/** JobPilot mark: a send arrow cutting through a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" fill="#F4F4F5" />
      <path d="M9 21.5 22.5 9.5M22.5 9.5h-8.25M22.5 9.5v8.25" stroke="#0A0A0B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">JobPilot</span>
    </span>
  );
}
