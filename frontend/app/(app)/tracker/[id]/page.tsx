"use client";

import { ArrowLeft, ArrowRightLeft, BellRing, Building2, CalendarClock, CircleCheck, CircleSlash, FileText, Hammer, Inbox, Mail, MailX, MessageSquare, NotebookPen, Plane, Plus, RefreshCw, Send, Sparkles, StickyNote, Trophy } from "lucide-react";
import Link from "next/link";
import { use, useState, type ReactNode } from "react";
import { CategoryBadge } from "@/app/components/inbox/CategoryBadge";
import { Badge, Button, Card, CardHeader, CheckField, ErrorNote, initials, Loading, StatusPill, Tabs, timeAgo, useToast } from "@/app/components/common";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { buttonVariants } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Input as UIInput } from "@/app/components/ui/input";
import { Button as UIButton } from "@/app/components/ui/button";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { errorMessage, patch, post } from "@/app/services/api";
import type { Message } from "@/app/types/api";

interface Detail {
  application: { id: string; stage: string; roleTitle: string | null; source: string; appliedVia: string | null; createdAt: string };
  company: { id: string; name: string; domain: string | null };
  job: { id: string; title: string; url: string } | null;
  contact: { id: string; name: string; title: string | null; email: string | null } | null;
  events: { id: string; type: string; payload: Record<string, unknown>; createdAt: string }[];
  messages: Message[];
  replies: { id: string; category: string; body: string; receivedAt: string; suggestedReply: string | null }[];
  reminders: { id: string; text: string; dueAt: string; done: boolean }[];
  prep: { content: { companyBrief: string; likelyQuestions: { question: string; why: string; category: string }[]; yourStories: { prompt: string; story: string; project?: string }[]; questionsToAsk: string[]; negotiation: string[]; checklist: string[] }; createdAt: string } | null;
}

const STAGES = ["found", "emailed", "replied", "interview", "offer", "rejected"] as const;
const STAGE_LABEL: Record<string, string> = { found: "Found", emailed: "Emailed", replied: "Replied", interview: "Interview", offer: "Offer", rejected: "Closed" };
const STAGE_TONE = { found: "neutral", emailed: "brand", replied: "ok", interview: "warn", offer: "violet", rejected: "bad" } as const;

const EVENT: Record<string, { icon: typeof Mail; tone: string; text: (p: Record<string, unknown>) => string }> = {
  created: { icon: Plus, tone: "text-muted-foreground", text: () => "Added to tracker" },
  stage_changed: { icon: ArrowRightLeft, tone: "text-violet", text: (p) => `Moved ${STAGE_LABEL[String(p.from)] ?? p.from} → ${STAGE_LABEL[String(p.to)] ?? p.to}${p.reason ? ` (${p.reason})` : ""}` },
  email_sent: { icon: Send, tone: "text-brand", text: (p) => `Email sent: “${p.subject}”` },
  draft_created: { icon: NotebookPen, tone: "text-muted-foreground", text: (p) => `Draft created (step ${p.step})` },
  reply: { icon: Inbox, tone: "text-success", text: (p) => `Reply received: ${String(p.category).replace(/_/g, " ")}` },
  note: { icon: StickyNote, tone: "text-warning", text: (p) => String(p.text) },
  reminder: { icon: BellRing, tone: "text-warning", text: (p) => `Reminder set: ${p.text}` },
  sequence_stopped: { icon: CircleSlash, tone: "text-muted-foreground", text: (p) => `Follow-ups stopped: ${p.reason}` },
  bounced: { icon: MailX, tone: "text-destructive", text: (p) => `Bounced: ${p.to}` },
  out_of_office: { icon: Plane, tone: "text-muted-foreground", text: () => "Out-of-office reply; follow-ups postponed" },
  manual_apply: { icon: CircleCheck, tone: "text-success", text: (p) => `Applied${p.via ? ` via ${p.via}` : ""}` },
  interview_scheduled: { icon: CalendarClock, tone: "text-warning", text: () => "Interview scheduled" },
  linkedin_note_generated: { icon: StickyNote, tone: "text-brand", text: () => "LinkedIn note generated" },
  linkedin_dm_generated: { icon: MessageSquare, tone: "text-brand", text: () => "LinkedIn DM generated" },
  cover_letter_generated: { icon: FileText, tone: "text-brand", text: () => "Cover letter generated" },
};

/** Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const preset = (days: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return localInput(d);
};

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <div className="mt-2.5">{children}</div>
    </Card>
  );
}

export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Detail>(`/crm/applications/${id}`);
  const [tab, setTab] = useState<"timeline" | "emails" | "prep">("timeline");
  const [note, setNote] = useState("");
  const [rem, setRem] = useState({ text: "", dueAt: "" });
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error ?? "Not found"}</ErrorNote>;
  const { application: app, company, job, contact, events, messages, replies, reminders, prep } = data;

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
  const moveTo = (stage: string) => act("stage", () => patch(`/crm/applications/${id}`, { stage }), stage === "interview" ? "Interview prep pack is ready" : stage === "offer" ? "Moved to Offer. Congratulations!" : `Moved to ${STAGE_LABEL[stage]}`);

  const thread = [...messages.map((m) => ({ kind: "out" as const, at: m.sentAt ?? m.scheduledAt ?? m.createdAt, m })), ...replies.map((r) => ({ kind: "in" as const, at: r.receivedAt, r }))].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const outline = cn(buttonVariants({ variant: "outline" }), "bg-transparent");

  return (
    <>
      <Link href="/tracker" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Tracker
      </Link>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-muted to-card text-sm font-semibold text-foreground">{initials(company.name)}</span>
          <div className="min-w-0">
            <h1 className="display flex flex-wrap items-center gap-2.5 text-[22px] font-semibold text-foreground">
              {company.name}
              <StatusPill tone={STAGE_TONE[app.stage as keyof typeof STAGE_TONE] ?? "neutral"}>{STAGE_LABEL[app.stage] ?? app.stage}</StatusPill>
            </h1>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {job ? (
                <Link className="text-secondary-foreground hover:underline" href={`/jobs/${job.id}`}>
                  {job.title}
                </Link>
              ) : (
                (app.roleTitle ?? "General outreach")
              )}
              {contact ? ` · ${contact.name}${contact.title ? `, ${contact.title}` : ""}` : ""} · added {timeAgo(app.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <UIButton variant="outline" className="bg-transparent" disabled={busy === "stage"}>
                <ArrowRightLeft /> Move to
              </UIButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Stage</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={app.stage} onValueChange={(v) => void moveTo(v)}>
                {STAGES.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={`/companies/${company.id}`} className={outline}>
            <Building2 /> Company
          </Link>
          {app.stage !== "offer" && (
            <Button loading={busy === "stage"} onClick={() => moveTo("offer")}>
              <Trophy /> Got an offer
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "timeline", label: "Timeline", count: events.length },
          { id: "emails", label: "Emails & replies", count: messages.length + replies.length },
          { id: "prep", label: "Interview prep" },
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {tab === "timeline" && (
            <Card className="overflow-hidden">
              <form
                className="flex gap-2 border-b p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (note.trim()) void act("note", async () => { await post(`/crm/applications/${id}/notes`, { text: note }); setNote(""); }, "Note added");
                }}
              >
                <UIInput aria-label="Add a note" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" loading={busy === "note"} disabled={!note.trim()}>
                  Add
                </Button>
              </form>
              <ol className="px-4 py-3">
                {events.map((e, i) => {
                  const ev = EVENT[e.type] ?? { icon: Sparkles, tone: "text-muted-foreground", text: () => e.type.replace(/_/g, " ") };
                  return (
                    <li key={e.id} className="relative flex gap-3 pb-4 last:pb-1">
                      {i < events.length - 1 && <span className="absolute bottom-0 left-[13px] top-7 w-px bg-border" aria-hidden />}
                      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border bg-card">
                        <ev.icon className={cn("size-3.5", ev.tone)} />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className={cn("text-[13px]", e.type === "note" ? "prose-plain rounded-lg border bg-muted/40 px-3 py-2 text-foreground" : "text-secondary-foreground")}>{ev.text(e.payload)}</p>
                        <p className="mt-0.5 text-[11px] text-subtle-foreground" title={new Date(e.createdAt).toLocaleString()}>
                          {new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          {tab === "emails" && (
            <div className="space-y-3">
              {thread.map((x) =>
                x.kind === "out" ? (
                  <Card key={x.m.id} className="mr-6 p-4 sm:mr-16">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 truncate text-[13px] font-medium text-foreground">
                        <Mail className="size-3.5 shrink-0 text-brand" /> {x.m.subject}
                      </p>
                      <StatusPill tone={x.m.status === "sent" ? "ok" : x.m.status === "scheduled" ? "brand" : "neutral"}>{x.m.status.replace("_", " ")}</StatusPill>
                    </div>
                    <p className="mt-0.5 text-[11px] text-subtle-foreground">
                      You → {x.m.toEmail} · {x.m.step === 0 ? "first email" : `follow-up ${x.m.step}`} · {timeAgo(x.at)}
                      {x.m.openedAt ? " · opened" : ""}
                    </p>
                    <p className="prose-plain mt-2.5 text-[13px] leading-relaxed text-secondary-foreground">{x.m.body}</p>
                  </Card>
                ) : (
                  <Card key={x.r.id} className="ml-6 border-success/25 bg-success/[0.04] p-4 sm:ml-16">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                        <Inbox className="size-3.5 text-success" /> Reply{contact ? ` from ${contact.name}` : ""}
                      </p>
                      <CategoryBadge category={x.r.category} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-subtle-foreground">{timeAgo(x.at)}</p>
                    <p className="prose-plain mt-2.5 text-[13px] leading-relaxed text-secondary-foreground">{x.r.body}</p>
                  </Card>
                ),
              )}
              {thread.length === 0 && <Card className="p-8 text-center text-xs text-muted-foreground">No emails yet.</Card>}
            </div>
          )}

          {tab === "prep" &&
            (prep ? (
              <div className="space-y-3">
                <Section title="Company brief">
                  <p className="text-[13px] leading-relaxed text-secondary-foreground">{prep.content.companyBrief}</p>
                </Section>
                <Card className="overflow-hidden">
                  <CardHeader title="Likely questions" subtitle="Open one to see why they'll probably ask it" />
                  <Accordion type="multiple" className="px-4">
                    {prep.content.likelyQuestions.map((q) => (
                      <AccordionItem key={q.question} value={q.question}>
                        <AccordionTrigger className="py-3 text-[13px]">
                          <span className="flex items-start gap-2">
                            <Badge className="mt-px shrink-0">{q.category}</Badge>
                            {q.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 text-xs">{q.why}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
                <Card className="overflow-hidden">
                  <CardHeader title="Your stories" subtitle="STAR answers from your real projects" />
                  <ul className="divide-y">
                    {prep.content.yourStories.map((s) => (
                      <li key={s.prompt} className="px-4 py-3">
                        <p className="text-[13px] font-medium text-foreground">
                          {s.prompt}
                          {s.project && <span className="font-normal text-subtle-foreground"> · {s.project}</span>}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.story}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
                <div className="grid gap-3 md:grid-cols-2">
                  <Section title="Questions to ask them">
                    <ul className="space-y-1.5 text-xs text-secondary-foreground">
                      {prep.content.questionsToAsk.map((q) => (
                        <li key={q} className="flex gap-2">
                          <MessageSquare className="mt-px size-3 shrink-0 text-subtle-foreground" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Negotiation">
                    <ul className="space-y-1.5 text-xs text-secondary-foreground">
                      {prep.content.negotiation.map((q) => (
                        <li key={q} className="flex gap-2">
                          <Hammer className="mt-px size-3 shrink-0 text-subtle-foreground" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </Section>
                </div>
                <Section title={`Checklist · ${checked.length}/${prep.content.checklist.length}`}>
                  <div className="space-y-2">
                    {prep.content.checklist.map((q) => (
                      <CheckField key={q} label={<span className={cn(checked.includes(q) && "text-subtle-foreground line-through")}>{q}</span>} checked={checked.includes(q)} onChange={(v) => setChecked((c) => (v ? [...c, q] : c.filter((x) => x !== q)))} />
                    ))}
                  </div>
                </Section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-subtle-foreground">Want to rehearse out loud? Use these questions in a mock-interview tool.</p>
                  <Button variant="secondary" size="sm" loading={busy === "prep"} onClick={() => act("prep", () => post(`/crm/applications/${id}/prep`), "Prep pack rebuilt")}>
                    <RefreshCw /> Rebuild prep pack
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="flex flex-col items-center p-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full border bg-muted">
                  <Sparkles className="size-4 text-violet" />
                </span>
                <p className="mt-3 text-[13px] font-medium text-foreground">No prep pack yet</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">It&apos;s built automatically when this moves to Interview, or you can build one now.</p>
                <Button className="mt-4" loading={busy === "prep"} onClick={() => act("prep", () => post(`/crm/applications/${id}/prep`), "Prep pack ready")}>
                  Build prep pack
                </Button>
              </Card>
            ))}
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Reminders" subtitle={reminders.filter((r) => !r.done).length ? `${reminders.filter((r) => !r.done).length} open` : undefined} />
            {reminders.length > 0 && (
              <ul className="divide-y">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 px-4 py-2.5">
                    <CheckField label={<span className={cn("text-xs", r.done && "text-subtle-foreground line-through")}>{r.text}</span>} checked={r.done} onChange={(v) => act("rem", () => patch(`/crm/reminders/${r.id}`, { done: v }), v ? "Done" : "Reopened")} />
                    <span className={cn("ml-auto shrink-0 text-[11px]", !r.done && new Date(r.dueAt) < new Date() ? "text-warning" : "text-subtle-foreground")}>{timeAgo(r.dueAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="space-y-2.5 border-t p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void act("addrem", async () => { await post("/crm/reminders", { text: rem.text, dueAt: new Date(rem.dueAt).toISOString(), applicationId: id }); setRem({ text: "", dueAt: "" }); }, "Reminder set");
              }}
            >
              <UIInput aria-label="Reminder" placeholder="Follow up with recruiter" required value={rem.text} onChange={(e) => setRem({ ...rem, text: e.target.value })} />
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["Tomorrow", preset(1)],
                    ["In 3 days", preset(3)],
                    ["Next week", preset(7)],
                  ] as const
                ).map(([l, v]) => (
                  <button key={l} type="button" onClick={() => setRem({ ...rem, dueAt: v })} className={cn("rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground", rem.dueAt === v && "border-foreground/40 bg-accent text-foreground")}>
                    {l}
                  </button>
                ))}
              </div>
              <UIInput aria-label="When" type="datetime-local" required value={rem.dueAt} onChange={(e) => setRem({ ...rem, dueAt: e.target.value })} className="[color-scheme:dark]" />
              <Button type="submit" size="sm" className="w-full" loading={busy === "addrem"}>
                <BellRing /> Add reminder
              </Button>
            </form>
          </Card>
          {replies[0]?.suggestedReply && (
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-foreground">Suggested next reply</p>
              <p className="prose-plain mt-2 line-clamp-6 rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-secondary-foreground">{replies[0].suggestedReply}</p>
              <Link href={`/inbox?reply=${replies[0].id}`} className={cn(outline, "mt-3 w-full")}>
                <Inbox /> Reply from inbox
              </Link>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
