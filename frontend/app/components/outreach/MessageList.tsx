"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import type { Message } from "@/app/types/api";
import { initials, StatusPill, timeAgo } from "../common";
import { MessageEditor } from "./Composer";

export const MSG_TONE = { sent: "ok", pending_approval: "warn", scheduled: "brand", draft: "neutral", bounced: "bad", failed: "bad", cancelled: "neutral" } as const;
export const MSG_LABEL: Record<string, string> = { sent: "Sent", pending_approval: "Needs approval", scheduled: "Scheduled", draft: "Draft", bounced: "Bounced", failed: "Failed", cancelled: "Cancelled" };

function when(m: Message) {
  if (m.sentAt) return `sent ${timeAgo(m.sentAt)}`;
  if (m.scheduledAt && (m.status === "scheduled" || m.status === "pending_approval")) return `sends ${timeAgo(m.scheduledAt)}`;
  return "";
}

/** Expandable email rows: recipient, subject, status; opens the editor inline. */
export function MessageList({ items, onChanged }: { items: Message[]; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="divide-y">
      {items.map((m) => {
        const isOpen = open === m.id;
        return (
          <li key={m.id}>
            <button className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40", isOpen && "bg-accent/40")} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold text-secondary-foreground">{initials(m.contact?.name ?? m.toEmail)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">
                  <span className="font-medium text-foreground">{m.subject}</span>
                </p>
                <p className="truncate text-xs text-subtle-foreground">
                  To <span className="text-muted-foreground">{m.contact?.name ?? m.toEmail}</span>
                  {m.company ? ` at ${m.company.name}` : ""} · {m.step === 0 ? "first email" : `follow-up ${m.step}`}
                  {m.variant ? ` · variant ${m.variant}` : ""}
                </p>
                {m.error && <p className="mt-0.5 truncate text-xs text-destructive">{m.error}</p>}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <StatusPill tone={MSG_TONE[m.status]}>{MSG_LABEL[m.status] ?? m.status}</StatusPill>
                <span className="text-[11px] text-subtle-foreground">
                  {when(m)}
                  {m.repliedAt ? " · replied" : m.openedAt ? " · opened" : ""}
                </span>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-subtle-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <div className="border-t bg-background/40 p-4">
                    <MessageEditor
                      message={m}
                      onDone={() => {
                        setOpen(null);
                        onChanged();
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
