"use client";

import { Clock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import type { DashboardData, RateRow } from "@/app/types/api";
import { pct } from "../common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const EASE = [0.22, 1, 0.36, 1] as const;

// ------------------------------------------------------------------ sending capacity
export function CapacityCard({ data }: { data: DashboardData }) {
  const c = data.capacity;
  const limit = Math.max(c.limit, c.sent, 1);
  const parts = [
    { key: "Sent", value: c.sent, color: "var(--chart-1)" },
    { key: "Scheduled", value: c.scheduled, color: "var(--chart-2)" },
    { key: "Free", value: c.free, color: "var(--muted-foreground)" },
  ];
  const share = (v: number) => (limit ? v / limit : 0);
  // Visual widths: every non-zero part gets at least 20% so its label fits, then normalise to 100%.
  const raw = parts.map((p) => (p.value > 0 ? Math.max(share(p.value), 0.2) : 0));
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  const width = (i: number) => `${(raw[i] / total) * 100}%`;
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Sending capacity</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Today · resets in {c.resetsInHours}h · {c.mailboxes} {c.mailboxes === 1 ? "mailbox" : "mailboxes"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" /> Today
        </span>
      </div>
      <p className="mt-5 flex items-baseline gap-2">
        <span className="text-[34px] font-semibold leading-none tracking-tight tabular text-foreground">{c.limit}</span>
        <span className="text-[13px] text-muted-foreground">emails you can send today</span>
      </p>

      {c.mailboxes === 0 ? (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          <p>
            Connect Gmail or Outlook in{" "}
            <Link href="/settings?tab=mailboxes" className="text-foreground underline-offset-4 hover:underline">
              Settings
            </Link>{" "}
            to start sending.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col justify-end">
          {/* column guides with labels, like the reference */}
          <div className="relative flex h-[120px]">
            {parts.map((p, i) => (
              <div key={p.key} className="relative h-full border-l border-dashed border-border-strong first:border-l-0" style={{ width: width(i) }}>
                {p.value > 0 && (
                  <span className="absolute left-2 top-0 whitespace-nowrap text-xs">
                    <span className="font-semibold tabular text-foreground">{pct(share(p.value))}</span> <span className="tabular text-subtle-foreground">{p.value}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex h-2.5 gap-[2px]" role="img" aria-label={`Sent ${c.sent}, scheduled ${c.scheduled}, free ${c.free} of ${c.limit}`}>
            {parts.map(
              (p, i) =>
                p.value > 0 && (
                  <Tooltip key={p.key}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={cn("h-full rounded-[3px]", p.key === "Free" && "hatch bg-muted")}
                        style={{ background: p.key === "Free" ? undefined : p.color }}
                        initial={{ width: 0 }}
                        animate={{ width: width(i) }}
                        transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {p.key}: {p.value} of {c.limit}
                    </TooltipContent>
                  </Tooltip>
                ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {parts.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", p.key === "Free" && "bg-muted-foreground")} style={{ background: p.key === "Free" ? undefined : p.color }} />
                {p.key}
              </span>
            ))}
            {c.paused && <span className="text-warning">Sending is paused</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ reply rate by audience
type Dim = "companySize" | "contactRole" | "tone" | "step";
const DIMS: { id: Dim; label: string }[] = [
  { id: "companySize", label: "Company size" },
  { id: "contactRole", label: "Who you emailed" },
  { id: "tone", label: "Tone" },
  { id: "step", label: "Sequence step" },
];
const LABEL: Record<string, string> = { startup: "Startups", scaleup: "Scale-ups", mnc: "MNCs", unknown: "Unknown", founder: "Founders", cto: "CTOs", hiring_manager: "Hiring mgrs", recruiter: "Recruiters", engineer: "Engineers", other: "Other", casual: "Casual", formal: "Formal", initial: "First email" };
/** Fixed entity → slot so a bar keeps its colour across filters (never assigned by rank). */
const SLOT: Record<string, string> = {
  startup: "var(--chart-1)", scaleup: "var(--chart-2)", mnc: "var(--chart-3)", unknown: "var(--chart-4)",
  founder: "var(--chart-1)", cto: "var(--chart-2)", hiring_manager: "var(--chart-3)", recruiter: "var(--chart-4)",
  casual: "var(--chart-1)", formal: "var(--chart-2)", initial: "var(--chart-1)", "follow-up 1": "var(--chart-2)", "follow-up 2": "var(--chart-3)", "follow-up 3": "var(--chart-4)",
};
const label = (k: string) => LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

export function PerformanceCard({ data }: { data: DashboardData }) {
  const [dim, setDim] = useState<Dim>("companySize");
  const rows: RateRow[] = [...data.performance[dim]].filter((r) => r.sent > 0).sort((a, b) => b.sent - a.sent).slice(0, 4);
  const avg = data.performance.overallReplyRate;
  const max = Math.max(avg, ...rows.map((r) => r.replyRate), 0.05) * 1.25;
  const best = rows.reduce<RateRow | null>((b, r) => (!b || r.replyRate > b.replyRate ? r : b), null);
  const H = 168;

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Reply rate by audience</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Replies ÷ delivered emails · last 90 days</p>
        </div>
        <Select value={dim} onValueChange={(v) => setDim(v as Dim)}>
          <SelectTrigger size="sm" aria-label="Group by" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {DIMS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Send a few emails and this shows who replies to you most.</div>
      ) : (
        <>
          <div className="relative mt-5" style={{ height: H }}>
            {/* average line */}
            <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/40" style={{ bottom: `${(avg / max) * 100}%` }}>
              <span className="absolute -top-2.5 right-0 rounded bg-card px-1 text-[10px] text-muted-foreground">Avg {pct(avg)}</span>
            </div>
            <div className="flex h-full items-end gap-2.5">
              {rows.map((r, i) => (
                <Tooltip key={r.key}>
                  <TooltipTrigger asChild>
                    <div className="hatch relative flex h-full flex-1 items-end rounded-md">
                      {best?.key === r.key && rows.length > 1 && (
                        <span className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground" style={{ bottom: `calc(${(r.replyRate / max) * 100}% + 6px)` }}>
                          Best
                        </span>
                      )}
                      {(() => {
                        const h = r.replyRate > 0 ? Math.max((r.replyRate / max) * 100, 6) : 2;
                        const inside = h >= 18;
                        return (
                          <motion.div
                            className="relative w-full rounded-md"
                            style={{ background: SLOT[r.key] ?? "var(--chart-4)" }}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.9, delay: i * 0.07, ease: EASE }}
                          >
                            <span className={cn("absolute left-2 text-[11px] font-semibold tabular", inside ? "bottom-1.5 text-white" : "bottom-full mb-1 text-foreground")}>{pct(r.replyRate)}</span>
                          </motion.div>
                        );
                      })()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {label(r.key)}: {r.replies} replies from {r.sent} emails ({pct(r.replyRate)}), {r.positive} positive
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex gap-2.5">
            {rows.map((r) => (
              <span key={r.key} className="flex flex-1 items-center justify-center gap-1.5 truncate text-[11px] text-secondary-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ background: SLOT[r.key] ?? "var(--chart-4)" }} />
                <span className="truncate">{label(r.key)}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
