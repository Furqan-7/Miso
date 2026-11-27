"use client";

import { Inbox as InboxIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CategoryBadge } from "@/app/components/inbox/CategoryBadge";
import { ReplyDetail } from "@/app/components/inbox/ReplyDetail";
import { Card, Empty, initials, Loading, PageHeader, Tabs, timeAgo } from "@/app/components/common";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import type { Reply } from "@/app/types/api";

type Filter = "all" | "interested" | "asked_for_resume" | "referral" | "rejected" | "out_of_office";

function InboxInner() {
  const params = useSearchParams();
  const { data, loading, reload } = useApi<{ items: Reply[] }>("/inbox");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(params.get("reply"));
  const items = (data?.items ?? []).filter((r) => filter === "all" || r.category === filter);
  const current = data?.items.find((r) => r.id === selected) ?? items[0] ?? null;
  const count = (c: string) => (data?.items ?? []).filter((r) => r.category === c).length;
  const unhandled = (data?.items ?? []).filter((r) => !r.handled).length;

  return (
    <>
      <PageHeader title="Inbox" subtitle={unhandled ? `${unhandled} ${unhandled === 1 ? "reply needs" : "replies need"} you. Follow-ups stop on their own when someone answers.` : "Replies from Gmail or Outlook, sorted by what they mean. Follow-ups stop on their own."} />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: "all", label: "All", count: data?.items.length },
          { id: "interested", label: "Interested", count: count("interested") },
          { id: "asked_for_resume", label: "Asked for resume", count: count("asked_for_resume") },
          { id: "referral", label: "Referrals", count: count("referral") },
          { id: "rejected", label: "Not now", count: count("rejected") },
          { id: "out_of_office", label: "Out of office", count: count("out_of_office") },
        ]}
      />
      {loading && !data ? (
        <Loading />
      ) : !items.length ? (
        <Card className="mt-4">
          <Empty icon={<InboxIcon className="size-4" />} title="No replies here" body="When someone answers, it shows up within a minute, with a suggested response." />
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <Card className="overflow-hidden">
            <ScrollArea className="lg:h-[calc(100dvh-260px)]">
              <ul className="divide-y">
                {items.map((r) => {
                  const active = current?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button onClick={() => setSelected(r.id)} aria-current={active} className={cn("relative flex w-full gap-3 px-3.5 py-3 text-left transition-colors hover:bg-accent/50", active && "bg-accent/70")}>
                        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
                        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold text-secondary-foreground">
                          {initials(r.contact?.name ?? r.fromEmail)}
                          {!r.handled && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-brand" aria-label="Unread" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-[13px]", r.handled ? "text-secondary-foreground" : "font-semibold text-foreground")}>{r.contact?.name ?? r.fromEmail}</span>
                            <span className="shrink-0 text-[11px] text-subtle-foreground">{timeAgo(r.receivedAt)}</span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className="truncate text-xs text-muted-foreground">{r.company?.name ?? r.subject}</span>
                            <span className="ml-auto shrink-0">
                              <CategoryBadge category={r.category} />
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs text-subtle-foreground">{r.body}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </Card>
          {current && <ReplyDetail key={current.id} reply={current} onChanged={reload} />}
        </div>
      )}
    </>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InboxInner />
    </Suspense>
  );
}
