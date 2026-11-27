"use client";

import { Bookmark, BookmarkCheck, CircleCheck, Ellipsis, EyeOff, ExternalLink, Globe, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Input, Loading, PageHeader, Select, SwitchField, Textarea, useToast } from "@/app/components/common";
import { JobCard, SOURCE_LABEL } from "@/app/components/jobs/JobCard";
import { Button as UIButton } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Input as UIInput } from "@/app/components/ui/input";
import { useApi } from "@/app/hooks/useApi";
import { errorMessage, post } from "@/app/services/api";
import type { Job } from "@/app/types/api";

export default function JobsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState("");
  const [remote, setRemote] = useState(false);
  const params = new URLSearchParams({ ...(q ? { q } : {}), ...(minScore ? { minScore: String(minScore) } : {}), ...(source ? { source } : {}), ...(remote ? { remote: "true" } : {}) });
  const jobs = useApi<{ items: Job[] }>(`/jobs?${params}`);
  const [panel, setPanel] = useState<"none" | "add" | "track">("none");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", url: "", description: "", location: "" });
  const [careers, setCareers] = useState({ url: "", companyName: "" });
  const [err, setErr] = useState<string | null>(null);

  const setStatus = async (job: Job, status: "saved" | "dismissed" | "applied") => {
    await post(`/jobs/${job.id}/status`, { status });
    toast(status === "dismissed" ? "Hidden from your feed" : status === "saved" ? "Saved to your tracker" : "Logged as applied");
    void jobs.reload();
  };

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await post("/jobs/import", { ...form, source: "manual", location: form.location || undefined });
      toast("Job added and scored");
      setForm({ title: "", company: "", url: "", description: "", location: "" });
      setPanel("none");
      void jobs.reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await post<{ ats: { type: string } | null; imported: number; error?: string }>("/jobs/track-careers-page", { url: careers.url, companyName: careers.companyName || undefined });
      toast(r.ats ? `Tracking ${r.ats.type} board: ${r.imported} jobs imported${r.error ? ` (${r.error})` : ""}` : "Saved. We'll check this page during discovery.");
      setPanel("none");
      void jobs.reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const items = jobs.data?.items ?? [];
  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Every role we found, scored against your profile. The same job on several boards is merged into one."
        actions={
          <>
            <Button variant="secondary" onClick={() => setPanel("track")}>
              <Globe /> Track a careers page
            </Button>
            <Button onClick={() => setPanel("add")}>
              <Plus /> Add a job
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <UIInput placeholder="Search title, company, stack…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" className="pl-8" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
            <Select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Minimum score" className="md:w-36">
              <option value={0}>Any score</option>
              <option value={50}>Score 50+</option>
              <option value={70}>Score 70+</option>
              <option value={85}>Score 85+</option>
            </Select>
            <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source" className="md:w-44">
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:pl-2">
            <SwitchField label="Remote only" checked={remote} onChange={setRemote} />
          </div>
        </div>
        <div className="flex items-center justify-between border-b px-4 py-2 text-[11px] text-subtle-foreground">
          <span>{jobs.loading && !jobs.data ? "Loading…" : `${items.length} ${items.length === 1 ? "job" : "jobs"}`}</span>
          <span>Sorted by match score</span>
        </div>
        {jobs.loading && !jobs.data ? (
          <Loading />
        ) : items.length ? (
          <div className="divide-y">
            {items.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                actions={
                  <>
                    <UIButton size="sm" variant={j.match?.status === "saved" ? "secondary" : "outline"} className="bg-transparent" onClick={() => setStatus(j, "saved")}>
                      {j.match?.status === "saved" ? <BookmarkCheck /> : <Bookmark />}
                      {j.match?.status === "saved" ? "Saved" : "Save"}
                    </UIButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <UIButton size="icon-sm" variant="ghost" aria-label={`More actions for ${j.title}`}>
                          <Ellipsis />
                        </UIButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setStatus(j, "applied")}>
                          <CircleCheck /> I applied
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={j.url} target="_blank" rel="noreferrer">
                            <ExternalLink /> Open posting
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setStatus(j, "dismissed")}>
                          <EyeOff /> Hide
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <Empty icon={<Search className="size-4" />} title="No jobs match these filters" body="Try a lower score, or run discovery from the dashboard." />
        )}
      </Card>

      <Dialog open={panel === "add"} onOpenChange={(o) => setPanel(o ? "add" : "none")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a job you found</DialogTitle>
            <DialogDescription>From LinkedIn, Wellfound, a referral… We&apos;ll score it and track it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addJob} className="grid gap-3 sm:grid-cols-2">
            <Input label="Job title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input label="Link" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <div className="sm:col-span-2">
              <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {err && (
              <div className="sm:col-span-2">
                <ErrorNote>{err}</ErrorNote>
              </div>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" loading={busy}>
                Add job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "track"} onOpenChange={(o) => setPanel(o ? "track" : "none")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track a company&apos;s careers page</DialogTitle>
            <DialogDescription>Greenhouse, Lever, Ashby and Workable boards are pulled automatically on every discovery run.</DialogDescription>
          </DialogHeader>
          <form onSubmit={track} className="grid gap-3">
            <Input label="Careers page URL" type="url" required placeholder="https://jobs.ashbyhq.com/company" value={careers.url} onChange={(e) => setCareers({ ...careers, url: e.target.value })} />
            <Input label="Company name" value={careers.companyName} onChange={(e) => setCareers({ ...careers, companyName: e.target.value })} />
            {err && <ErrorNote>{err}</ErrorNote>}
            <DialogFooter>
              <Button type="submit" loading={busy}>
                Track
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
