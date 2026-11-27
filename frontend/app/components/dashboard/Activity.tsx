"use client";

import { Building2, Ellipsis, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/app/lib/utils";
import type { DashboardActivity } from "@/app/types/api";
import { Empty, initials, StatusPill, timeAgo } from "../common";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad" | "violet";
type Filter = "all" | "replies" | "emails" | "stages";

const STAGE_LABEL: Record<string, string> = { found: "Found", emailed: "Emailed", replied: "Replied", interview: "Interview", offer: "Offer", rejected: "Closed" };
const REPLY_LABEL: Record<string, [string, Tone]> = {
  interested: ["Interested", "ok"],
  asked_for_resume: ["Resume", "violet"],
  referral: ["Referral", "brand"],
  rejected: ["Not now", "bad"],
  other: ["Reply", "neutral"],
};

function describe(a: DashboardActivity): { text: ReactNode; pill: [string, Tone]; kind: Filter } | null {
  const b = (s: string | null | undefined) => <span className="font-medium text-foreground">{s}</span>;
  const p = a.payload;
  switch (a.type) {
    case "email_sent":
      return { text: <>You emailed {b(a.contact ?? (p.to as string))} at {b(a.company)}{Number(p.step) > 0 ? ` (follow-up ${p.step})` : ""}</>, pill: ["Sent", "brand"], kind: "emails" };
    case "reply": {
      const [l, t] = REPLY_LABEL[String(p.category)] ?? REPLY_LABEL.other;
      return { text: <>{b(a.contact ?? a.company)} replied{p.summary ? `: “${String(p.summary).slice(0, 70)}”` : ""}</>, pill: [l, t], kind: "replies" };
    }
    case "stage_changed": {
      const to = String(p.to);
      if (to === "emailed") return null; // implied by the "You emailed …" row
      return { text: <>Moved {b(a.company)} to {b(STAGE_LABEL[to] ?? to)}</>, pill: [STAGE_LABEL[to] ?? to, to === "interview" ? "warn" : to === "offer" ? "ok" : to === "rejected" ? "bad" : "neutral"], kind: "stages" };
    }
    case "interview_scheduled":
      return { text: <>Interview booked with {b(a.company)}</>, pill: ["Interview", "warn"], kind: "stages" };
    case "manual_apply":
      return { text: <>You applied to {b(a.company)}{p.via ? ` via ${p.via}` : ""}</>, pill: ["Applied", "neutral"], kind: "stages" };
    case "note":
      return { text: <>Note on {b(a.company)}: {String(p.text).slice(0, 80)}</>, pill: ["Note", "neutral"], kind: "stages" };
    case "bounced":
      return { text: <>Email to {b(a.company)} bounced; address suppressed</>, pill: ["Bounced", "bad"], kind: "emails" };
    case "out_of_office":
      return { text: <>{b(a.contact ?? a.company)} is out of office; follow-ups moved back</>, pill: ["Away", "neutral"], kind: "replies" };
    case "created":
      return { text: <>Started tracking {b(a.company)}{a.roleTitle ? ` · ${a.roleTitle}` : ""}</>, pill: ["Found", "neutral"], kind: "stages" };
    default:
      return null;
  }
}

export function ActivityList({ items, limit, title = "Recent activity" }: { items: DashboardActivity[]; limit?: number; title?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = items.map((a) => ({ a, d: describe(a) })).filter((r): r is { a: DashboardActivity; d: NonNullable<ReturnType<typeof describe>> } => r.d !== null);
  const shown = rows.filter((r) => filter === "all" || r.d.kind === filter).slice(0, limit ?? rows.length);

  return (
    <section aria-labelledby="activity-title">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="activity-title" className="text-[14px] font-semibold text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Filter activity" className="flex rounded-lg border bg-card p-0.5">
            {(["all", "replies", "emails", "stages"] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize text-muted-foreground transition", filter === f && "bg-accent text-foreground")}>
                {f}
              </button>
            ))}
          </div>
          {limit && (
            <Link href="/dashboard?tab=activity" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {shown.length === 0 ? (
          <Empty title="No activity yet" body="Emails, replies and stage changes show up here as they happen." />
        ) : (
          <ul className="divide-y">
            {shown.map(({ a, d }) => (
              <li key={a.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold text-secondary-foreground">{initials(a.contact ?? a.company)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-secondary-foreground">{d.text}</p>
                  <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">
                    {timeAgo(a.createdAt)} · {a.roleTitle ?? a.company}
                  </p>
                </div>
                <span className="hidden sm:block">
                  <StatusPill tone={d.pill[1]}>{d.pill[0]}</StatusPill>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label="Activity actions" className="rounded-md p-1 text-subtle-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    <Ellipsis className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/tracker/${a.applicationId}`}>
                        <SquareKanban /> Open in tracker
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/companies/${a.companyId}`}>
                        <Building2 /> View {a.company}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
