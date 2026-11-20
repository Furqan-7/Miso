"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button, Card, Empty, Loading, PageHeader, Tabs, Textarea, timeAgo, useToast } from "@/components/ui";
import { api, errorMessage, post, useApi } from "@/lib/api";
import type { Reply } from "@/lib/types";

type Filter = "all" | "interested" | "asked_for_resume" | "referral" | "rejected" | "out_of_office";

function InboxInner() {
  const toast = useToast();
  const params = useSearchParams();
  const { data, loading, reload } = useApi<{ items: Reply[] }>("/inbox");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(params.get("reply"));
  const [draft, setDraft] = useState("");
  const [attach, setAttach] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<{ calCom: string | null; googleCalendar: string } | null>(null);
  const items = (data?.items ?? []).filter((r) => filter === "all" || r.category === filter);
  const current = data?.items.find((r) => r.id === selected) ?? items[0] ?? null;

  useEffect(() => {
    setDraft(current?.suggestedReply ?? "");
    setAttach(current?.category === "asked_for_resume");
    setLinks(null);
    if (current) api<{ calCom: string | null; googleCalendar: string }>(`/inbox/${current.id}/booking-links`).then(setLinks).catch(() => undefined);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const count = (c: string) => (data?.items ?? []).filter((r) => r.category === c).length;

  return (
    <>
      <PageHeader title="Inbox" subtitle="Replies from your Gmail or Outlook, sorted by what they mean. Follow-ups stop automatically." />
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
      {loading && !data ? <Loading /> : !items.length ? (
        <Card className="mt-4"><Empty title="No replies yet" body="When someone answers, it shows up here within a minute, with a suggested response." /></Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {items.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setSelected(r.id)} className={`block w-full px-4 py-3 text-left hover:bg-surface-2 ${current?.id === r.id ? "bg-surface-2" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${r.handled ? "text-ink-2" : "font-semibold"}`}>{r.contact?.name ?? r.fromEmail}</span>
                      <CategoryBadge category={r.category} />
                    </div>
                    <p className="truncate text-xs text-ink-3">{r.company?.name} · {timeAgo(r.receivedAt)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-2">{r.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {current && (
            <Card className="p-5 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{current.subject}</p>
                  <p className="text-sm text-ink-3">{current.contact?.name ?? ""} &lt;{current.fromEmail}&gt; · {new Date(current.receivedAt).toLocaleString()}</p>
                </div>
                <CategoryBadge category={current.category} />
              </div>
              <div className="prose-plain mt-4 rounded-lg bg-surface-2 p-4 text-sm">{current.body}</div>
              {current.original && (
                <details className="mt-3 text-sm text-ink-3">
                  <summary className="cursor-pointer">Your email: {current.original.subject}</summary>
                  <p className="prose-plain mt-2">{current.original.body}</p>
                </details>
              )}
              {current.category !== "out_of_office" && (
                <div className="mt-5 space-y-3">
                  <Textarea label="Your reply" rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} hint="Suggested from their message. Edit freely." />
                  <label className="flex items-center gap-2 text-sm text-ink-2">
                    <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Attach my resume (PDF)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button loading={busy === "send"} disabled={!draft.trim()} onClick={() => act("send", () => post(`/inbox/${current.id}/respond`, { body: draft, attachResume: attach }), "Reply queued in the same thread")}>Send reply</Button>
                    {links?.calCom && <a className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2" href={links.calCom} target="_blank" rel="noreferrer">Cal.com link ↗</a>}
                    {links && <a className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2" href={links.googleCalendar} target="_blank" rel="noreferrer">Add to Google Calendar ↗</a>}
                    <Button variant="secondary" loading={busy === "iv"} onClick={() => act("iv", () => post(`/inbox/${current.id}/interview`, {}), "Moved to Interview. Prep pack is ready in the tracker")}>Interview booked</Button>
                    {!current.handled && <Button variant="ghost" loading={busy === "done"} onClick={() => act("done", () => post(`/inbox/${current.id}/handled`), "Marked as handled")}>Mark handled</Button>}
                  </div>
                </div>
              )}
              {current.applicationId && <Link href={`/tracker/${current.applicationId}`} className="mt-4 inline-block text-sm text-brand">Open in tracker →</Link>}
            </Card>
          )}
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
