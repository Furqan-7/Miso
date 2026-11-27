"use client";

import { Bot, Megaphone, Plus, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, Empty, LinkButton, Loading, PageHeader, pct, StatusPill, timeAgo } from "@/app/components/common";
import { Progress } from "@/app/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { useApi } from "@/app/hooks/useApi";
import type { Campaign } from "@/app/types/api";

const STATUS_TONE = { active: "ok", paused: "warn", draft: "neutral", completed: "brand" } as const;

export default function CampaignsPage() {
  const router = useRouter();
  const { data, loading } = useApi<{ items: Campaign[] }>("/campaigns");
  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Bulk outreach with follow-ups, for example “all YC startups hiring frontend interns”."
        actions={
          <LinkButton href="/campaigns/new">
            <Plus /> New campaign
          </LinkButton>
        }
      />
      {loading && !data ? (
        <Card>
          <Loading />
        </Card>
      ) : !data?.items.length ? (
        <Card>
          <Empty
            icon={<Megaphone className="size-4" />}
            title="No campaigns yet"
            body="A campaign finds matching jobs, picks the best person at each company, drafts emails and follows up on day 3, 7 and 14."
            action={<LinkButton href="/campaigns/new">Create your first campaign</LinkButton>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Replied</TableHead>
                <TableHead className="pr-4 text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => {
                const s = c.stats;
                const done = s && s.total ? s.sent / s.total : 0;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/campaigns/${c.id}`)}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">{c.mode === "autopilot" ? <Bot className="size-4" /> : <UserCheck className="size-4" />}</span>
                        <div className="min-w-0">
                          <a href={`/campaigns/${c.id}`} onClick={(e) => e.preventDefault()} className="block truncate font-medium text-foreground">
                            {c.name}
                          </a>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.mode === "autopilot" ? "Autopilot" : "Approval"} · {c.tone} · follow-ups day {c.sequence.slice(1).map((x) => x.dayOffset).join(", ") || "none"}
                            {c.abTest ? " · A/B" : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={STATUS_TONE[c.status]}>{c.status}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex w-36 items-center gap-2">
                        <Progress value={done * 100} className="h-1" />
                        <span className="text-[11px] tabular text-subtle-foreground">{s ? `${s.sent}/${s.total}` : "–"}</span>
                      </div>
                      {s && s.pending > 0 && <p className="mt-1 text-[11px] text-warning">{s.pending} need approval</p>}
                    </TableCell>
                    <TableCell className="text-right tabular text-foreground">{s?.sent ?? 0}</TableCell>
                    <TableCell className="text-right tabular text-secondary-foreground">{s?.sent ? pct(s.opened / s.sent) : "–"}</TableCell>
                    <TableCell className="text-right tabular font-medium text-foreground">{s?.sent ? pct(s.replied / s.sent) : "–"}</TableCell>
                    <TableCell className="pr-4 text-right text-xs text-subtle-foreground">{timeAgo(c.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
