"use client";

import { BadgeCheck, CalendarClock, Clock, FileText, LoaderCircle, Pencil, Send, Share2, Sparkles, UserRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils";
import { api, post } from "@/app/services/api";
import type { DashboardData, Profile, User } from "@/app/types/api";
import { initials, timeAgo, useToast } from "../common";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button, buttonVariants } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

function useClock(tz: string) {
  const fmt = () => {
    try {
      return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date());
    } catch {
      return "--:--";
    }
  };
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setT(fmt());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tz]);
  return t;
}

const UPCOMING_ICON = {
  interview: { icon: CalendarClock, tone: "bg-warning/12 text-warning" },
  reminder: { icon: Clock, tone: "bg-brand/12 text-brand" },
  send: { icon: Send, tone: "bg-success/12 text-success" },
};

export function ProfilePanel({ user, profile, data, onRecap }: { user: User; profile: Profile; data: DashboardData; onRecap: () => void }) {
  const toast = useToast();
  const clock = useClock(profile.timezone);
  const gh = (profile.enrichment as { github?: { username?: string } }).github?.username;
  const goal = Math.max(1, data.weekly.goal);
  const progress = Math.min(100, Math.round((data.weekly.sent / goal) * 100));
  const verified = data.capacity.mailboxes > 0;
  const publicUrl = user.publicSlug ? `/p/${user.publicSlug}` : null;

  const share = async () => {
    if (!profile.publicVisible || !publicUrl) return toast("Turn on your public profile in Settings first", "bad");
    await navigator.clipboard.writeText(`${location.origin}${publicUrl}`);
    toast("Profile link copied");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="relative h-24 bg-[radial-gradient(120%_140%_at_0%_0%,#f7c6e9_0%,#c3b3ff_38%,#8fd0ff_68%,#c8f2df_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_100%,rgba(255,255,255,0.35),transparent)]" />
          <Link href="/settings" aria-label="Edit profile" className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-md bg-black/25 text-white backdrop-blur transition hover:bg-black/40">
            <Pencil className="size-3.5" />
          </Link>
        </div>
        <div className="px-4 pb-4">
          <Avatar className="-mt-9 size-[72px] border-4 border-card">
            <AvatarImage src={gh ? `https://github.com/${gh}.png?size=144` : undefined} alt="" />
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="mt-2.5 flex items-center gap-1.5">
            <h2 className="truncate text-[17px] font-semibold tracking-tight text-foreground">{user.name}</h2>
            {verified && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <BadgeCheck className="size-[18px] shrink-0 text-brand" aria-label="Mailbox connected" />
                </TooltipTrigger>
                <TooltipContent>Mailbox connected</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="truncate">{user.publicSlug ? `@${user.publicSlug}` : user.email}</span>
            <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", user.sendingPaused ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>{user.sendingPaused ? "Paused" : "Open to work"}</span>
          </div>
          {profile.headline && <p className="mt-2 line-clamp-2 text-[12px] text-secondary-foreground">{profile.headline}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {publicUrl && profile.publicVisible ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent")}>
                <UserRound /> Profile
              </a>
            ) : (
              <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent")}>
                <UserRound /> Profile
              </Link>
            )}
            {profile.resumeFileName && publicUrl && profile.publicVisible ? (
              <a href={`/backend/public/resume/${user.publicSlug}.pdf`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent")}>
                <FileText /> Resume
              </a>
            ) : (
              <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent")}>
                <FileText /> Resume
              </Link>
            )}
            <Button variant="outline" size="sm" className="bg-transparent" onClick={share}>
              <Share2 /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Joined</p>
          <p className="mt-1 text-[14px] font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="truncate text-[11px] text-muted-foreground" title={profile.timezone}>
            {profile.timezone.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-[14px] font-semibold tabular text-foreground">{clock ?? "--:--"}</p>
        </div>
      </div>

      <Link href="/settings" className="rounded-xl border bg-card px-3.5 py-3 transition-colors hover:border-border-strong">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-secondary-foreground">Weekly goal · {data.weekly.sent}/{goal} emails</span>
          <span className="font-semibold tabular text-foreground">{progress}%</span>
        </div>
        <div className="relative mt-2.5 h-1.5 rounded-full bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_3px,transparent_3px_6px)]">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#f5a6d6] via-[#a48bff] to-[#3ecf8e]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
          {progress > 0 && <motion.span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-[#3ecf8e]" initial={{ left: 0 }} animate={{ left: `${progress}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />}
        </div>
      </Link>

      <section aria-labelledby="upcoming-title">
        <h3 id="upcoming-title" className="mb-2 text-[14px] font-semibold text-foreground">
          Upcoming
        </h3>
        {data.upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No reminders or scheduled follow-ups.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.upcoming.map((u) => {
              const m = UPCOMING_ICON[u.kind];
              return (
                <li key={u.id}>
                  <Link href={u.applicationId ? `/tracker/${u.applicationId}` : "/tracker"} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent/50">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", m.tone)}>
                      <m.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-foreground">{u.title}</span>
                      <span className="block text-[11px] text-subtle-foreground">{u.at ? `${new Date(u.at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${timeAgo(u.at)}` : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecapCard data={data} onRecap={onRecap} />
    </div>
  );
}

function weekKey() {
  const d = new Date();
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `jp-recap-later-${d.getUTCFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7)}`;
}

function RecapCard({ data, onRecap }: { data: DashboardData; onRecap: () => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let later = false;
    try {
      later = localStorage.getItem(weekKey()) === "1";
    } catch {
      /* storage blocked */
    }
    if (later) {
      const t = setTimeout(() => setHidden(true), 0);
      return () => clearTimeout(t);
    }
  }, []);
  if (hidden) return null;
  const r = data.recap;
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[radial-gradient(closest-side,rgba(164,139,255,0.25),transparent)]" />
      <span className="relative flex size-8 items-center justify-center rounded-lg border bg-muted">
        <Sparkles className="size-4 text-foreground" />
      </span>
      <h3 className="relative mt-3 text-[15px] font-semibold text-foreground">Your week, summarized</h3>
      <p className="relative mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {r.sent} emails, {r.replies} {r.replies === 1 ? "reply" : "replies"} and {r.interviews} {r.interviews === 1 ? "interview" : "interviews"} in the last 7 days. {r.insight ?? "Get a quick recap and what to change next."}
      </p>
      <div className="relative mt-3.5 flex gap-2">
        <Button size="sm" onClick={onRecap}>
          <Sparkles /> Generate recap
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent"
          onClick={() => {
            try {
              localStorage.setItem(weekKey(), "1");
            } catch {
              /* storage blocked */
            }
            setHidden(true);
          }}
        >
          Later
        </Button>
      </div>
    </div>
  );
}

/** Weekly recap: numbers from the last 7 days + AI (or rule-based) suggestions. */
export function RecapDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, setState] = useState<{ summary: string[]; suggestions: { title: string; detail: string }[] } | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.all([post<{ summary: string[] }>("/analytics/weekly-report"), api<{ suggestions: { title: string; detail: string }[] }>("/analytics/advice")])
      .then(([w, a]) => alive && setState({ summary: w.summary, suggestions: a.suggestions }))
      .catch(() => alive && setState({ summary: ["Couldn't build the recap right now."], suggestions: [] }));
    return () => {
      alive = false;
    };
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setState(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet" /> Your week, summarized
          </DialogTitle>
          <DialogDescription>Last 7 days of outreach, and what to change next.</DialogDescription>
        </DialogHeader>
        {!state ? (
          <div className="flex items-center gap-2 py-8 text-[13px] text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Building your recap…
          </div>
        ) : (
          <div className="grid gap-4">
            <ul className="grid gap-2 rounded-lg border bg-card p-3.5 text-[13px] text-secondary-foreground">
              {state.summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {state.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">What to change</p>
                <ul className="grid gap-2">
                  {state.suggestions.map((s) => (
                    <li key={s.title + s.detail} className="rounded-lg border bg-card p-3">
                      <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-subtle-foreground">Also sent to your notifications.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
