"use client";

import { CalendarPlus, Check, ChevronDown, CornerUpLeft, ExternalLink, SquareKanban, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils";
import { api, errorMessage, post } from "@/app/services/api";
import type { Reply } from "@/app/types/api";
import { Button, Card, CheckField, initials, Textarea, timeAgo, useToast } from "../common";
import { buttonVariants } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Separator } from "../ui/separator";
import { CategoryBadge } from "./CategoryBadge";

/** One reply: their message, your email, and an editable suggested response. Keyed by reply id. */
export function ReplyDetail({ reply, onChanged }: { reply: Reply; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [draft, setDraft] = useState(reply.suggestedReply ?? "");
  const [attach, setAttach] = useState(reply.category === "asked_for_resume");
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<{ calCom: string | null; googleCalendar: string } | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ calCom: string | null; googleCalendar: string }>(`/inbox/${reply.id}/booking-links`)
      .then((l) => alive && setLinks(l))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [reply.id]);

  const act = async (what: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(what);
    try {
      await fn();
      toast(ok);
      await onChanged();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  const linkBtn = cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent");

  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-start gap-3 border-b p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-secondary-foreground">{initials(reply.contact?.name ?? reply.fromEmail)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{reply.subject}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="text-secondary-foreground">{reply.contact?.name ?? reply.fromEmail}</span>
            {reply.contact?.name && <> &lt;{reply.fromEmail}&gt;</>}
            {reply.company && <> · {reply.company.name}</>} · {timeAgo(reply.receivedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoryBadge category={reply.category} />
          {reply.applicationId && (
            <Link href={`/tracker/${reply.applicationId}`} className={linkBtn}>
              <SquareKanban /> Tracker
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="prose-plain rounded-lg border bg-muted/40 p-4 text-[13px] leading-relaxed text-secondary-foreground">{reply.body}</div>
        {reply.original && (
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              Your email: <span className="text-secondary-foreground">{reply.original.subject}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="prose-plain mt-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">{reply.original.body}</p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {reply.category !== "out_of_office" && (
        <>
          <Separator />
          <div className="space-y-3 p-4">
            <Textarea label="Your reply" rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} hint="Suggested from their message. Edit freely." />
            <CheckField label="Attach my resume (PDF)" checked={attach} onChange={setAttach} />
            <div className="flex flex-wrap items-center gap-2">
              <Button loading={busy === "send"} disabled={!draft.trim()} onClick={() => act("send", () => post(`/inbox/${reply.id}/respond`, { body: draft, attachResume: attach }), "Reply queued in the same thread")}>
                <CornerUpLeft /> Send reply
              </Button>
              <Button variant="secondary" loading={busy === "iv"} onClick={() => act("iv", () => post(`/inbox/${reply.id}/interview`, {}), "Moved to Interview. Prep pack is ready in the tracker")}>
                <Video /> Interview booked
              </Button>
              {links?.calCom && (
                <a className={linkBtn} href={links.calCom} target="_blank" rel="noreferrer">
                  <ExternalLink /> Cal.com link
                </a>
              )}
              {links && (
                <a className={linkBtn} href={links.googleCalendar} target="_blank" rel="noreferrer">
                  <CalendarPlus /> Add to Google Calendar
                </a>
              )}
              {!reply.handled && (
                <Button variant="ghost" className="sm:ml-auto" loading={busy === "done"} onClick={() => act("done", () => post(`/inbox/${reply.id}/handled`), "Marked as handled")}>
                  <Check /> Mark handled
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
