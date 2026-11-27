"use client";

import { ArrowDownRight, ArrowUpRight, Info, Inbox, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";
import type { DashboardData } from "@/app/types/api";
import { initials, timeAgo } from "../common";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const EASE = [0.22, 1, 0.36, 1] as const;

function Delta({ value, previous, unit }: { value: number; previous: number; unit: string }) {
  const diff = value - previous;
  if (diff === 0) return <span className="text-muted-foreground">Same as previous {unit}</span>;
  const up = diff > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5", up ? "text-success" : "text-muted-foreground")}>
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {up ? "+" : ""}
      {diff} vs previous {unit}
    </span>
  );
}

function StatCard({ title, help, value, footer, icon, tone, href }: { title: string; help: string; value: number; footer: ReactNode; icon: ReactNode; tone: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border bg-card p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] text-secondary-foreground">
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <span onClick={(e) => e.preventDefault()} className="text-subtle-foreground hover:text-muted-foreground" aria-label={help}>
                <Info className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{help}</TooltipContent>
          </Tooltip>
        </span>
        <span className={cn("flex size-7 items-center justify-center rounded-md", tone)}>{icon}</span>
      </div>
      <motion.p className="mt-4 text-[32px] font-semibold leading-none tracking-tight tabular text-foreground" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        {value}
      </motion.p>
      <p className="mt-2.5 text-xs">{footer}</p>
    </Link>
  );
}

export function OverviewCards({ data }: { data: DashboardData }) {
  const unit = data.days === 7 ? "week" : `${data.days} days`;
  const o = data.overview;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard title="Emails sent" help="First emails and follow-ups that left your mailbox in this period" value={o.sent.value} footer={<Delta value={o.sent.value} previous={o.sent.previous} unit={unit} />} icon={<Send className="size-4" />} tone="bg-chart-1/15 text-chart-1" href="/outreach" />
      <StatCard
        title="Replies"
        help="Real replies (out-of-office excluded) received in this period"
        value={o.replies.value}
        footer={o.replies.needAction ? <span className="text-warning">{o.replies.needAction} waiting for you</span> : <Delta value={o.replies.value} previous={o.replies.previous} unit={unit} />}
        icon={<Inbox className="size-4" />}
        tone="bg-success/15 text-success"
        href="/inbox"
      />
      <StatCard title="New matches" help="Jobs scored 50 or more against your profile in this period" value={o.matches.value} footer={<span className="text-success">+{o.matches.today} in the last 24 hours</span>} icon={<Sparkles className="size-4" />} tone="bg-violet/15 text-violet" href="/jobs" />
    </div>
  );
}

const STAGES: { stage: string; label: string; color: string }[] = [
  { stage: "found", label: "Found", color: "var(--muted-foreground)" },
  { stage: "emailed", label: "Emailed", color: "var(--chart-1)" },
  { stage: "replied", label: "Replied", color: "var(--success)" },
  { stage: "interview", label: "Interview", color: "var(--warning)" },
  { stage: "offer", label: "Offer", color: "var(--violet)" },
];

function Ring({ value, total, color }: { value: number; total: number; color: string }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const frac = total ? value / total : 0;
  return (
    <div className="relative size-9 shrink-0">
      <svg viewBox="0 0 32 32" className="size-9 -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="var(--muted)" strokeWidth="3" />
        <motion.circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(frac, value ? 0.08 : 0)) }} transition={{ duration: 0.9, ease: EASE }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}

export function Workload({ data }: { data: DashboardData }) {
  const total = data.workload.filter((w) => w.stage !== "rejected").reduce((s, w) => s + w.count, 0);
  return (
    <section aria-labelledby="workload-title">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 id="workload-title" className="text-[14px] font-semibold text-foreground">
          Pipeline
        </h2>
        <Link href="/tracker" className="text-xs text-muted-foreground hover:text-foreground">
          {data.activeApplications} open {data.activeApplications === 1 ? "application" : "applications"}
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-border overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
        {STAGES.map((s) => {
          const w = data.workload.find((x) => x.stage === s.stage) ?? { count: 0, companies: [], updatedAt: null };
          return (
            <Link key={s.stage} href="/tracker" className="flex items-center gap-3 border-b px-3.5 py-3 transition-colors hover:bg-accent/50 sm:border-b-0">
              <Ring value={w.count} total={total} color={s.color} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">{s.label}</p>
                <p className="truncate text-[11px] text-subtle-foreground">{w.updatedAt ? timeAgo(w.updatedAt) : "None yet"}</p>
              </div>
              <div className="hidden -space-x-1.5 2xl:flex">
                {w.companies.slice(0, 2).map((c) => (
                  <span key={c} title={c} className="flex size-5 items-center justify-center rounded-full border border-card bg-muted text-[9px] font-semibold text-secondary-foreground">
                    {initials(c)}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
