"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { buttonVariants } from "../ui/button";
import { cn } from "@/app/lib/utils";
import { DashboardPreview } from "./DashboardPreview";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.4, 1]);

  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      {/* backdrop: dot grid + one restrained glow */}
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-280px] h-[560px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(76,141,255,0.28),rgba(164,139,255,0.12)_55%,transparent)] blur-2xl" />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <Link href="/auth/signup" className="group inline-flex items-center gap-2 rounded-full border border-border-strong bg-card/70 py-1 pl-1 pr-3 text-[12px] text-secondary-foreground backdrop-blur transition hover:border-foreground/30">
            <span className="rounded-full bg-brand/15 px-2 py-0.5 font-medium text-brand">New</span>
            Replies sorted automatically in Gmail and Outlook
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.h1
          className="display mx-auto mt-7 max-w-4xl text-[44px] text-foreground sm:text-[68px] lg:text-[84px]"
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.05, ease: EASE }}
        >
          Your job search,
          <br />
          <span className="bg-gradient-to-b from-foreground via-foreground/80 to-foreground/35 bg-clip-text text-transparent">on autopilot.</span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        >
          JobPilot finds roles that fit you, finds the founder or hiring manager, writes an email that points to your best project, and follows up from your own inbox until they reply.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
        >
          <Link href="/auth/signup" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}>
            Start free with your resume
          </Link>
          <a href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full bg-transparent px-5")}>
            See how it works <ArrowUpRight />
          </a>
        </motion.div>
        <p className="mt-4 text-[12px] text-subtle-foreground">Free plan · No card · Every email goes from your own Gmail or Outlook</p>
      </div>

      <div ref={frame} className="relative mx-auto mt-16 max-w-6xl px-4 [perspective:1600px] sm:mt-20 sm:px-6">
        <motion.div style={{ rotateX, scale, opacity, transformOrigin: "50% 0%" }} className="relative">
          <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(76,141,255,0.18),transparent_70%)] blur-2xl" />
          <div className="relative rounded-[20px] border border-border-strong bg-card/60 p-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
            <div className="h-[420px] sm:h-[480px] lg:h-[540px]">
              <DashboardPreview />
            </div>
          </div>
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>
    </section>
  );
}
