"use client";

import { Menu } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import { Logo } from "../Logo";
import { buttonVariants } from "../ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3"
    >
      <nav
        aria-label="Main"
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-2xl border px-3 py-2 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled ? "border-border-strong bg-background/70 backdrop-blur-xl" : "border-transparent bg-transparent",
        )}
      >
        <Link href="/" aria-label="JobPilot home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/auth/signin" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Sign in
          </Link>
          <Link href="/auth/signup" className={cn(buttonVariants(), "rounded-full px-4")}>
            Get started
          </Link>
          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label="Open menu">
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo />
              <div className="mt-6 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href} className="rounded-lg px-2 py-2 text-sm text-secondary-foreground hover:bg-accent">
                    {l.label}
                  </a>
                ))}
                <Link href="/auth/signin" className="rounded-lg px-2 py-2 text-sm text-secondary-foreground hover:bg-accent">
                  Sign in
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
