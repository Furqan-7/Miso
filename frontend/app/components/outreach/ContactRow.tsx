"use client";

import { AtSign, BadgeCheck, ChevronDown, Code, Link2, Newspaper, PenLine, ShieldQuestion, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { errorMessage, post } from "@/app/services/api";
import type { Contact } from "@/app/types/api";
import { ContactActions } from "@/app/components/outreach/Composer";
import { Badge, Button, initials, StatusPill, useToast } from "@/app/components/common";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";

const ROLE_LABEL: Record<string, string> = { founder: "Founder", cto: "CTO / Eng lead", hiring_manager: "Hiring manager", recruiter: "Recruiter", engineer: "Engineer", other: "Contact" };

export function EmailStatus({ contact }: { contact: Contact }) {
  if (!contact.email) return <StatusPill>No email yet</StatusPill>;
  const tone = contact.emailStatus === "valid" ? "ok" : contact.emailStatus === "invalid" ? "bad" : contact.emailStatus === "catch_all" || contact.emailStatus === "risky" ? "warn" : "neutral";
  const label = contact.emailStatus === "valid" ? "Verified" : contact.emailStatus === "catch_all" ? "Catch-all domain" : contact.emailStatus.replace("_", " ");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs text-secondary-foreground">{contact.email}</span>
      <StatusPill tone={tone}>
        {label} · {contact.emailConfidence}%
      </StatusPill>
    </span>
  );
}

export function ContactRow({ contact, jobId, onChange }: { contact: Contact; jobId?: string; onChange?: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (what: string, path: string, ok: string) => {
    setBusy(what);
    try {
      await post(path);
      toast(ok);
      onChange?.();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };
  const links = [
    contact.linkedinUrl && { href: contact.linkedinUrl, label: "LinkedIn", icon: Link2 },
    contact.twitterUrl && { href: contact.twitterUrl, label: "X", icon: AtSign },
    contact.githubUrl && { href: contact.githubUrl, label: "GitHub", icon: Code },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Link2 }[];

  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-secondary-foreground">{initials(contact.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
            {contact.name}
            <Badge>{ROLE_LABEL[contact.role] ?? contact.role}</Badge>
          </p>
          {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
          <div className="mt-1.5">
            <EmailStatus contact={contact} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-subtle-foreground">
            {links.map((l) => (
              <a key={l.label} className="inline-flex items-center gap-1 hover:text-foreground" href={l.href} target="_blank" rel="noreferrer">
                <l.icon className="size-3" /> {l.label}
              </a>
            ))}
            <span>via {contact.source}</span>
          </div>
          {contact.recentPosts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {contact.recentPosts.slice(0, 3).map((p) => (
                <li key={p.title} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Newspaper className="mt-0.5 size-3 shrink-0 text-subtle-foreground" />
                  <span className="min-w-0">
                    <span className="text-subtle-foreground">{p.source}: </span>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {contact.emailCandidates.length > 1 && !contact.emailCandidates.some((c) => c.status === "valid") && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="group flex items-center gap-1 text-[11px] text-subtle-foreground hover:text-muted-foreground">
                <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" /> Other likely addresses
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                  {contact.emailCandidates.map((c) => (
                    <li key={c.email}>
                      {c.email} · {c.confidence}%{c.status ? ` · ${c.status}` : ""}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {contact.email && (
            <Button size="sm" variant="ghost" loading={busy === "v"} onClick={() => run("v", `/contacts/${contact.id}/verify`, "Verification finished")}>
              {contact.emailStatus === "valid" ? <BadgeCheck /> : <ShieldQuestion />} Verify
            </Button>
          )}
          <Button size="sm" variant="ghost" loading={busy === "p"} onClick={() => run("p", `/contacts/${contact.id}/posts`, "Fetched recent posts")}>
            <Newspaper /> Recent posts
          </Button>
          <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <X /> : <PenLine />} {open ? "Close" : "Write"}
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-3.5 border-t pt-3.5 sm:ml-12">
              <ContactActions contact={contact} jobId={jobId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
