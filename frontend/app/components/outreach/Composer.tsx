"use client";

import { Copy, FileText, Mail, MessageSquare, Save, Send, StickyNote, Trash2, WandSparkles } from "lucide-react";
import { checkSpam, TONES, type Tone } from "shared";
import { useMemo, useState } from "react";
import { errorMessage, patch, post } from "@/app/services/api";
import type { Contact, Message } from "@/app/types/api";
import { Button, ErrorNote, Input, Select, StatusPill, Textarea, useToast } from "@/app/components/common";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Button as UIButton } from "@/app/components/ui/button";

const TONE_LABEL: Record<Tone, string> = { formal: "Formal", casual: "Casual", founder: "Founder-to-founder" };

/** Live spam check, run in the browser on every keystroke. */
export function SpamMeter({ subject, body }: { subject: string; body: string }) {
  const r = useMemo(() => checkSpam(subject, body), [subject, body]);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <StatusPill tone={r.level === "good" ? "ok" : r.level === "ok" ? "warn" : "bad"}>Spam risk: {r.level}</StatusPill>
      {r.hits.map((h) => (
        <span key={h.phrase} className="text-muted-foreground">
          “{h.phrase}”{h.suggestion ? <> → try <span className="text-secondary-foreground">“{h.suggestion}”</span></> : ""}
        </span>
      ))}
      {r.issues.map((i) => (
        <span key={i} className="text-muted-foreground">
          {i}
        </span>
      ))}
    </div>
  );
}

/** Edit + approve a drafted email: subject variants, body, tone regeneration, schedule or send now. */
export function MessageEditor({ message, onDone }: { message: Message; onDone?: () => void }) {
  const toast = useToast();
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editable = ["draft", "pending_approval", "scheduled"].includes(message.status);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  const act = async (what: string, fn: () => Promise<unknown>, ok: string, done = true) => {
    setBusy(what);
    setError(null);
    try {
      await fn();
      toast(ok);
      if (done) onDone?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const rewrite = (tone: Tone) =>
    act(
      "tone",
      async () => {
        const r = await post<{ message: Message }>(`/outreach/messages/${message.id}/regenerate`, { tone });
        setSubject(r.message.subject);
        setBody(r.message.body);
      },
      `Rewritten in a ${TONE_LABEL[tone].toLowerCase()} tone`,
      false,
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editable} />
        </div>
        {message.subjectVariants.length > 1 && editable && (
          <Select label="Other subject ideas" value="" onChange={(e) => e.target.value && setSubject(e.target.value)} className="sm:w-64">
            <option value="">Pick one…</option>
            {message.subjectVariants.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Textarea label="Email" rows={10} value={body} onChange={(e) => setBody(e.target.value)} disabled={!editable} className="leading-relaxed" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SpamMeter subject={subject} body={body} />
        <span className="text-[11px] tabular text-subtle-foreground">{words} words</span>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button loading={busy === "approve"} onClick={() => act("approve", () => post(`/outreach/messages/${message.id}/approve`, { subject, body }), "Approved. Scheduled for a good time in their time zone")}>
            Approve &amp; schedule
          </Button>
          <Button variant="secondary" loading={busy === "now"} onClick={() => act("now", () => post(`/outreach/messages/${message.id}/approve`, { subject, body, sendNow: true }), "Queued to send now")}>
            <Send /> Send now
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <UIButton variant="ghost" disabled={busy === "tone"}>
                <WandSparkles /> {busy === "tone" ? "Rewriting…" : "Rewrite as…"}
              </UIButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Tone</DropdownMenuLabel>
              {TONES.map((t) => (
                <DropdownMenuItem key={t} onSelect={() => void rewrite(t)}>
                  {TONE_LABEL[t]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" loading={busy === "save"} onClick={() => act("save", () => patch(`/outreach/messages/${message.id}`, { subject, body }), "Saved", false)}>
              <Save /> Save
            </Button>
            <Button variant="ghost" size="sm" loading={busy === "cancel"} onClick={() => act("cancel", () => post(`/outreach/messages/${message.id}/cancel`), "Discarded")}>
              <Trash2 /> Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { linkedin_note: "LinkedIn note", linkedin_dm: "LinkedIn DM", cover_letter: "Cover letter" };

/** Generate an email / LinkedIn note / DM / cover letter for one contact. */
export function ContactActions({ contact, jobId, onDrafted }: { contact: Contact; jobId?: string; onDrafted?: (m: Message) => void }) {
  const toast = useToast();
  const [tone, setTone] = useState<Tone>("casual");
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Message | null>(null);
  const [text, setText] = useState<{ kind: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = async () => {
    setBusy("email");
    setError(null);
    try {
      const r = await post<{ message: Message }>("/outreach/drafts", { contactId: contact.id, jobId, tone });
      setText(null);
      setDraft(r.message);
      onDrafted?.(r.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const gen = async (kind: "linkedin_note" | "linkedin_dm" | "cover_letter") => {
    setBusy(kind);
    setError(null);
    try {
      const r = await post<{ draft: { content: string } }>("/outreach/generate", { kind, contactId: contact.id, jobId, tone });
      setText({ kind, content: r.draft.content });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="w-auto min-w-[150px]">
          {TONES.map((t) => (
            <option key={t} value={t}>
              {TONE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Button size="sm" loading={busy === "email"} disabled={!contact.email || contact.emailStatus === "invalid"} onClick={email}>
          <Mail /> Draft email
        </Button>
        <Button size="sm" variant="secondary" loading={busy === "linkedin_note"} onClick={() => gen("linkedin_note")}>
          <StickyNote /> LinkedIn note
        </Button>
        <Button size="sm" variant="secondary" loading={busy === "linkedin_dm"} onClick={() => gen("linkedin_dm")}>
          <MessageSquare /> LinkedIn DM
        </Button>
        {jobId && (
          <Button size="sm" variant="secondary" loading={busy === "cover_letter"} onClick={() => gen("cover_letter")}>
            <FileText /> Cover letter
          </Button>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {draft && <MessageEditor message={draft} onDone={() => setDraft(null)} />}
      {text && (
        <div className="rounded-lg border bg-muted/40 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {KIND_LABEL[text.kind] ?? text.kind} · <span className="tabular">{text.content.length} chars{text.kind === "linkedin_note" ? " / 300" : ""}</span>
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(text.content);
                toast("Copied. Paste it into LinkedIn");
              }}
            >
              <Copy /> Copy
            </Button>
          </div>
          <p className="prose-plain text-[13px] leading-relaxed text-secondary-foreground">{text.content}</p>
        </div>
      )}
    </div>
  );
}
