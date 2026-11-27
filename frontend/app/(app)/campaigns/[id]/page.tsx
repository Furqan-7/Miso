"use client";

import { Bot, Ellipsis, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { MessageList } from "@/app/components/outreach/MessageList";
import { Button, Card, Empty, ErrorNote, Loading, PageHeader, pct, StatusPill, useToast } from "@/app/components/common";
import { Button as UIButton } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { del, errorMessage, patch, post } from "@/app/services/api";
import type { Campaign, Message } from "@/app/types/api";

type Filter = "all" | "pending_approval" | "scheduled" | "sent" | "replied";

export default function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ campaign: Campaign; messages: Message[] }>(`/campaigns/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error ?? "Not found"}</ErrorNote>;
  const { campaign, messages } = data;

  const act = async (what: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(what);
    try {
      await fn();
      toast(ok);
      await reload();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  const count = (s: string) => messages.filter((m) => m.status === s).length;
  const sent = count("sent");
  const replied = messages.filter((m) => m.repliedAt).length;
  const opened = messages.filter((m) => m.openedAt).length;
  const shown = messages.filter((m) => (filter === "all" ? true : filter === "replied" ? Boolean(m.repliedAt) : m.status === filter));
  const stats = [
    { label: "Need approval", value: count("pending_approval"), tone: "text-warning" },
    { label: "Scheduled", value: count("scheduled"), tone: "text-brand" },
    { label: "Sent", value: sent, tone: "text-foreground" },
    { label: "Open rate", value: sent ? pct(opened / sent) : "–", tone: "text-foreground" },
    { label: "Reply rate", value: sent ? pct(replied / sent) : "–", tone: "text-success" },
  ];

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={campaign.status === "active" ? "ok" : campaign.status === "paused" ? "warn" : "neutral"}>{campaign.status}</StatusPill>
            <span>
              {campaign.mode === "autopilot" ? "Autopilot" : "Approval mode"} · {campaign.tone} tone · follow-ups on day {campaign.sequence.slice(1).map((s) => s.dayOffset).join(", ") || "none"}
            </span>
          </span>
        }
        actions={
          <>
            {campaign.status === "paused" ? (
              <Button loading={busy === "status"} onClick={() => act("status", () => patch(`/campaigns/${id}`, { status: "active" }), "Campaign resumed")}>
                <Play /> Resume
              </Button>
            ) : (
              <Button variant="secondary" loading={busy === "status"} onClick={() => act("status", () => patch(`/campaigns/${id}`, { status: "paused" }), "Campaign paused")}>
                <Pause /> Pause
              </Button>
            )}
            <Button variant="secondary" loading={busy === "launch"} onClick={() => act("launch", () => post(`/campaigns/${id}/launch`), "Looked for new companies to contact")}>
              <RefreshCw /> Add new matches
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UIButton variant="outline" size="icon" className="bg-transparent" aria-label="More campaign actions">
                  <Ellipsis />
                </UIButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {campaign.mode === "approval" && (
                  <DropdownMenuItem onSelect={() => void act("mode", () => patch(`/campaigns/${id}`, { mode: "autopilot" }), "Switched to autopilot")}>
                    <Bot /> Switch to autopilot
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 className="text-destructive" /> Delete campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-5 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="border-b px-4 py-3 sm:border-b-0">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-[22px] font-semibold tracking-tight tabular", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="gap-0">
          <TabsList className="px-3">
            {(
              [
                ["all", "All", messages.length],
                ["pending_approval", "Need approval", count("pending_approval")],
                ["scheduled", "Scheduled", count("scheduled")],
                ["sent", "Sent", sent],
                ["replied", "Replied", replied],
              ] as const
            ).map(([v, l, n]) => (
              <TabsTrigger key={v} value={v}>
                {l} <span className="text-[11px] tabular text-subtle-foreground">{n}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {shown.length === 0 ? (
          <Empty title={messages.length ? "Nothing in this view" : "No emails in this campaign"} body={messages.length ? undefined : "No company matched with a verified contact yet. Try lowering the minimum score, or find people on company pages first."} />
        ) : (
          <MessageList items={shown} onChanged={() => void reload()} />
        )}
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{campaign.name}”?</DialogTitle>
            <DialogDescription>Unsent emails and follow-ups are cancelled. Sent emails and replies stay in your tracker.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={busy === "delete"}
              onClick={async () => {
                setBusy("delete");
                try {
                  await del(`/campaigns/${id}`);
                  toast("Campaign deleted");
                  router.push("/campaigns");
                } catch (e) {
                  toast(errorMessage(e), "bad");
                  setBusy(null);
                }
              }}
            >
              Delete campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
