"use client";

import { ArrowLeft, Bookmark, Check, CircleCheck, ExternalLink, OctagonAlert, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { ContactRow } from "@/app/components/outreach/ContactRow";
import { salary, SOURCE_LABEL } from "@/app/components/jobs/JobCard";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, LinkButton, Loading, PageHeader, Score, useToast } from "@/app/components/common";
import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { useApi } from "@/app/hooks/useApi";
import { errorMessage, post } from "@/app/services/api";
import type { Company, Contact, Job, Match } from "@/app/types/api";

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ job: Job; match: Match | null; company: Company | null; contacts: Contact[] }>(`/jobs/${id}`);
  const [ai, setAi] = useState<{ score: number; reasons: string[]; concerns: string[]; source: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error ?? "Not found"}</ErrorNote>;
  const { job, match, company, contacts } = data;

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    try {
      await fn();
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Link href="/jobs" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All jobs
      </Link>
      <PageHeader
        title={job.title}
        subtitle={
          <>
            {company ? (
              <Link href={`/companies/${company.id}`} className="text-secondary-foreground hover:underline">
                {job.companyName}
              </Link>
            ) : (
              job.companyName
            )}
            {job.location ? ` · ${job.location}` : ""}
            {salary(job) ? ` · ${salary(job)}` : ""}
          </>
        }
        actions={
          <>
            <a href={job.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "bg-transparent")}>
              <ExternalLink /> Open posting
            </a>
            <Button variant="secondary" onClick={() => run("save", async () => { await post(`/jobs/${job.id}/status`, { status: "saved" }); toast("Saved to tracker"); })} loading={busy === "save"}>
              <Bookmark /> Save
            </Button>
            <Button onClick={() => run("applied", async () => { await post(`/jobs/${job.id}/status`, { status: "applied" }); toast("Logged as applied"); })} loading={busy === "applied"}>
              <CircleCheck /> I applied
            </Button>
          </>
        }
      />

      {job.scamScore >= 25 && (
        <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.07] p-4 text-[13px] text-destructive">
          <OctagonAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">This posting has signs of a scam ({job.scamScore}/100)</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {job.scamReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Never pay to apply, and never share bank or ID documents before an offer.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="People to contact"
              subtitle={company ? "Founders and CTOs first at startups; hiring managers and recruiters at bigger companies" : undefined}
              action={
                company && (
                  <LinkButton href={`/companies/${company.id}`} variant="ghost" size="sm">
                    <Users /> Find more
                  </LinkButton>
                )
              }
            />
            {contacts.length ? (
              <div className="divide-y">
                {contacts.map((c) => (
                  <ContactRow key={c.id} contact={c} jobId={job.id} onChange={reload} />
                ))}
              </div>
            ) : (
              <Empty
                icon={<Users className="size-4" />}
                title="No contacts yet"
                body="Open the company page to find the founder, CTO or recruiter and verify their email."
                action={
                  company && (
                    <LinkButton href={`/companies/${company.id}`} variant="secondary" size="sm">
                      Find people
                    </LinkButton>
                  )
                }
              />
            )}
          </Card>
          <Card>
            <CardHeader title="Job description" />
            <div className="prose-plain max-h-[32rem] overflow-y-auto p-4 text-[13px] leading-relaxed text-secondary-foreground">{job.description || "No description provided."}</div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3.5">
              <Score value={match?.score ?? 0} size="lg" />
              <div>
                <p className="text-[13px] font-semibold text-foreground">Match score</p>
                <p className="text-xs text-muted-foreground">How well this fits your profile</p>
              </div>
            </div>
            {match && (
              <>
                <ul className="mt-4 space-y-2 text-xs text-secondary-foreground">
                  {match.reasons.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Check className="mt-px size-3.5 shrink-0 text-success" /> {r}
                    </li>
                  ))}
                </ul>
                {match.missingSkills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Skills you don&apos;t list</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missingSkills.map((s) => (
                        <Badge key={s} tone="warn">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <Button className="mt-4 w-full" variant="secondary" loading={busy === "ai"} onClick={() => run("ai", async () => { setAi(await post(`/jobs/${job.id}/ai-match`)); void reload(); })}>
              <Sparkles /> Ask AI for a second opinion
            </Button>
            {ai && (
              <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
                <p className="font-medium text-foreground">
                  AI score {ai.score}
                  {ai.source === "fallback" && <span className="font-normal text-subtle-foreground"> · rule-based (AI not configured)</span>}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {ai.reasons.map((r) => (
                    <li key={r} className="text-secondary-foreground">
                      + {r}
                    </li>
                  ))}
                  {ai.concerns.map((r) => (
                    <li key={r} className="text-muted-foreground">
                      – {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card className="p-4 text-xs">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Found on</p>
            <ul className="space-y-1.5">
              {job.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-secondary-foreground hover:text-foreground">
                    {SOURCE_LABEL[s.source] ?? s.source} <ExternalLink className="size-3 text-subtle-foreground" />
                  </a>
                </li>
              ))}
            </ul>
            {company?.product && (
              <p className="mt-4 leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Product: </span>
                {company.product}
              </p>
            )}
            {company && company.techStack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {company.techStack.slice(0, 10).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
