"use client";

import { Bell, CreditCard, ExternalLink, FlaskConical, Mail, Unplug, Upload, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/app/(app)/AppShell";
import { Badge, Button, Card, Input, Loading, PageHeader, StatusPill, SwitchField, TagInput, Textarea, useToast } from "@/app/components/common";
import { buttonVariants } from "@/app/components/ui/button";
import { Input as UIInput } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Progress } from "@/app/components/ui/progress";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { api, del, errorMessage, patch, post, put } from "@/app/services/api";
import type { EmailAccount } from "@/app/types/api";

interface Billing {
  plan: string;
  plans: { id: string; label: string; priceMonthlyUsd: number; dailySends: number; monthlyAiDrafts: number; autopilot: boolean; mailboxes: number }[];
  usage: Record<string, { used: number; limit: number; period: string }>;
}

type Tab = "profile" | "mailboxes" | "plan" | "notifications";
const TABS: { id: Tab; label: string; icon: typeof Mail }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "mailboxes", label: "Mailboxes", icon: Mail },
  { id: "plan", label: "Plan & usage", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const USAGE_LABEL: Record<string, string> = { sends: "Emails sent", ai_drafts: "AI drafts", verifications: "Email verifications" };

/** Two-column settings row: label and help on the left, controls on the right. */
function Row({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-5 md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 space-y-3">{children}</div>
    </div>
  );
}

function SettingsInner() {
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, reload } = useSession();
  const mailboxes = useApi<{ items: EmailAccount[]; oauth: { google: boolean; microsoft: boolean } }>("/mailboxes");
  const billing = useApi<Billing>("/billing");
  const [busy, setBusy] = useState<string | null>(null);
  const [p, setP] = useState({
    name: user.name,
    headline: profile.headline ?? "",
    skills: profile.skills,
    github: profile.links.github ?? "",
    portfolio: profile.links.portfolio ?? "",
    linkedin: profile.links.linkedin ?? "",
    writingSample: profile.writingSample ?? "",
    college: profile.college ?? "",
    resumeUrl: profile.resumeUrl ?? "",
    publicVisible: profile.publicVisible,
    weeklyGoal: user.weeklyGoal,
  });
  const [prefs, setPrefs] = useState({ ...user.notificationPrefs, phone: user.phone ?? "" });

  const fromUrl = params.get("tab") as Tab | null;
  const tab: Tab = fromUrl && TABS.some((t) => t.id === fromUrl) ? fromUrl : params.get("mailbox") || params.get("mailbox_error") ? "mailboxes" : "profile";
  const setTab = (t: string) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  useEffect(() => {
    if (params.get("mailbox") === "connected") toast("Mailbox connected. Reply tracking is on");
    if (params.get("mailbox_error")) toast(`Couldn't connect mailbox: ${params.get("mailbox_error")}`, "bad");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (what: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(what);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(errorMessage(e), "bad");
    } finally {
      setBusy(null);
    }
  };

  const connect = (provider: "google" | "microsoft") =>
    act(provider, async () => {
      const { url } = await post<{ url: string }>(`/mailboxes/oauth/${provider}/start`);
      location.href = url;
    });

  const enablePush = () =>
    act(
      "push",
      async () => {
        const { publicKey } = await api<{ publicKey: string | null }>("/notifications/vapid");
        if (!publicKey) throw new Error("Push isn't configured on the server (VAPID keys)");
        if (!("serviceWorker" in navigator)) throw new Error("This browser doesn't support push");
        const reg = await navigator.serviceWorker.register("/sw.js");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") throw new Error("Notifications were blocked");
        const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await post("/notifications/push-subscribe", sub.toJSON());
        await put("/notifications/prefs", { ...prefs, push: true });
        setPrefs({ ...prefs, push: true });
      },
      "Push notifications on",
    );

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    void act(
      "profile",
      async () => {
        await put("/profile", { name: p.name || undefined, headline: p.headline, skills: p.skills, writingSample: p.writingSample || undefined, college: p.college || undefined, publicVisible: p.publicVisible, resumeUrl: p.resumeUrl, weeklyGoal: p.weeklyGoal });
        const changed = Object.fromEntries(Object.entries({ github: p.github, portfolio: p.portfolio, linkedin: p.linkedin }).filter(([k, v]) => v && v !== (profile.links as Record<string, string | undefined>)[k]));
        await post("/profile/enrich", changed);
        await reload();
      },
      "Profile saved and jobs re-scored",
    );
  };

  const uploadResume = (f: File) =>
    act(
      "resume",
      async () => {
        const fd = new FormData();
        fd.append("file", f);
        const r = await api<{ profile: { skills: string[]; headline: string | null } }>("/profile/resume", { method: "POST", body: fd });
        setP((cur) => ({ ...cur, skills: r.profile.skills, headline: r.profile.headline ?? cur.headline }));
        await reload();
      },
      "Resume parsed: skills and projects updated",
    );

  const outline = cn(buttonVariants({ variant: "outline" }), "bg-transparent");

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, the mailboxes we send from, your plan and how we reach you." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ------------------------------------------------------------ profile */}
        <TabsContent value="profile">
          <Card>
            <form onSubmit={saveProfile} className="divide-y">
              <Row title="About you" description="Shown on your public profile and used to personalise every email.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
                  <Input label="College" value={p.college} onChange={(e) => setP({ ...p, college: e.target.value })} />
                </div>
                <Input label="Headline" value={p.headline} onChange={(e) => setP({ ...p, headline: e.target.value })} />
              </Row>
              <Row title="Skills" description="Jobs are re-scored against these when you save. Press Enter or comma to add one.">
                <TagInput value={p.skills} onChange={(v) => setP({ ...p, skills: v })} placeholder="Add a skill" />
              </Row>
              <Row title="Links" description="We read public GitHub repos and your portfolio to find projects worth mentioning.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="GitHub" value={p.github} onChange={(e) => setP({ ...p, github: e.target.value })} />
                  <Input label="Portfolio" value={p.portfolio} onChange={(e) => setP({ ...p, portfolio: e.target.value })} />
                  <Input label="LinkedIn" value={p.linkedin} onChange={(e) => setP({ ...p, linkedin: e.target.value })} />
                </div>
              </Row>
              <Row title="Resume" description={profile.resumeFileName ? `Current file: ${profile.resumeFileName}` : "Upload a PDF and we pull out skills, projects and experience."}>
                <label className={cn(outline, "cursor-pointer")}>
                  <Upload /> {busy === "resume" ? "Parsing…" : profile.resumeFileName ? "Re-upload resume" : "Upload resume"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadResume(f);
                    }}
                  />
                </label>
                <Input label="Resume link to include in emails" value={p.resumeUrl} onChange={(e) => setP({ ...p, resumeUrl: e.target.value })} hint="Defaults to your uploaded resume or public profile" />
              </Row>
              <Row title="Writing sample" description="A paragraph you wrote. Drafts copy its tone and sentence length.">
                <Textarea aria-label="Writing sample" rows={4} value={p.writingSample} onChange={(e) => setP({ ...p, writingSample: e.target.value })} />
              </Row>
              <Row title="Weekly goal" description="How many emails you aim to send each week. Tracked on your dashboard.">
                <div className="flex items-center gap-2">
                  <UIInput type="number" min={1} max={500} aria-label="Weekly goal" value={p.weeklyGoal} onChange={(e) => setP({ ...p, weeklyGoal: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} className="w-24" />
                  <span className="text-xs text-muted-foreground">emails per week</span>
                </div>
              </Row>
              <Row title="Public profile" description="A one-page portfolio recruiters can open from your emails.">
                <SwitchField
                  label="Visible to anyone with the link"
                  description={
                    user.publicSlug ? (
                      <a className="inline-flex items-center gap-1 text-brand hover:underline" href={`/p/${user.publicSlug}`} target="_blank" rel="noreferrer">
                        /p/{user.publicSlug} <ExternalLink className="size-3" />
                      </a>
                    ) : undefined
                  }
                  checked={p.publicVisible}
                  onChange={(v) => setP({ ...p, publicVisible: v })}
                />
              </Row>
              <div className="flex justify-end gap-2 px-5 py-3">
                <Button type="submit" loading={busy === "profile"}>
                  Save profile
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------ mailboxes */}
        <TabsContent value="mailboxes">
          <Card className="divide-y">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">Connected mailboxes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Emails go out from your own account over OAuth, never from a shared server.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button loading={busy === "google"} onClick={() => connect("google")} disabled={Boolean(mailboxes.data && !mailboxes.data.oauth.google)} title={mailboxes.data?.oauth.google ? undefined : "Server needs GOOGLE_CLIENT_ID"}>
                  Connect Gmail
                </Button>
                <Button variant="secondary" loading={busy === "microsoft"} onClick={() => connect("microsoft")} disabled={Boolean(mailboxes.data && !mailboxes.data.oauth.microsoft)} title={mailboxes.data?.oauth.microsoft ? undefined : "Server needs MICROSOFT_CLIENT_ID"}>
                  Connect Outlook
                </Button>
              </div>
            </div>
            {mailboxes.loading && !mailboxes.data ? (
              <Loading />
            ) : (
              (mailboxes.data?.items ?? []).map((a) => (
                <div key={a.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                      {a.provider === "dev" ? <FlaskConical className="size-4 text-muted-foreground" /> : <Mail className="size-4 text-muted-foreground" />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
                        <span className="truncate">{a.email}</span>
                        <Badge>{a.provider === "dev" ? "dev (captures only)" : a.provider}</Badge>
                        <StatusPill tone={a.status === "active" ? "ok" : "bad"}>{a.status}</StatusPill>
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Progress value={a.healthScore} className="h-1 w-24" aria-label={`Health ${a.healthScore} of 100`} />
                        <span>
                          Health {a.healthScore}/100 · {a.sentToday} sent today{a.lastError ? ` · ${a.lastError}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`lim-${a.id}`} className="text-xs font-normal text-muted-foreground">
                        Daily limit
                      </Label>
                      <UIInput id={`lim-${a.id}`} type="number" min={1} max={500} defaultValue={a.dailyLimit} aria-label="Daily limit" className="h-8 w-20" onBlur={(e) => act("lim", () => patch(`/mailboxes/${a.id}`, { dailyLimit: Number(e.target.value) }), "Limit saved")} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id={`warm-${a.id}`} defaultChecked={a.warmupEnabled} onCheckedChange={(v) => act("warm", () => patch(`/mailboxes/${a.id}`, { warmupEnabled: v }), v ? "Warm-up on" : "Warm-up off")} />
                      <Label htmlFor={`warm-${a.id}`} className="text-xs font-normal text-muted-foreground">
                        Warm-up
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        act(
                          "del",
                          async () => {
                            await del(`/mailboxes/${a.id}`);
                            await mailboxes.reload();
                          },
                          "Disconnected",
                        )
                      }
                    >
                      <Unplug /> Disconnect
                    </Button>
                  </div>
                </div>
              ))
            )}
            {mailboxes.data && mailboxes.data.items.length === 0 && <p className="px-5 py-8 text-center text-xs text-muted-foreground">No mailbox yet. Connect Gmail or Outlook to start sending and tracking replies.</p>}
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-xs text-subtle-foreground">Testing locally? A dev mailbox captures emails instead of delivering them.</p>
              <Button
                size="sm"
                variant="ghost"
                loading={busy === "dev"}
                onClick={() =>
                  act(
                    "dev",
                    async () => {
                      await post("/mailboxes/dev");
                      await mailboxes.reload();
                    },
                    "Dev mailbox added: emails are captured, not delivered",
                  )
                }
              >
                <FlaskConical /> Add dev mailbox (testing)
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------ plan */}
        <TabsContent value="plan" className="space-y-3">
          {billing.data ? (
            <>
              <Card className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(billing.data.usage).map(([k, u]) => (
                  <div key={k}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{USAGE_LABEL[k] ?? k.replace(/_/g, " ")}</span>
                      <span className="text-subtle-foreground">per {u.period}</span>
                    </div>
                    <p className="mt-1.5 text-[22px] font-semibold tracking-tight tabular text-foreground">
                      {u.used.toLocaleString("en-US")}
                      <span className="text-[13px] font-normal text-subtle-foreground"> / {u.limit.toLocaleString("en-US")}</span>
                    </p>
                    <Progress value={Math.min(100, (u.used / Math.max(u.limit, 1)) * 100)} className="mt-2" />
                  </div>
                ))}
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                {billing.data.plans
                  .filter((x) => x.id !== "college")
                  .map((pl) => {
                    const current = billing.data!.plan === pl.id;
                    return (
                      <Card key={pl.id} className={cn("flex flex-col p-5", current && "border-foreground/40")}>
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-semibold text-foreground">{pl.label}</p>
                          {current && <Badge tone="ok">Current plan</Badge>}
                        </div>
                        <p className="mt-2">
                          <span className="text-[28px] font-semibold tracking-tight tabular text-foreground">${pl.priceMonthlyUsd}</span>
                          <span className="text-xs text-muted-foreground"> / month</span>
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs text-secondary-foreground">
                          <li>{pl.dailySends.toLocaleString("en-US")} sends a day</li>
                          <li>{pl.monthlyAiDrafts.toLocaleString("en-US")} AI drafts a month</li>
                          <li>
                            {pl.mailboxes} {pl.mailboxes > 1 ? "mailboxes" : "mailbox"}
                          </li>
                          <li>{pl.autopilot ? "Autopilot campaigns" : "Approve every email"}</li>
                        </ul>
                        <div className="mt-auto pt-4">
                          {!current && billing.data!.plan !== "college" && (
                            <Button
                              variant={pl.priceMonthlyUsd > 0 ? "primary" : "secondary"}
                              className="w-full"
                              loading={busy === pl.id}
                              onClick={() =>
                                act(
                                  pl.id,
                                  async () => {
                                    await post("/billing/plan", { plan: pl.id });
                                    await billing.reload();
                                    await reload();
                                  },
                                  `Switched to ${pl.label}`,
                                )
                              }
                            >
                              Switch to {pl.label}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
              {billing.data.plan === "college" && <p className="text-xs text-muted-foreground">Your plan is provided by your college.</p>}
            </>
          ) : (
            <Card>
              <Loading />
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ notifications */}
        <TabsContent value="notifications">
          <Card className="divide-y">
            <Row title="Browser push" description="A notification the moment someone replies or books an interview.">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-secondary-foreground">{prefs.push ? "On for this browser" : "Off"}</span>
                {prefs.push ? (
                  <Badge tone="ok">On</Badge>
                ) : (
                  <Button size="sm" variant="secondary" loading={busy === "push"} onClick={enablePush}>
                    Enable
                  </Button>
                )}
              </div>
            </Row>
            <Row title="In-app" description="The bell in the sidebar: replies, interviews and your morning match digest.">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-secondary-foreground">Always on</span>
                <Badge tone="ok">On</Badge>
              </div>
            </Row>
            <Row title="WhatsApp" description="Replies and interview bookings on your phone.">
              <SwitchField
                label={
                  <span className="flex items-center gap-2">
                    WhatsApp alerts {user.plan === "free" && <Badge tone="violet">Pro</Badge>}
                  </span>
                }
                checked={prefs.whatsapp}
                onChange={(v) => setPrefs({ ...prefs, whatsapp: v })}
              />
              {prefs.whatsapp && <Input label="WhatsApp number" placeholder="+91 98765 43210" value={prefs.phone} onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })} />}
            </Row>
            <div className="flex justify-end px-5 py-3">
              <Button loading={busy === "prefs"} onClick={() => act("prefs", () => put("/notifications/prefs", prefs), "Saved")}>
                Save notifications
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsInner />
    </Suspense>
  );
}
