"use client";

import { CircleCheck, CircleX, Flame, MailCheck, ShieldCheck, ShieldOff, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CardHeader, Empty, Input, LinkButton, Loading, PageHeader, Score, Select, StatusPill, timeAgo, useToast } from "@/app/components/common";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { Progress } from "@/app/components/ui/progress";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { errorMessage, post } from "@/app/services/api";
import type { EmailAccount } from "@/app/types/api";

interface Check { ok: boolean; record?: string | null; issues?: string[]; selectors?: string[]; hosts?: string[]; provider?: string | null; policy?: string | null }
interface DnsResult { domain: string; hostedProvider: boolean; mx: Check; spf: Check; dkim: Check; dmarc: Check; score: number; guides: { title: string; steps: string[] }[] }
interface Health {
  health: { score: number; factors: { label: string; impact: number }[]; stats: { sent: number; bounced: number; replies: number } };
  lastCheck: { result: DnsResult; createdAt: string } | null;
  placementTests: { id: string; seedEmail: string; result: string; createdAt: string }[];
  suppressions: { id: string; email: string; reason: string; createdAt: string }[];
}

const RECORD_HELP: Record<string, string> = { MX: "Where your domain receives mail", SPF: "Which servers may send as you", DKIM: "Cryptographic signature on every email", DMARC: "What receivers do when checks fail" };

function Row({ name, check, detail }: { name: string; check: Check; detail?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border", check.ok ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>{check.ok ? <CircleCheck className="size-3.5" /> : <CircleX className="size-3.5" />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">
          {name} <span className="font-normal text-subtle-foreground">· {RECORD_HELP[name]}</span>
        </p>
        {detail && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{detail}</p>}
        {check.issues?.map((i) => (
          <p key={i} className="mt-0.5 text-xs text-warning">
            {i}
          </p>
        ))}
      </div>
      <StatusPill tone={check.ok ? "ok" : "bad"}>{check.ok ? "Pass" : "Fix"}</StatusPill>
    </div>
  );
}

export default function DeliverabilityPage() {
  const toast = useToast();
  const accounts = useApi<{ items: EmailAccount[] }>("/mailboxes");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seed, setSeed] = useState("");
  const account = accounts.data?.items.find((a) => a.id === selected) ?? accounts.data?.items[0];

  const health = useApi<Health>(account ? `/mailboxes/${account.id}/health` : null);
  const h = health.data;

  if (accounts.loading && !accounts.data) return <Loading />;
  if (!account)
    return (
      <>
        <PageHeader title="Deliverability" subtitle="Keep your emails out of spam and your account safe." />
        <Card>
          <Empty
            icon={<ShieldCheck className="size-4" />}
            title="No mailbox connected"
            body="Connect Gmail or Outlook to check SPF, DKIM, DMARC and your inbox health."
            action={
              <LinkButton href="/settings?tab=mailboxes" size="sm">
                Connect a mailbox
              </LinkButton>
            }
          />
        </Card>
      </>
    );

  const act = async (what: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(what);
    try {
      await fn();
      toast(ok);
      await Promise.all([health.reload(), accounts.reload()]);
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };
  const dns = h?.lastCheck?.result;
  const passed = dns ? [dns.mx, dns.spf, dns.dkim, dns.dmarc].filter((c) => c.ok).length : 0;
  const warm = Math.min(100, (account.todayLimit / Math.max(account.dailyLimit, 1)) * 100);

  return (
    <>
      <PageHeader
        title="Deliverability"
        subtitle="Keep your emails out of spam and your account safe."
        actions={
          <>
            {(accounts.data?.items.length ?? 0) > 1 && (
              <Select aria-label="Mailbox" value={account.id} onChange={(e) => setSelected(e.target.value)} className="w-64">
                {accounts.data!.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email}
                  </option>
                ))}
              </Select>
            )}
            <Button loading={busy === "check"} onClick={() => act("check", () => post(`/mailboxes/${account.id}/check`), "DNS records checked")}>
              <Stethoscope /> Run checks
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="Domain authentication"
              subtitle={dns ? `${dns.domain} · checked ${timeAgo(h?.lastCheck?.createdAt)}` : "Run checks to see SPF, DKIM and DMARC"}
              action={dns && <Badge tone={passed === 4 ? "ok" : passed >= 2 ? "warn" : "bad"}>{passed}/4 passing</Badge>}
            />
            {dns ? (
              <div className="divide-y">
                <Row name="MX" check={dns.mx} detail={dns.mx.hosts?.slice(0, 2).join(", ") || dns.mx.provider || ""} />
                <Row name="SPF" check={dns.spf} detail={dns.spf.record ?? "missing"} />
                <Row name="DKIM" check={dns.dkim} detail={dns.dkim.selectors?.join(", ") || "no selector found"} />
                <Row name="DMARC" check={dns.dmarc} detail={dns.dmarc.record ?? "missing"} />
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <ShieldOff className="size-5 text-subtle-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">No checks yet. They take a few seconds.</p>
              </div>
            )}
          </Card>
          {dns?.guides.length ? (
            <Card className="overflow-hidden">
              <CardHeader title="How to fix it" subtitle="Step-by-step for your DNS provider" />
              <Accordion type="single" collapsible className="px-4">
                {dns.guides.map((g) => (
                  <AccordionItem key={g.title} value={g.title}>
                    <AccordionTrigger className="py-3 text-[13px]">{g.title}</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal space-y-1 pl-4 text-xs text-secondary-foreground">
                        {g.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ) : null}
          <Card className="overflow-hidden">
            <CardHeader title="Inbox placement test" subtitle="Send a test to another mailbox you own and see whether it lands in Inbox or Spam" />
            <div className="flex flex-wrap items-end gap-2 p-4">
              <div className="min-w-56 flex-1">
                <Input label="Seed address" type="email" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="your-other-account@gmail.com" />
              </div>
              <Button loading={busy === "seed"} disabled={!seed} onClick={() => act("seed", () => post(`/mailboxes/${account.id}/placement-test`, { seedEmail: seed }), "Test email sent")}>
                <MailCheck /> Send test
              </Button>
              {accounts.data!.items
                .filter((a) => a.id !== account.id && a.provider === "gmail")
                .map((s) => (
                  <Button key={s.id} variant="secondary" loading={busy === "chk"} onClick={() => act("chk", () => post(`/mailboxes/${account.id}/placement-check`, { seedAccountId: s.id }), "Placement checked")}>
                    Check via {s.email}
                  </Button>
                ))}
            </div>
            {(h?.placementTests.length ?? 0) > 0 && (
              <ul className="divide-y border-t">
                {h!.placementTests.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="text-secondary-foreground">
                      {t.seedEmail} <span className="text-subtle-foreground">· {timeAgo(t.createdAt)}</span>
                    </span>
                    <StatusPill tone={t.result === "inbox" ? "ok" : t.result === "spam" ? "bad" : "neutral"}>{t.result}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3.5">
              <Score value={h?.health.score ?? account.healthScore} size="lg" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">Inbox health</p>
                <p className="truncate text-xs text-muted-foreground">{account.email}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-xs">
              {(h?.health.factors ?? []).map((f) => (
                <li key={f.label} className="flex justify-between gap-2">
                  <span className="text-secondary-foreground">{f.label}</span>
                  <span className={cn("font-medium tabular", f.impact < 0 ? "text-warning" : "text-success")}>
                    {f.impact > 0 ? "+" : ""}
                    {f.impact}
                  </span>
                </li>
              ))}
              {h && h.health.factors.length === 0 && <li className="text-muted-foreground">No problems found.</li>}
            </ul>
            {h && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                {(
                  [
                    ["Sent", h.health.stats.sent],
                    ["Bounced", h.health.stats.bounced],
                    ["Replies", h.health.stats.replies],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[15px] font-semibold tabular text-foreground">{v}</p>
                    <p className="text-[11px] text-subtle-foreground">{k} · 30d</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Flame className="size-4 text-warning" /> Warm-up
            </p>
            {account.warmupEnabled ? (
              <>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Day {account.warmupDay ?? 1}: up to <span className="font-semibold text-foreground">{account.todayLimit}</span> emails today (target {account.dailyLimit} a day). Grows about 20% a day.
                </p>
                <Progress value={warm} className="mt-3" aria-label="Warm-up progress" />
              </>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Off. Sending up to {account.todayLimit} a day.</p>
            )}
            <p className="mt-3 text-[11px] text-subtle-foreground">Sent today: {account.sentToday}. Change limits in Settings.</p>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Suppression list" subtitle="Bounced or unsubscribed: never emailed again" />
            {(h?.suppressions.length ?? 0) === 0 ? (
              <p className="px-4 py-5 text-xs text-muted-foreground">Clean list.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {h!.suppressions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span className="truncate font-mono text-[11px] text-secondary-foreground">{s.email}</span>
                    <Badge>{s.reason}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
