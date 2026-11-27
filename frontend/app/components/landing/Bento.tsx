"use client";

import { Check, CircleCheck, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";
import { SectionHeading, Stagger, StaggerItem } from "./motion";

function Tile({ title, body, children, className }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <StaggerItem className={cn("group relative overflow-hidden rounded-2xl border bg-card p-5 transition-colors hover:border-border-strong", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(400px_circle_at_var(--x,50%)_0%,rgba(76,141,255,0.08),transparent_60%)]" />
      <div className="relative min-h-[170px]">{children}</div>
      <h3 className="relative mt-5 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="relative mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </StaggerItem>
  );
}

function MatchVisual() {
  const reasons = ["Matches your Next.js and PostgreSQL", "Remote, as you prefer", "Open to freshers"];
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--muted)" strokeWidth="6" />
          <motion.circle cx="50" cy="50" r="44" fill="none" stroke="var(--success)" strokeWidth="6" strokeLinecap="round" pathLength={1} initial={{ pathLength: 0 }} whileInView={{ pathLength: 0.92 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular text-foreground">92</span>
      </div>
      <ul className="space-y-2">
        {reasons.map((r) => (
          <li key={r} className="flex items-center gap-2 text-[12px] text-secondary-foreground">
            <Check className="size-3.5 text-success" /> {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailVisual() {
  return (
    <div className="rounded-xl border bg-background/60 p-3.5 text-[12px] leading-relaxed text-secondary-foreground">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-subtle-foreground">
        <Mail className="size-3.5" /> To: Riya Kapoor, Co-founder, PayNest
      </div>
      <p>
        Hi Riya, <mark className="rounded bg-brand/15 px-1 text-foreground">congrats on the seed round</mark>. I built{" "}
        <mark className="rounded bg-success/15 px-1 text-foreground">ShopSmart, a checkout with Stripe in Next.js</mark>, which is close to what you&apos;re doing with invoicing…
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Casual", "Formal", "Founder-to-founder"].map((t, i) => (
          <span key={t} className={cn("rounded-full border px-2 py-0.5 text-[10px]", i === 0 ? "border-foreground/40 text-foreground" : "text-subtle-foreground")}>
            {t}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-success">
          <ShieldCheck className="size-3" /> Spam risk: good
        </span>
      </div>
    </div>
  );
}

function SequenceVisual() {
  const steps = [
    { d: "Day 0", t: "First email · 10:00 their time", done: true },
    { d: "Day 3", t: "Follow-up with a new detail", done: true },
    { d: "Day 7", t: "Short bump", done: false },
    { d: "Day 14", t: "Close the loop", done: false },
  ];
  return (
    <ol className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border-strong">
      {steps.map((s, i) => (
        <motion.li key={s.d} className="relative text-[12px]" initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.12 }}>
          <span className={cn("absolute -left-5 top-1 size-[11px] rounded-full border-2", s.done ? "border-brand bg-brand" : "border-border-strong bg-card")} />
          <span className="font-medium text-foreground">{s.d}</span> <span className="text-muted-foreground">{s.t}</span>
        </motion.li>
      ))}
      <li className="relative text-[12px] text-success">
        <span className="absolute -left-5 top-1 size-[11px] rounded-full border-2 border-success bg-success" />
        Reply received: sequence stopped
      </li>
    </ol>
  );
}

function RepliesVisual() {
  const rows = [
    { n: "Interested", c: "bg-success", t: "“Would love to chat next week”" },
    { n: "Asked for resume", c: "bg-violet", t: "“Could you send your CV?”" },
    { n: "Referral", c: "bg-brand", t: "“Reach out to maria@…”" },
    { n: "Out of office", c: "bg-muted-foreground", t: "Follow-ups pushed 5 days" },
  ];
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.n} className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2 text-[12px]">
          <span className={cn("size-1.5 rounded-full", r.c)} />
          <span className="w-28 shrink-0 font-medium text-foreground">{r.n}</span>
          <span className="truncate text-muted-foreground">{r.t}</span>
        </li>
      ))}
    </ul>
  );
}

function PeopleVisual() {
  return (
    <div className="space-y-2">
      {[
        ["Riya Kapoor", "Co-founder & CEO", "riya@paynest.io", "Verified · 96%"],
        ["Dev Malhotra", "CTO", "dev@paynest.io", "Verified · 93%"],
      ].map(([n, t, e, s]) => (
        <div key={n} className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">{n.split(" ").map((x) => x[0]).join("")}</span>
          <div className="min-w-0 text-[12px]">
            <p className="font-medium text-foreground">
              {n} <span className="font-normal text-muted-foreground">· {t}</span>
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">{e}</p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-success">
            <CircleCheck className="size-3" /> {s}
          </span>
        </div>
      ))}
      <p className="pl-1 text-[11px] text-subtle-foreground">Pattern detected: {"{first}"}@paynest.io from 6 public commits</p>
    </div>
  );
}

function DeliverabilityVisual() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["SPF", "DKIM", "DMARC"].map((k, i) => (
        <motion.div key={k} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-background/60 py-5" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.1 }}>
          <CircleCheck className="size-5 text-success" />
          <span className="text-[12px] font-medium text-foreground">{k}</span>
        </motion.div>
      ))}
      <div className="col-span-3 flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2 text-[12px]">
        <span className="text-muted-foreground">Warm-up · day 4</span>
        <span className="tabular text-foreground">9 / 40 today</span>
      </div>
    </div>
  );
}

export function Bento() {
  return (
    <section id="product" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <SectionHeading eyebrow="Product" title={<>Every step from job post<br className="hidden sm:block" /> to offer, handled.</>} body="Not another job board. JobPilot does the slow parts of a good outreach search: research, writing, timing and follow-up." />
      <Stagger className="mt-14 grid gap-4 md:grid-cols-6">
        <Tile className="md:col-span-3" title="Jobs scored against you" body="Roles from ten sources, merged across boards, scam-checked, and scored 0–100 with the reasons spelled out.">
          <MatchVisual />
        </Tile>
        <Tile className="md:col-span-3" title="The right person, verified" body="Founders, CTOs and hiring managers. JobPilot learns each company's email pattern and checks the mailbox before you send.">
          <PeopleVisual />
        </Tile>
        <Tile className="md:col-span-2" title="Emails that sound like you" body="Each draft opens with something specific and ties your closest project to their product.">
          <EmailVisual />
        </Tile>
        <Tile className="md:col-span-2" title="Follow-ups that know when to stop" body="Day 3, 7 and 14, at 10 AM in their time zone, and never after they reply.">
          <SequenceVisual />
        </Tile>
        <Tile className="md:col-span-2" title="Replies, sorted" body="Interested, referral, resume request, out of office. Each comes with a drafted answer.">
          <RepliesVisual />
        </Tile>
        <Tile className="md:col-span-6 lg:col-span-6" title="Built to protect your inbox" body="SPF, DKIM and DMARC checks with setup guides, a warm-up ramp, random gaps between sends, bounce suppression and one-click pause.">
          <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-center">
            <DeliverabilityVisual />
            <div className="flex items-start gap-3 rounded-xl border bg-background/60 p-4 text-[13px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
              <p>
                <span className="font-medium text-foreground">Sends from your own Gmail or Outlook.</span> No shared servers, no spoofed domains. Approve every email, or switch a campaign to autopilot once you trust it.
              </p>
            </div>
          </div>
        </Tile>
      </Stagger>
    </section>
  );
}
