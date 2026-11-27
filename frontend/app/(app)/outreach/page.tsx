"use client";

import { CheckCheck, Copy, FileText, MessageSquare, Send, StickyNote } from "lucide-react";
import { useState } from "react";
import { MessageList } from "@/app/components/outreach/MessageList";
import { Button, Card, Empty, LinkButton, Loading, PageHeader, Tabs, timeAgo, useToast } from "@/app/components/common";
import { useApi } from "@/app/hooks/useApi";
import { errorMessage, post } from "@/app/services/api";
import type { Message } from "@/app/types/api";

type Tab = "pending_approval" | "scheduled" | "sent" | "generated";
const KIND = { linkedin_note: { label: "LinkedIn note", icon: StickyNote }, linkedin_dm: { label: "LinkedIn DM", icon: MessageSquare }, cover_letter: { label: "Cover letter", icon: FileText } } as Record<string, { label: string; icon: typeof StickyNote }>;

export default function OutreachPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pending_approval");
  const all = useApi<{ items: Message[] }>("/outreach/messages");
  const generated = useApi<{ items: { id: string; kind: string; content: string; createdAt: string }[] }>("/outreach/generated");
  const [busy, setBusy] = useState(false);
  const items = (all.data?.items ?? []).filter((m) => (tab === "sent" ? ["sent", "bounced", "failed"].includes(m.status) : m.status === tab));
  const count = (s: string[]) => (all.data?.items ?? []).filter((m) => s.includes(m.status)).length;

  const approveAll = async () => {
    setBusy(true);
    try {
      const r = await post<{ approved: number }>("/outreach/messages/approve-all");
      toast(`${r.approved} emails approved and scheduled`);
      void all.reload();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle="Review every email before it goes out, or switch a campaign to autopilot."
        actions={
          tab === "pending_approval" && items.length > 1 ? (
            <Button loading={busy} onClick={approveAll}>
              <CheckCheck /> Approve all ({items.length})
            </Button>
          ) : undefined
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "pending_approval", label: "Needs approval", count: count(["pending_approval"]) },
          { id: "scheduled", label: "Scheduled", count: count(["scheduled"]) },
          { id: "sent", label: "Sent", count: count(["sent", "bounced", "failed"]) },
          { id: "generated", label: "LinkedIn & cover letters", count: generated.data?.items.length },
        ]}
      />
      <div className="mt-4">
        {tab === "generated" ? (
          <Card className="overflow-hidden">
            {(generated.data?.items ?? []).length === 0 ? (
              <Empty icon={<StickyNote className="size-4" />} title="Nothing generated yet" body="Open a contact and generate a LinkedIn note, DM or cover letter. You copy and send these yourself." />
            ) : (
              <ul className="divide-y">
                {generated.data!.items.map((g) => {
                  const k = KIND[g.kind] ?? { label: g.kind.replace(/_/g, " "), icon: FileText };
                  return (
                    <li key={g.id} className="flex gap-3 p-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                        <k.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-foreground">
                            {k.label} <span className="font-normal text-subtle-foreground">· {timeAgo(g.createdAt)} · {g.content.length} chars</span>
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              void navigator.clipboard.writeText(g.content);
                              toast("Copied");
                            }}
                          >
                            <Copy /> Copy
                          </Button>
                        </div>
                        <p className="prose-plain line-clamp-4 text-xs leading-relaxed text-muted-foreground">{g.content}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : all.loading && !all.data ? (
          <Loading />
        ) : items.length === 0 ? (
          <Card>
            <Empty
              icon={<Send className="size-4" />}
              title={tab === "pending_approval" ? "Nothing waiting for approval" : "Nothing here yet"}
              body="Draft an email from any job or company page, or launch a campaign."
              action={
                <LinkButton href="/campaigns/new" variant="secondary" size="sm">
                  Create a campaign
                </LinkButton>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <MessageList items={items} onChanged={() => void all.reload()} />
          </Card>
        )}
      </div>
    </>
  );
}
