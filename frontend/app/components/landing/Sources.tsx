"use client";

import { motion, useReducedMotion } from "motion/react";

const SOURCES = ["Greenhouse", "Lever", "Ashby", "Workable", "Y Combinator", "Hacker News · Who's Hiring", "Remotive", "RemoteOK", "Funding news", "X hiring posts"];

/** Infinite marquee of the job sources JobPilot pulls from. */
export function Sources() {
  const reduce = useReducedMotion();
  const row = [...SOURCES, ...SOURCES];
  return (
    <section aria-label="Job sources" className="relative border-y border-border/70 py-8">
      <p className="mb-6 text-center text-[12px] text-subtle-foreground">Pulls fresh roles every few hours from</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <motion.ul
          className="flex w-max gap-12 whitespace-nowrap"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 38, ease: "linear", repeat: Infinity }}
        >
          {row.map((s, i) => (
            <li key={`${s}-${i}`} aria-hidden={i >= SOURCES.length} className="text-[17px] font-semibold tracking-tight text-foreground/45">
              {s}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
