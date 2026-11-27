"use client";

import { BarChart3, Briefcase, Inbox, LayoutDashboard, Search, Send, Settings, SquareKanban } from "lucide-react";
import { motion } from "motion/react";
import { LogoMark } from "../Logo";

/** Illustrative, static mini version of the dashboard for the hero (sample data). */
const BARS = [
  { label: "Startups", v: 0.34, color: "var(--chart-1)" },
  { label: "Scale-ups", v: 0.21, color: "var(--chart-2)" },
  { label: "Founders", v: 0.41, color: "var(--chart-3)" },
  { label: "MNCs", v: 0.09, color: "var(--chart-4)" },
];

const ACTIVITY = [
  { who: "Riya K.", what: "replied: interested", pill: "Reply", tone: "bg-success" },
  { who: "PayNest", what: "follow-up 1 scheduled for 10:00 their time", pill: "Scheduled", tone: "bg-brand" },
  { who: "Sam L.", what: "asked for your resume", pill: "Resume", tone: "bg-violet" },
  { who: "Lumen AI", what: "moved to Interview", pill: "Interview", tone: "bg-warning" },
];

export function DashboardPreview() {
  return (
    <div className="grid h-full grid-cols-[38px_1fr] overflow-hidden rounded-[14px] border border-border-strong bg-background text-[10px] text-secondary-foreground sm:grid-cols-[38px_150px_1fr] lg:grid-cols-[38px_150px_1fr_190px]">
      {/* rail */}
      <div className="flex flex-col items-center gap-3 border-r bg-sidebar py-3">
        <LogoMark className="size-5" />
        {[LayoutDashboard, Briefcase, Send, Inbox, SquareKanban, BarChart3].map((I, i) => (
          <I key={i} className={i === 0 ? "size-3.5 text-foreground" : "size-3.5 text-subtle-foreground"} />
        ))}
        <Settings className="mt-auto size-3.5 text-subtle-foreground" />
      </div>
      {/* sidebar */}
      <div className="hidden flex-col gap-1 border-r bg-sidebar p-2.5 sm:flex">
        <p className="mb-1 font-medium text-foreground">Workspace</p>
        {["Today", "Jobs", "Outreach", "Inbox", "Tracker"].map((n, i) => (
          <div key={n} className={i === 0 ? "rounded bg-accent px-2 py-1 text-foreground" : "px-2 py-1"}>
            {n}
          </div>
        ))}
        <p className="mb-1 mt-3 text-[9px] uppercase tracking-wide text-subtle-foreground">Pipeline</p>
        {[
          ["Found", "bg-muted-foreground", 18],
          ["Emailed", "bg-brand", 12],
          ["Replied", "bg-success", 5],
          ["Interview", "bg-warning", 2],
        ].map(([n, c, k]) => (
          <div key={n as string} className="flex items-center gap-2 px-2 py-0.5">
            <span className={`size-1.5 rounded-full ${c}`} />
            {n}
            <span className="ml-auto tabular text-subtle-foreground">{k}</span>
          </div>
        ))}
      </div>
      {/* main */}
      <div className="flex min-w-0 flex-col gap-2.5 p-3">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-semibold text-foreground">Your job search</p>
          <span className="ml-auto flex items-center gap-1 rounded-full border px-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-success" /> Live
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-subtle-foreground">
          <Search className="size-3" /> Search jobs, companies, people
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Emails sent", "48", "+12 this week"],
            ["Replies", "9", "3 need you"],
            ["New matches", "26", "+8 today"],
          ].map(([l, v, h]) => (
            <div key={l} className="rounded-lg border bg-card p-2">
              <p className="text-muted-foreground">{l}</p>
              <p className="mt-1 text-[18px] font-semibold leading-none tabular text-foreground">{v}</p>
              <p className="mt-1 text-success">{h}</p>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border bg-card p-2">
            <p className="font-medium text-foreground">Reply rate by audience</p>
            <div className="mt-2 flex min-h-[80px] flex-1 items-end gap-2">
              {BARS.map((b, i) => (
                <div key={b.label} className="hatch flex h-full flex-1 items-end overflow-hidden rounded-[4px]">
                  <motion.div
                    className="w-full rounded-[4px]"
                    style={{ background: b.color }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${Math.max(12, (b.v / 0.45) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2 text-[9px] text-subtle-foreground">
              {BARS.map((b) => (
                <span key={b.label} className="flex-1 truncate text-center">{b.label}</span>
              ))}
            </div>
          </div>
          <div className="hidden flex-col rounded-lg border bg-card p-2 md:flex">
            <p className="font-medium text-foreground">Recent activity</p>
            <ul className="mt-1.5 space-y-1.5">
              {ACTIVITY.map((a) => (
                <li key={a.who} className="flex items-center gap-1.5">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] text-foreground">{a.who[0]}</span>
                  <span className="truncate">
                    <span className="text-foreground">{a.who}</span> {a.what}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full border px-1 py-px text-[8px]">
                    <span className={`size-1 rounded-full ${a.tone}`} />
                    {a.pill}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto rounded-md border border-dashed border-border-strong p-2 text-subtle-foreground">
              <span className="text-foreground">Your week, summarized</span> · 9 replies, 2 interviews. Startups reply 3.4× more than MNCs for you.
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          <p className="border-b px-2 py-1.5 font-medium text-foreground">Today&apos;s matches</p>
          {[
            [94, "Frontend Engineering Intern", "PayNest · Remote", "Next.js, TypeScript"],
            [88, "Full-stack Engineer", "Tallyhouse · Remote", "Node.js, PostgreSQL"],
            [81, "AI Engineer (LLM apps)", "Lumen AI · Bangalore", "Python, RAG"],
          ].map(([sc, t, c, k]) => (
            <div key={t as string} className="flex items-center gap-2 border-b px-2 py-1.5 last:border-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-success/70 text-[9px] font-semibold tabular text-foreground">{sc}</span>
              <span className="truncate text-foreground">{t}</span>
              <span className="hidden truncate text-subtle-foreground sm:inline">{c}</span>
              <span className="ml-auto hidden shrink-0 rounded border px-1 text-[9px] text-muted-foreground md:inline">{k}</span>
            </div>
          ))}
        </div>
      </div>
      {/* right panel */}
      <div className="hidden flex-col gap-2 border-l bg-sidebar p-2.5 lg:flex">
        <div className="h-12 rounded-lg bg-[radial-gradient(120%_120%_at_0%_0%,#f6c1e6_0%,#b9a8ff_40%,#8fd3ff_75%,#c9f1e0_100%)]" />
        <div className="-mt-6 ml-2 flex size-10 items-center justify-center rounded-full border-2 border-sidebar bg-muted text-[11px] font-semibold text-foreground">AV</div>
        <p className="text-[12px] font-semibold text-foreground">Asha Verma</p>
        <p className="text-subtle-foreground">Full-stack · open to work</p>
        <div className="rounded-lg border bg-card p-2">
          <div className="flex justify-between">
            <span>Weekly goal</span>
            <span className="tabular text-foreground">72%</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-muted">
            <div className="h-1 w-[72%] rounded-full bg-gradient-to-r from-[#f6a6d8] via-[#a48bff] to-[#3ecf8e]" />
          </div>
        </div>
        <p className="mt-1 font-medium text-foreground">Upcoming</p>
        {["Lumen AI interview · Thu", "Follow up: Tallyhouse", "Weekly recap · Mon"].map((u) => (
          <div key={u} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            {u}
          </div>
        ))}
      </div>
    </div>
  );
}
