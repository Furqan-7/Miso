"use client";

import { AlertTriangle, ArrowRightLeft, Lightbulb, MailCheck, MailOpen, Reply, Send, Sparkles, ThumbsUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { RateBars, TimelineChart } from "@/app/components/analytics/Charts";
import { Badge, Button, Card, CardHeader, Loading, PageHeader, pct, Select, useToast } from "@/app/components/common";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { api, errorMessage, post } from "@/app/services/api";
import type { RateRow } from "@/app/types/api";

interface Overview {
  totals: { sent: number; delivered: number; bounced: number; opened: number; replied: number; positive: number; openRate: number; replyRate: number; positiveRate: number; bounceRate: number };
  byTemplate: RateRow[];
  bySubject: RateRow[];
  byRole: RateRow[];
  byCompanySize: RateRow[];
  byContactRole: RateRow[];
  byTone: RateRow[];
  byStep: RateRow[];
  abTests: { campaignId: string; A?: { sent: number; replies: number }; B?: { sent: number; replies: number }; winner: "A" | "B" | null }[];
  timeline: { date: string; sent: number; replies: number }[];
  insights: { kind: string; text: string; confidence: string }[];
}

const NICE: Record<string, string> = { startup: "Startups", scaleup: "Scale-ups", mnc: "MNCs", unknown: "Unknown size", founder: "Founders", cto: "CTOs / eng leads", hiring_manager: "Hiring managers", recruiter: "Recruiters", engineer: "Engineers", other: "Other", formal: "Formal", casual: "Casual", initial: "First email" };
const label = (k: string) => NICE[k] ?? k.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

function Kpi({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint: ReactNode; icon: ReactNode; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-secondary-foreground">{label}</span>
        <span className={cn("flex size-7 items-center justify-center rounded-md [&_svg]:size-4", tone)}>{icon}</span>
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const INSIGHT_ICON: Record<string, ReactNode> = { warning: <AlertTriangle className="size-3.5 text-warning" />, comparison: <ArrowRightLeft className="size-3.5 text-brand" /> };

export default function AnalyticsPage() {
  const toast = useToast();
  const [days, setDays] = useState(90);
  const { data, loading } = useApi<Overview>(`/analytics/overview?days=${days}`);
  const [advice, setAdvice] = useState<{ title: string; detail: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    try {
      await fn();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <Loading />;
  if (!data) return null;
  const t = data.totals;
  const followupReplies = data.byStep.filter((s) => s.key !== "initial").reduce((a, s) => a + s.replies, 0);
  const breakdowns: { title: string; rows: RateRow[]; color: string }[] = [
    { title: "Company size", rows: data.byCompanySize, color: "var(--chart-1)" },
    { title: "Who you emailed", rows: data.byContactRole, color: "var(--chart-1)" },
    { title: "Role", rows: data.byRole, color: "var(--chart-1)" },
    { title: "Tone", rows: data.byTone, color: "var(--chart-1)" },
    { title: "Sequence step", rows: data.byStep, color: "var(--chart-1)" },
    { title: "Template", rows: data.byTemplate, color: "var(--chart-1)" },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="What's working for you, from your own sends."
        actions={
          <>
            <Select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </Select>
            <Button variant="secondary" loading={busy === "weekly"} onClick={() => run("weekly", async () => {
              await post("/analytics/weekly-report");
              toast("Weekly report sent to your notifications");
            })}>
              <MailCheck /> Send weekly report
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Sent" value={t.sent} hint={`${t.bounced} bounced (${pct(t.bounceRate)})`} icon={<Send />} tone="bg-chart-1/15 text-chart-1" />
        <Kpi label="Open rate" value={pct(t.openRate)} hint={`${t.opened} opened`} icon={<MailOpen />} tone="bg-violet/15 text-violet" />
        <Kpi label="Reply rate" value={pct(t.replyRate)} hint={`${t.replied} replies`} icon={<Reply />} tone="bg-success/15 text-success" />
        <Kpi label="Positive" value={pct(t.positiveRate)} hint="Interested, referral or resume" icon={<ThumbsUp />} tone="bg-warning/15 text-warning" />
        <Kpi label="Follow-up replies" value={followupReplies} hint="Replies that came after a follow-up" icon={<Sparkles />} tone="bg-muted text-secondary-foreground" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Daily activity" subtitle="Emails sent and replies received" />
          <TimelineChart data={data.timeline} />
        </Card>
        <Card className="flex flex-col">
          <CardHeader title="Insights" subtitle="Plain-language findings from your data" />
          {data.insights.length ? (
            <ul className="divide-y">
              {data.insights.map((i) => (
                <li key={i.text} className="flex gap-2.5 px-4 py-3 text-[13px]">
                  <span className="mt-0.5 shrink-0">{INSIGHT_ICON[i.kind] ?? <Lightbulb className="size-3.5 text-violet" />}</span>
                  <div className="min-w-0">
                    <p className="text-secondary-foreground">{i.text}</p>
                    <p className="mt-0.5 text-[11px] text-subtle-foreground">{i.confidence} confidence</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">Insights appear after about 20 sends.</p>
          )}
        </Card>
      </div>

      <h2 className="mb-2.5 text-[14px] font-semibold text-foreground">Reply rate by</h2>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {breakdowns.map((b) => (
          <Card key={b.title}>
            <CardHeader title={b.title} />
            <RateBars rows={b.rows} label={label} color={b.color} />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader title="Subject lines" subtitle="First emails only" />
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Subject</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="pr-4 text-right">Replied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.bySubject.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="max-w-[360px] truncate pl-4 text-secondary-foreground">{s.key}</TableCell>
                  <TableCell className="text-right tabular">{s.sent}</TableCell>
                  <TableCell className="text-right tabular text-secondary-foreground">{pct(s.openRate)}</TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular text-foreground">{pct(s.replyRate)}</TableCell>
                </TableRow>
              ))}
              {data.bySubject.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    No data yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data.abTests.length > 0 && (
            <div className="space-y-2 border-t p-4">
              <p className="text-[13px] font-semibold text-foreground">A/B subject tests</p>
              {data.abTests.map((a) => (
                <p key={a.campaignId} className="flex flex-wrap items-center gap-2 text-xs text-secondary-foreground">
                  <span className="tabular">A {a.A ? `${a.A.replies}/${a.A.sent}` : "–"}</span>
                  <span className="tabular">B {a.B ? `${a.B.replies}/${a.B.sent}` : "–"}</span>
                  {a.winner ? <Badge tone="ok">Variant {a.winner} wins</Badge> : <span className="text-subtle-foreground">No clear winner yet (needs about 20 sends each)</span>}
                </p>
              ))}
            </div>
          )}
        </Card>
        <Card className="flex flex-col p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Lightbulb className="size-4 text-warning" /> What to change
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Suggestions based on your numbers.</p>
          {advice ? (
            <ol className="mt-4 space-y-3">
              {advice.map((a, i) => (
                <li key={a.title} className="flex gap-2.5 text-[13px]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold tabular text-secondary-foreground">{i + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Button className="mt-4 w-full" loading={busy === "advice"} onClick={() => run("advice", async () => setAdvice((await api<{ suggestions: { title: string; detail: string }[] }>("/analytics/advice")).suggestions))}>
              <Sparkles /> Get suggestions
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
