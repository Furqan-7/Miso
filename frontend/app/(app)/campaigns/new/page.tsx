"use client";

import { Bot, Check, Eye, Lock, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { COMPANY_SIZES, TONES } from "shared";
import { useState, type ReactNode } from "react";
import { useSession } from "@/app/(app)/AppShell";
import { Badge, Button, Card, Chips, ErrorNote, Input, LinkButton, PageHeader, Select, SwitchField } from "@/app/components/common";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { cn } from "@/app/lib/utils";
import { api, del, errorMessage, post } from "@/app/services/api";
import type { Campaign } from "@/app/types/api";

const FOLLOWUP_DAYS = ["2", "3", "5", "7", "10", "14", "21"] as const;
const SIZE_LABEL = { startup: "Startups", scaleup: "Scale-ups", mnc: "MNCs" };
const hour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

function Section({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold tabular text-secondary-foreground">{step}</span>
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </Card>
  );
}

function ModeCard({ active, disabled, onClick, icon, title, body, badge }: { active: boolean; disabled?: boolean; onClick: () => void; icon: ReactNode; title: string; body: string; badge?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative flex flex-col gap-2 rounded-lg border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60", active ? "border-foreground/50 bg-accent/60" : "hover:border-border-strong hover:bg-accent/30")}
    >
      <span className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md border bg-muted text-muted-foreground [&_svg]:size-3.5">{icon}</span>
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        {badge}
        <span className={cn("ml-auto flex size-4 items-center justify-center rounded-full border", active ? "border-foreground bg-foreground text-background" : "border-border-strong")}>{active && <Check className="size-2.5" strokeWidth={3} />}</span>
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
  );
}

export default function NewCampaign() {
  const router = useRouter();
  const { user } = useSession();
  const pro = user.plan !== "free";
  const [f, setF] = useState({
    name: "Startups hiring frontend",
    query: "",
    minScore: 60,
    remoteOnly: false,
    companySizes: [] as string[],
    mode: "approval" as "approval" | "autopilot",
    tone: "casual",
    abTest: false,
    followups: ["3", "7", "14"] as string[],
    startHour: 9,
    endHour: 17,
    preferredHour: 10,
    weekdaysOnly: true,
  });
  const [preview, setPreview] = useState<{ count: number; companies: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const days = f.followups.map(Number).sort((a, b) => a - b);

  const body = () => ({
    name: f.name,
    mode: f.mode,
    tone: f.tone,
    abTest: f.abTest,
    filters: { query: f.query || undefined, minScore: f.minScore, remoteOnly: f.remoteOnly || undefined, companySizes: f.companySizes.length ? f.companySizes : undefined },
    sequence: [{ dayOffset: 0, kind: "initial" }, ...days.map((d) => ({ dayOffset: d, kind: "followup" }))],
    sendWindow: { startHour: f.startHour, endHour: f.endHour, preferredHour: f.preferredHour, weekdaysOnly: f.weekdaysOnly },
  });

  const save = async (launch: boolean) => {
    setBusy(launch ? "launch" : "preview");
    setError(null);
    try {
      const { campaign } = await post<{ campaign: Campaign }>("/campaigns", body());
      if (!launch) {
        setPreview(await api<{ count: number; companies: string[] }>(`/campaigns/${campaign.id}/preview`));
        await del(`/campaigns/${campaign.id}`);
        return;
      }
      await post(`/campaigns/${campaign.id}/launch`);
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="New campaign" subtitle="We pick one person per company, draft an email for each, and follow up until they reply." />
      {!pro && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-[13px] text-warning">
          <Lock className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">Bulk campaigns are a Pro feature. On Free, draft emails one at a time from any job or company page (approval mode, 15 sends a day).</p>
          <LinkButton href="/settings?tab=plan" size="sm" variant="secondary">
            See plans
          </LinkButton>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section step={1} title="Who to reach" description="Matching jobs, one decision-maker per company.">
            <Input label="Campaign name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input label="Keyword in title or description" placeholder="frontend, intern, React…" value={f.query} onChange={(e) => setF({ ...f, query: e.target.value })} />
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between">
                <Label id="min-score-label">Minimum match score</Label>
                <span className="rounded-md border bg-muted px-1.5 py-0.5 text-xs font-semibold tabular text-foreground">{f.minScore}</span>
              </div>
              <Slider aria-labelledby="min-score-label" min={0} max={100} step={5} value={[f.minScore]} onValueChange={([v]) => setF({ ...f, minScore: v })} />
              <div className="flex justify-between text-[11px] text-subtle-foreground">
                <span>Any</span>
                <span>Strong matches only</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Company size</Label>
              <Chips options={COMPANY_SIZES} value={f.companySizes as never[]} onChange={(v) => setF({ ...f, companySizes: v })} labels={SIZE_LABEL} />
              <p className="text-[11px] text-subtle-foreground">Leave empty for all sizes.</p>
            </div>
            <SwitchField label="Remote roles only" checked={f.remoteOnly} onChange={(v) => setF({ ...f, remoteOnly: v })} />
          </Section>

          <Section step={2} title="How to send" description="Review each email yourself, or let it run.">
            <div role="radiogroup" aria-label="Mode" className="grid gap-2.5 sm:grid-cols-2">
              <ModeCard active={f.mode === "approval"} onClick={() => setF({ ...f, mode: "approval" })} icon={<UserCheck />} title="Approval" body="Drafts wait in Needs approval. Nothing goes out until you press send." />
              <ModeCard
                active={f.mode === "autopilot"}
                disabled={!pro}
                onClick={() => setF({ ...f, mode: "autopilot" })}
                icon={<Bot />}
                title="Autopilot"
                body="Emails send on their own inside your window, within daily limits."
                badge={!pro && <Badge tone="violet">Pro</Badge>}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Tone" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t === "founder" ? "Founder-to-founder" : t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
              <Select label="Send at (their local time)" value={f.preferredHour} onChange={(e) => setF({ ...f, preferredHour: Number(e.target.value) })} hint="In the recipient's time zone">
                {Array.from({ length: 12 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={h}>
                    {hour(h)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 rounded-lg border p-3.5">
              <SwitchField label="Weekdays only" description="Skip Saturdays and Sundays in their time zone." checked={f.weekdaysOnly} onChange={(v) => setF({ ...f, weekdaysOnly: v })} />
              <SwitchField
                label={
                  <span className="flex items-center gap-2">
                    A/B test subject lines {!pro && <Badge tone="violet">Pro</Badge>}
                  </span>
                }
                description="Two subjects per campaign; analytics shows which one gets replies."
                checked={f.abTest}
                disabled={!pro}
                onChange={(v) => setF({ ...f, abTest: v })}
              />
            </div>
          </Section>

          <Section step={3} title="Follow-ups" description="Sent in the same thread. They stop the moment someone replies.">
            <div className="grid gap-2">
              <Label>Follow up on day</Label>
              <Chips options={FOLLOWUP_DAYS} value={f.followups as never[]} onChange={(v) => setF({ ...f, followups: v })} labels={Object.fromEntries(FOLLOWUP_DAYS.map((d) => [d, `Day ${d}`]))} />
            </div>
            <ol className="relative flex items-start gap-0 overflow-x-auto pb-1" aria-label="Sequence">
              {[0, ...days].map((d, i, all) => (
                <li key={d} className="flex min-w-[88px] flex-1 flex-col items-start">
                  <div className="flex w-full items-center">
                    <motion.span layout className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold", i === 0 ? "border-brand/50 bg-brand/15 text-brand" : "bg-muted text-secondary-foreground")}>
                      {i === 0 ? <Mail className="size-3.5" /> : i}
                    </motion.span>
                    {i < all.length - 1 && <span className="mx-1.5 h-px flex-1 border-t border-dashed border-border-strong" />}
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground">Day {d}</p>
                  <p className="text-[11px] text-subtle-foreground">{i === 0 ? "First email" : `Follow-up ${i}`}</p>
                </li>
              ))}
            </ol>
          </Section>

          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" loading={busy === "preview"} onClick={() => save(false)}>
              <Eye /> Preview targets
            </Button>
            <Button loading={busy === "launch"} onClick={() => save(true)}>
              {f.mode === "autopilot" ? "Launch on autopilot" : "Create drafts for review"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Summary</p>
            <dl className="mt-3 space-y-2 text-xs">
              {[
                ["Match score", `${f.minScore}+`],
                ["Company size", f.companySizes.length ? f.companySizes.map((s) => SIZE_LABEL[s as keyof typeof SIZE_LABEL]).join(", ") : "Any"],
                ["Location", f.remoteOnly ? "Remote only" : "Anywhere"],
                ["Mode", f.mode === "autopilot" ? "Autopilot" : "Approval"],
                ["Emails per contact", String(days.length + 1)],
                ["Sends at", `${hour(f.preferredHour)}${f.weekdaysOnly ? ", weekdays" : ""}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            {preview && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-t pt-4">
                <p className="text-[13px] font-medium text-foreground">
                  {preview.count} matching {preview.count === 1 ? "job" : "jobs"} at {preview.companies.length} {preview.companies.length === 1 ? "company" : "companies"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.companies.slice(0, 20).map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              <ShieldCheck className="size-4 text-success" /> Safety limits
            </p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {["Sends from your own mailbox, never a shared server", "Daily cap per plan and mailbox, with warm-up for new accounts", "1.5 to 7 minute random gaps between emails", "Only verified addresses; bounces are suppressed", "One person per company, never emailed twice"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-3 shrink-0 text-subtle-foreground" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
