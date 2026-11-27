"use client";

import { ExternalLink, GraduationCap, Newspaper, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { ContactRow } from "@/app/components/outreach/ContactRow";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, initials, Input, Loading, timeAgo, useToast } from "@/app/components/common";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { useApi } from "@/app/hooks/useApi";
import { errorMessage, post } from "@/app/services/api";
import type { Company, Contact, Job } from "@/app/types/api";

interface CompanyResp {
  company: Company;
  contacts: Contact[];
  jobs: Job[];
  funding: { id: string; title: string; url: string; amount: string | null; round: string | null }[];
  referrals: Contact[];
  alumni: { name: string; title: string }[];
}

const SIZE = { startup: "Startup", scaleup: "Scale-up", mnc: "MNC" } as Record<string, string>;

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { data, loading, error, reload } = useApi<CompanyResp>(`/companies/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [add, setAdd] = useState({ name: "", title: "", email: "", linkedinUrl: "" });
  const [showAdd, setShowAdd] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error ?? "Not found"}</ErrorNote>;
  const { company, contacts, jobs, funding, referrals, alumni } = data;

  const run = async (what: string, fn: () => Promise<string>) => {
    setBusy(what);
    try {
      toast(await fn());
      await reload();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  const facts = [
    ["Industry", company.industry],
    ["Stage", company.fundingStage],
    ["Size", company.size ? SIZE[company.size] : null],
    ["Team", company.teamSize ? `${company.teamSize} people` : null],
    ["Location", company.location],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-muted to-card text-sm font-semibold text-foreground">{initials(company.name)}</span>
          <div className="min-w-0">
            <h1 className="display text-[22px] font-semibold text-foreground">{company.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
              {company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  {company.domain} <ExternalLink className="size-3" />
                </a>
              ) : (
                company.domain
              )}
              {company.location && <span>· {company.location}</span>}
              {company.size && <span>· {SIZE[company.size]}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === "research"} onClick={() => run("research", async () => { await post(`/companies/${id}/research`); return "Research card updated"; })}>
            <RefreshCw /> Refresh research
          </Button>
          <Button
            loading={busy === "people"}
            disabled={!company.domain}
            title={company.domain ? undefined : "Add the company website first"}
            onClick={() =>
              run("people", async () => {
                const r = await post<{ contacts: Contact[]; pattern: { pattern: string | null; confidence: number } }>(`/companies/${id}/find-people`);
                return `Found ${r.contacts.length} people${r.pattern.pattern ? `; email pattern ${r.pattern.pattern}@` : ""}`;
              })
            }
          >
            <Search /> Find people &amp; emails
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="People"
              subtitle={company.emailPattern ? `Email pattern ${company.emailPattern}@${company.domain} · ${Math.round(company.emailPatternConfidence * 100)}% confident` : "We verify every address (MX and SMTP) before you send"}
              action={
                <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
                  <UserPlus /> Add person
                </Button>
              }
            />
            {contacts.length ? (
              <div className="divide-y">
                {contacts.map((c) => (
                  <ContactRow key={c.id} contact={c} jobId={jobs[0]?.id} onChange={reload} />
                ))}
              </div>
            ) : (
              <Empty icon={<Users className="size-4" />} title="No people yet" body="Click “Find people & emails” to search the company site, GitHub and job posts." />
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Open roles" subtitle={jobs.length ? `${jobs.length} tracked` : undefined} />
            {jobs.length ? (
              <ul className="divide-y">
                {jobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                    <div className="min-w-0">
                      <Link href={`/jobs/${j.id}`} className="text-[13px] font-medium text-foreground hover:underline">
                        {j.title}
                      </Link>
                      <p className="text-xs text-subtle-foreground">
                        {j.location ?? "Location not listed"} · {timeAgo(j.createdAt)}
                      </p>
                    </div>
                    {j.remote && <Badge tone="brand">Remote</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-xs text-muted-foreground">No open roles tracked. Cold outreach still works: startups often hire before they post.</p>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Research card</p>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary-foreground">{company.product ?? company.description ?? "Run research to fill this in."}</p>
            {facts.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-2">
                {facts.map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-muted/30 px-2.5 py-2">
                    <dt className="text-[11px] text-subtle-foreground">{k}</dt>
                    <dd className="mt-0.5 truncate text-xs font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {company.techStack.length > 0 && (
              <>
                <p className="mb-1.5 mt-4 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Tech stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {company.techStack.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </>
            )}
            {company.researchedAt && <p className="mt-4 text-[11px] text-subtle-foreground">Updated {timeAgo(company.researchedAt)}</p>}
          </Card>

          {(funding.length > 0 || company.recentNews.length > 0) && (
            <Card className="overflow-hidden">
              <CardHeader title="Recent news" />
              <ul className="divide-y">
                {funding.map((f) => (
                  <li key={f.id} className="flex gap-2 px-4 py-3 text-xs">
                    <Badge tone="ok" className="shrink-0">
                      {[f.amount, f.round].filter(Boolean).join(" ") || "Funding"}
                    </Badge>
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-secondary-foreground hover:text-foreground hover:underline">
                      {f.title}
                    </a>
                  </li>
                ))}
                {company.recentNews
                  .filter((n) => !funding.some((f) => f.title === n.title))
                  .slice(0, 5)
                  .map((n) => (
                    <li key={n.title} className="flex gap-2 px-4 py-3 text-xs text-secondary-foreground">
                      <Newspaper className="mt-px size-3.5 shrink-0 text-subtle-foreground" />
                      {n.url ? (
                        <a href={n.url} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                          {n.title}
                        </a>
                      ) : (
                        n.title
                      )}
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          <Card className="overflow-hidden">
            <CardHeader title="Referral paths" subtitle="Alumni from your college here" />
            {referrals.length + alumni.length === 0 ? (
              <p className="px-4 py-5 text-xs leading-relaxed text-muted-foreground">No alumni found yet. Add your college in Settings; on the College plan, classmates&apos; past employers show up here too.</p>
            ) : (
              <ul className="divide-y">
                {referrals.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5 px-4 py-3 text-xs">
                    <GraduationCap className="size-3.5 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-foreground">{r.name}</span> <span className="text-muted-foreground">· {r.title}</span>
                    </span>
                    <Badge tone="info">{r.college}</Badge>
                  </li>
                ))}
                {alumni.map((a) => (
                  <li key={a.name + a.title} className="flex items-center gap-2.5 px-4 py-3 text-xs">
                    <GraduationCap className="size-3.5 shrink-0 text-violet" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-foreground">{a.name}</span> <span className="text-muted-foreground">· was {a.title}</span>
                    </span>
                    <Badge tone="violet">Classmate</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a person at {company.name}</DialogTitle>
            <DialogDescription>If you don&apos;t know their email, we guess it from the company&apos;s pattern and verify it.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run("add", async () => {
                await post(`/companies/${id}/contacts`, { name: add.name, title: add.title || undefined, email: add.email || undefined, linkedinUrl: add.linkedinUrl || undefined });
                setAdd({ name: "", title: "", email: "", linkedinUrl: "" });
                setShowAdd(false);
                return "Added. We guessed and checked their email";
              });
            }}
          >
            <Input label="Full name" required value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <Input label="Title" value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} />
            <Input label="Email (if known)" type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            <Input label="LinkedIn URL" value={add.linkedinUrl} onChange={(e) => setAdd({ ...add, linkedinUrl: e.target.value })} />
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" loading={busy === "add"}>
                Save person
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
