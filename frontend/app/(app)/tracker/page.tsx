"use client";

import { ArrowRightLeft, Ellipsis, ExternalLink, Plus, SquareArrowOutUpRight } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button, ErrorNote, initials, Input, Loading, PageHeader, Select, timeAgo, useToast } from "@/app/components/common";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { errorMessage, patch, post } from "@/app/services/api";
import type { Application } from "@/app/types/api";

const LABEL: Record<string, string> = { found: "Found", emailed: "Emailed", replied: "Replied", interview: "Interview", offer: "Offer", rejected: "Rejected" };
const COLOR: Record<string, string> = { found: "text-muted-foreground", emailed: "text-brand", replied: "text-success", interview: "text-warning", offer: "text-violet", rejected: "text-destructive" };

function StageIcon({ stage }: { stage: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4", COLOR[stage])} aria-hidden>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray={stage === "found" ? "2.4 1.6" : undefined} />
      {stage !== "found" && <path d={stage === "rejected" ? "M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" : "M8 4a4 4 0 0 1 0 8z"} fill={stage === "rejected" ? "none" : "currentColor"} stroke={stage === "rejected" ? "currentColor" : "none"} strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

export default function TrackerPage() {
  const toast = useToast();
  const { data, loading, reload, setData } = useApi<{ stages: string[]; columns: Record<string, Application[]> }>("/crm/board");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [form, setForm] = useState({ company: "", website: "", roleTitle: "", url: "", appliedVia: "", stage: "emailed" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const move = async (appId: string, to: string) => {
    if (!data) return;
    const from = Object.keys(data.columns).find((s) => data.columns[s].some((a) => a.id === appId));
    if (!from || from === to) return;
    const card = data.columns[from].find((a) => a.id === appId)!;
    setData({ ...data, columns: { ...data.columns, [from]: data.columns[from].filter((a) => a.id !== appId), [to]: [{ ...card, stage: to }, ...data.columns[to]] } });
    try {
      await patch(`/crm/applications/${appId}`, { stage: to });
      if (to === "interview") toast("Interview prep pack is ready");
    } catch (e) {
      toast(errorMessage(e), "bad");
    }
    void reload();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await post("/crm/applications", { ...form, website: form.website || undefined, url: form.url || undefined, appliedVia: form.appliedVia || undefined });
      setShowAdd(null);
      setForm({ company: "", website: "", roleTitle: "", url: "", appliedVia: "", stage: "emailed" });
      toast("Added to your tracker");
      void reload();
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };
  const openAdd = (stage: string) => {
    setForm((f) => ({ ...f, stage }));
    setShowAdd(stage);
  };

  return (
    <>
      <PageHeader
        title="Tracker"
        subtitle="Drag cards between stages, or use a card's menu. Emails and replies move cards on their own."
        actions={
          <Button onClick={() => openAdd("emailed")}>
            <Plus /> Log an application
          </Button>
        }
      />
      {loading && !data ? (
        <Loading />
      ) : (
        data && (
          <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
            <LayoutGroup>
              <div className="flex min-w-max gap-3">
                {data.stages.map((stage) => (
                  <section
                    key={stage}
                    aria-label={LABEL[stage]}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(stage);
                    }}
                    onDragLeave={() => setOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOver(null);
                      if (dragging) void move(dragging, stage);
                      setDragging(null);
                    }}
                    className={cn("flex w-[272px] shrink-0 flex-col rounded-xl border bg-sidebar transition-colors", over === stage ? "border-brand/60 bg-brand/5" : "border-border")}
                  >
                    <header className="flex items-center gap-2 px-3 py-2.5">
                      <StageIcon stage={stage} />
                      <span className="text-[13px] font-medium text-foreground">{LABEL[stage]}</span>
                      <span className="text-xs tabular text-subtle-foreground">{data.columns[stage].length}</span>
                      <button onClick={() => openAdd(stage)} aria-label={`Add to ${LABEL[stage]}`} className="ml-auto rounded-md p-1 text-subtle-foreground hover:bg-accent hover:text-foreground">
                        <Plus className="size-3.5" />
                      </button>
                    </header>
                    <div className="flex min-h-28 flex-1 flex-col gap-2 px-2 pb-2">
                      {data.columns[stage].map((a) => (
                        <motion.article
                          key={a.id}
                          layout
                          layoutId={a.id}
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          draggable
                          onDragStart={() => setDragging(a.id)}
                          onDragEnd={() => setDragging(null)}
                          className={cn("group cursor-grab rounded-lg border bg-card p-3 shadow-sm shadow-black/20 transition-colors hover:border-border-strong active:cursor-grabbing", dragging === a.id && "opacity-40")}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] font-semibold text-secondary-foreground">{initials(a.company.name)}</span>
                            <Link href={`/tracker/${a.id}`} className="min-w-0 flex-1" draggable={false}>
                              <p className="truncate text-[13px] font-medium text-foreground">{a.company.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{a.job?.title ?? a.roleTitle ?? "General outreach"}</p>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger aria-label={`Actions for ${a.company.name}`} className="rounded-md p-0.5 text-subtle-foreground opacity-70 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100">
                                <Ellipsis className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/tracker/${a.id}`}>
                                    <SquareArrowOutUpRight /> Open
                                  </Link>
                                </DropdownMenuItem>
                                {a.job && (
                                  <DropdownMenuItem asChild>
                                    <a href={a.job.url} target="_blank" rel="noreferrer">
                                      <ExternalLink /> Job posting
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <ArrowRightLeft className="size-3.5 text-muted-foreground" /> Move to
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuLabel>Stage</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={stage} onValueChange={(v) => void move(a.id, v)}>
                                      {data.stages.map((s) => (
                                        <DropdownMenuRadioItem key={s} value={s}>
                                          {LABEL[s]}
                                        </DropdownMenuRadioItem>
                                      ))}
                                    </DropdownMenuRadioGroup>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-subtle-foreground">
                            <span className="truncate">{a.contact ? a.contact.name : a.source === "manual" ? "Applied by you" : "No contact yet"}</span>
                            <span className="shrink-0">{timeAgo(a.updatedAt)}</span>
                          </div>
                        </motion.article>
                      ))}
                      {data.columns[stage].length === 0 && <p className="rounded-lg border border-dashed px-3 py-6 text-center text-[11px] text-subtle-foreground">Drop a card here</p>}
                    </div>
                  </section>
                ))}
              </div>
            </LayoutGroup>
          </div>
        )
      )}

      <Dialog open={showAdd !== null} onOpenChange={(o) => !o && setShowAdd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log an application</DialogTitle>
            <DialogDescription>For jobs you applied to yourself: company site, LinkedIn Easy Apply, a referral…</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Input label="Company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input label="Role" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} />
            <Input label="Company website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <Input label="Job link" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input label="Applied via" placeholder="LinkedIn Easy Apply, referral…" value={form.appliedVia} onChange={(e) => setForm({ ...form, appliedVia: e.target.value })} />
            <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {Object.entries(LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            {error && (
              <div className="sm:col-span-2">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" loading={busy}>
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
