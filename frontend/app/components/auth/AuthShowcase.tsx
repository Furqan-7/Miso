"use client";

import { CalendarCheck, FileText, MailOpen, Reply, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Illustrative feed of what lands in your inbox once JobPilot is running (sample data). */
const EVENTS = [
  { icon: Reply, tone: "text-success bg-success/12", title: "Riya Kapoor replied", meta: "PayNest · Interested", body: "“Would love to chat. Are you free Thursday?”" },
  { icon: FileText, tone: "text-violet bg-violet/12", title: "Sam Lee asked for your resume", meta: "Tallyhouse · Resume request", body: "Draft ready, with your resume attached." },
  { icon: CalendarCheck, tone: "text-warning bg-warning/12", title: "Interview booked", meta: "Lumen AI · Thu 11:00", body: "Prep pack built from your ChatDocs project." },
  { icon: MailOpen, tone: "text-brand bg-brand/12", title: "Follow-up sent", meta: "PixelCraft · Day 3", body: "Sent 10:04 their time, from your Gmail." },
];

export function AuthShowcase() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? EVENTS.length : 2);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setCount((c) => (c >= EVENTS.length ? 2 : c + 1)), 2200);
    return () => clearInterval(t);
  }, [reduce]);
  const visible = EVENTS.slice(0, count).reverse();

  return (
    <aside aria-hidden className="relative hidden overflow-hidden border-l bg-sidebar lg:block">
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
      <div className="absolute left-1/2 top-[18%] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(76,141,255,0.22),rgba(164,139,255,0.08)_60%,transparent)] blur-2xl" />

      <div className="relative flex h-full flex-col justify-center px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card/70 px-2.5 py-1 text-[11px] text-secondary-foreground">
            <Sparkles className="size-3 text-brand" /> While you were away
          </p>
          <div className="mt-6 flex min-h-[380px] flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((e) => (
                <motion.div
                  key={e.title}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.97, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="rounded-xl border border-border-strong bg-card/90 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${e.tone}`}>
                      <e.icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{e.title}</p>
                      <p className="text-[11px] text-subtle-foreground">{e.meta}</p>
                      <p className="mt-2 text-[13px] text-secondary-foreground">{e.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
            Find the role, the person and the words. JobPilot follows up until they reply, then tells you what they said.
          </p>
        </div>
      </div>
    </aside>
  );
}
