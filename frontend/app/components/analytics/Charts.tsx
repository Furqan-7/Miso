"use client";

import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import type { RateRow } from "@/app/types/api";
import { pct } from "@/app/components/common";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";

const SERIES = [
  { key: "sent", label: "Sent", color: "var(--chart-1)" },
  { key: "replies", label: "Replies", color: "var(--chart-3)" },
] as const;

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function TimelineTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  const v = (k: string) => Number(payload.find((p) => p.dataKey === k)?.value ?? 0);
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="mb-1.5 font-medium text-foreground">{fmtDay(label)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 text-secondary-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="font-medium tabular text-foreground">{v(s.key)}</span>
        </p>
      ))}
      {v("sent") > 0 && <p className="mt-1.5 border-t pt-1.5 text-subtle-foreground">Reply rate {pct(v("replies") / v("sent"))}</p>}
    </div>
  );
}

/** Daily outreach volume: two areas (sent, replies) on one count axis, legend + hover tooltip. */
export function TimelineChart({ data }: { data: { date: string; sent: number; replies: number }[] }) {
  if (!data.length) return <p className="p-6 text-[13px] text-muted-foreground">No emails sent in this period yet.</p>;
  const totals = { sent: data.reduce((a, d) => a + d.sent, 0), replies: data.reduce((a, d) => a + d.replies, 0) };
  return (
    <figure className="px-4 pb-3 pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-5 px-1 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="font-semibold tabular text-foreground">{totals[s.key]}</span>
          </span>
        ))}
      </div>
      <div className="h-[220px]" role="img" aria-label={`Emails sent and replies per day over ${data.length} days: ${totals.sent} sent, ${totals.replies} replies`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" tickFormatter={fmtDay} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "var(--subtle-foreground)", fontSize: 11 }} dy={6} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--subtle-foreground)", fontSize: 11 }} />
            <ChartTooltip content={<TimelineTooltip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
            {SERIES.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} animationDuration={900} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Daily emails sent and replies received.</figcaption>
    </figure>
  );
}

/** Reply rate per group as horizontal bars on a hatched track; value printed at the end, details on hover. */
export function RateBars({ rows, label, color = "var(--chart-1)" }: { rows: RateRow[]; label: (k: string) => string; color?: string }) {
  const visible = rows.filter((r) => r.sent > 0).slice(0, 6);
  if (!visible.length) return <p className="px-4 py-8 text-center text-xs text-muted-foreground">Not enough data yet.</p>;
  const max = Math.max(0.01, ...visible.map((r) => r.replyRate));
  return (
    <ul className="space-y-3 p-4" aria-label="Reply rate by group">
      {visible.map((r, i) => (
        <Tooltip key={r.key}>
          <TooltipTrigger asChild>
            <li tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-secondary-foreground">{label(r.key)}</span>
                <span className="shrink-0 tabular">
                  <span className="font-semibold text-foreground">{pct(r.replyRate)}</span> <span className="text-subtle-foreground">of {r.sent}</span>
                </span>
              </div>
              <div className="hatch h-2 overflow-hidden rounded-[4px]">
                <motion.div className="h-full rounded-[4px]" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${r.replyRate > 0 ? Math.max(3, (r.replyRate / max) * 100) : 0}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </li>
          </TooltipTrigger>
          <TooltipContent>
            {label(r.key)}: {r.sent} sent · {r.opens} opened ({pct(r.openRate)}) · {r.replies} replied · {r.positive} positive
          </TooltipContent>
        </Tooltip>
      ))}
    </ul>
  );
}
