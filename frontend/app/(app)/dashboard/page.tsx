"use client";

import { Activity, CalendarRange, Clock, LayoutGrid, Sparkles, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSession } from "@/app/(app)/AppShell";
import { Empty, initials, Loading, LinkButton, useToast } from "@/app/components/common";
import { ActivityList } from "@/app/components/dashboard/Activity";
import { CapacityCard, PerformanceCard } from "@/app/components/dashboard/Charts";
import { OverviewCards, Workload } from "@/app/components/dashboard/Overview";
import { ProfilePanel, RecapDialog } from "@/app/components/dashboard/ProfilePanel";
import { JobCard } from "@/app/components/jobs/JobCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { errorMessage, post } from "@/app/services/api";
import type { DashboardData, Job } from "@/app/types/api";

const PERIODS = [7, 14, 30, 90];

function LiveSwitch({ paused, onToggle, busy }: { paused: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-pressed={!paused}
      title={paused ? "Sending is paused. Click to resume." : "Sending is live. Click to pause everything."}
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition disabled:opacity-60", paused ? "border-warning/40 bg-warning/10 text-warning" : "border-border-strong bg-card text-foreground hover:border-foreground/30")}
    >
      <span className="relative flex size-2">
        {!paused && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
        <span className={cn("relative inline-flex size-2 rounded-full", paused ? "bg-warning" : "bg-success")} />
      </span>
      {paused ? "Paused" : "Live"}
    </button>
  );
}

function DashboardInner() {
  const { user, profile, reload } = useSession();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [days, setDays] = useState(7);
  const tab = params.get("tab") ?? "summary";
  const recapOpen = params.get("recap") === "1";
  const dash = useApi<DashboardData>(`/dashboard?days=${days}`);
  const feed = useApi<{ items: Job[] }>(tab === "matches" ? "/jobs/feed?sinceHours=168&minScore=40&limit=50" : null);
  const [busy, setBusy] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (value === null) p.delete(key);
    else p.set(key, value);
    router.replace(`/dashboard${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const toggleSending = async () => {
    setBusy(true);
    try {
      await post(user.sendingPaused ? "/sending/resume" : "/sending/pause");
      toast(user.sendingPaused ? "Sending resumed" : "All sending paused");
      await Promise.all([reload(), dash.reload()]);
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(false);
    }
  };

  const data = dash.data;
  const active = data?.workload.flatMap((w) => (w.stage === "rejected" ? [] : w.companies)).slice(0, 3) ?? [];

  return (
    <div className="flex min-h-full flex-col xl:flex-row">
      <div className="min-w-0 flex-1 px-4 pb-10 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <h1 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <UserRound className="size-4 text-muted-foreground" /> Good to see you, {user.name.split(" ")[0]}
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Clock className="size-3.5" /> {dash.loading ? "Updating…" : "Updated just now"}
            </span>
            {active.length > 0 && (
              <div className="hidden -space-x-1.5 sm:flex" aria-label="Companies in your pipeline">
                {active.map((c) => (
                  <span key={c} title={c} className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-secondary-foreground">
                    {initials(c)}
                  </span>
                ))}
              </div>
            )}
            <LiveSwitch paused={user.sendingPaused} busy={busy} onToggle={toggleSending} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "summary" ? null : v)} className="mt-2">
          <TabsList>
            <TabsTrigger value="summary">
              <LayoutGrid /> Summary
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Sparkles /> Matches
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity /> Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Overview</h2>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs text-secondary-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                  <CalendarRange className="size-3.5" /> Last {days} days
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                    {PERIODS.map((p) => (
                      <DropdownMenuRadioItem key={p} value={String(p)}>
                        Last {p} days
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {!data ? (
              <Loading />
            ) : (
              <>
                <OverviewCards data={data} />
                <Workload data={data} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <CapacityCard data={data} />
                  <PerformanceCard data={data} />
                </div>
                <ActivityList items={data.activity} limit={6} />
              </>
            )}
          </TabsContent>

          <TabsContent value="matches" className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Today&apos;s matches</h2>
              <LinkButton href="/jobs" variant="secondary" size="sm">
                All jobs
              </LinkButton>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {!feed.data ? (
                <Loading />
              ) : feed.data.items.length === 0 ? (
                <Empty title="No new matches this week" body="Discovery runs every 6 hours. You can also add a careers page from Jobs." />
              ) : (
                <div className="divide-y">
                  {feed.data.items.map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-2">{data ? <ActivityList items={data.activity} title="All activity" /> : <Loading />}</TabsContent>
        </Tabs>
      </div>

      <aside aria-label="Your profile" className="w-full shrink-0 border-t px-4 py-5 md:px-6 xl:w-[320px] xl:border-l xl:border-t-0 xl:px-4">
        {data ? <ProfilePanel user={user} profile={profile} data={data} onRecap={() => setParam("recap", "1")} /> : <Loading />}
      </aside>
      <RecapDialog open={recapOpen} onOpenChange={(o) => setParam("recap", o ? "1" : null)} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardInner />
    </Suspense>
  );
}
