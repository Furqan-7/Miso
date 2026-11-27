"use client";

import { ArrowLeft, ArrowRight, Briefcase, Check, ChevronDown, FileUp, GraduationCap, Link2, PenLine, SlidersHorizontal, Sparkles, UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { COMPANY_SIZES, EMPLOYMENT_TYPES, TARGET_ROLES, WORK_MODES, type CompanySize, type EmploymentType, type TargetRole, type WorkMode } from "shared";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, Button, Chips, ErrorNote, Input, Loading, Select, SwitchField, TagInput, Textarea, useToast } from "@/app/components/common";
import { Logo } from "@/app/components/Logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/app/lib/utils";
import { api, errorMessage, post, put } from "@/app/services/api";
import type { Profile, User } from "@/app/types/api";

const STEPS = [
  { id: "Resume", hint: "Skills and projects", icon: FileUp },
  { id: "Links", hint: "GitHub and portfolio", icon: Link2 },
  { id: "Experience", hint: "Roles you want", icon: Briefcase },
  { id: "Preferences", hint: "Where and how", icon: SlidersHorizontal },
  { id: "Your voice", hint: "How you write", icon: PenLine },
] as const;
const ROLE_LABELS: Partial<Record<TargetRole, string>> = { sde: "SDE", ai_engineer: "AI engineer", ml_engineer: "ML engineer", data_engineer: "Data engineer", fullstack: "Full-stack" };
const ET_LABELS: Record<EmploymentType, string> = { internship: "Internship", full_time: "Full-time", freelance: "Freelance", contract: "Contract" };
const SIZE_LABELS: Record<CompanySize, string> = { startup: "Startup", scaleup: "Scale-up", mnc: "MNC / Big tech" };
const EASE = [0.22, 1, 0.36, 1] as const;

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="display text-[20px] font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [links, setLinks] = useState({ github: "", portfolio: "", linkedin: "" });

  useEffect(() => {
    api<{ user: User; profile: Profile }>("/auth/me").then(({ user, profile }) => {
      setUser(user);
      setP(profile);
      setLinks({ github: profile.links.github ?? "", portfolio: profile.links.portfolio ?? "", linkedin: profile.links.linkedin ?? "" });
    });
  }, []);

  if (!p || !user) return <Loading />;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });
  const setPref = <K extends keyof Profile["preferences"]>(k: K, v: Profile["preferences"][K]) => setP({ ...p, preferences: { ...p.preferences, [k]: v } });
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const uploadResume = (file?: File) =>
    run(async () => {
      const fd = new FormData();
      if (file) fd.append("file", file);
      else fd.append("text", resumeText);
      const r = await api<{ profile: Profile; source: string }>("/profile/resume", { method: "POST", body: fd });
      setP(r.profile);
      setLinks({ github: r.profile.links.github ?? "", portfolio: r.profile.links.portfolio ?? "", linkedin: r.profile.links.linkedin ?? "" });
      toast(`Found ${r.profile.skills.length} skills and ${r.profile.projects.length} projects`);
    });

  const saveAndNext = () =>
    run(async () => {
      if (step === 1 && (links.github || links.portfolio || links.linkedin)) {
        const r = await post<{ profile: Profile; errors: string[] }>("/profile/enrich", Object.fromEntries(Object.entries(links).filter(([, v]) => v)));
        setP(r.profile);
        r.errors.forEach((e) => toast(e, "bad"));
      } else {
        const { profile } = await put<{ profile: Profile }>("/profile", {
          headline: p.headline ?? undefined,
          experienceLevel: p.experienceLevel,
          yearsExperience: p.yearsExperience,
          targetRoles: p.targetRoles,
          skills: p.skills,
          preferences: p.preferences,
          writingSample: p.writingSample || undefined,
          college: p.college ?? undefined,
          publicVisible: p.publicVisible,
        });
        setP(profile);
      }
      if (step === STEPS.length - 1) {
        await post("/profile/complete-onboarding");
        router.push("/dashboard?tab=matches");
      } else go(step + 1);
    });

  return (
    <div className="dot-grid relative min-h-dvh bg-background text-[13px]">
      <div className="mx-auto grid min-h-dvh max-w-5xl gap-8 px-4 py-8 md:grid-cols-[240px_1fr] md:gap-12 md:py-14">
        {/* stepper */}
        <aside className="md:sticky md:top-14 md:self-start">
          <Logo />
          <p className="mt-6 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Set up your job search</p>
          <p className="mt-1 text-xs text-muted-foreground">About 3 minutes. You can change everything later in Settings.</p>
          <ol className="mt-6 hidden space-y-1 md:block" aria-label="Progress">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s.id} className="relative">
                  {i < STEPS.length - 1 && <span className={cn("absolute left-[15px] top-9 h-[calc(100%-20px)] w-px", done ? "bg-foreground/40" : "bg-border")} aria-hidden />}
                  <button type="button" disabled={i > step} onClick={() => go(i)} aria-current={current ? "step" : undefined} className={cn("flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors disabled:cursor-default", current && "bg-accent/60")}>
                    <span className={cn("relative flex size-[30px] shrink-0 items-center justify-center rounded-full border transition-colors", done ? "border-foreground bg-foreground text-background" : current ? "border-foreground/60 bg-card text-foreground" : "bg-card text-subtle-foreground")}>
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : <s.icon className="size-3.5" />}
                    </span>
                    <span>
                      <span className={cn("block text-[13px] font-medium", current || done ? "text-foreground" : "text-muted-foreground")}>{s.id}</span>
                      <span className="block text-[11px] text-subtle-foreground">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {/* compact progress on phones */}
          <div className="mt-5 flex gap-1.5 md:hidden" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.id} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-foreground" : "bg-border")} />
            ))}
          </div>
        </aside>

        {/* step content */}
        <main className="min-w-0">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b px-6 py-3 text-[11px] text-subtle-foreground">
              <span>
                Step {step + 1} of {STEPS.length}
              </span>
              <span>{STEPS[step].id}</span>
            </div>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-6 p-6">
                {step === 0 && (
                  <>
                    <Heading title="Upload your resume" body="PDF. We pull out your skills, projects, experience and education. LinkedIn's “Save to PDF” export works too." />
                    <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-muted/30 px-6 py-10 text-center transition-colors hover:border-brand/60 hover:bg-brand/[0.04]">
                      <span className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors group-hover:text-brand">
                        <UploadCloud className="size-4" />
                      </span>
                      <span className="text-[13px] font-medium text-foreground">{busy ? "Reading your resume…" : p.resumeFileName ? `Uploaded: ${p.resumeFileName}` : "Choose a PDF"}</span>
                      <span className="text-[11px] text-subtle-foreground">Up to 8 MB</span>
                      <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
                    </label>
                    <Collapsible>
                      <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        Or paste resume text
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 space-y-2">
                          <Textarea aria-label="Resume text" rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume…" />
                          <Button variant="secondary" size="sm" disabled={!resumeText.trim()} loading={busy} onClick={() => uploadResume()}>
                            Parse text
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {(p.skills.length > 0 || p.projects.length > 0) && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-xl border bg-background/40 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                          <Sparkles className="size-3.5" /> Here&apos;s what we found. Edit anything that&apos;s off.
                        </p>
                        <Field label="Skills">
                          <TagInput value={p.skills} onChange={(v) => set("skills", v)} placeholder="Add a skill" />
                        </Field>
                        {p.projects.length > 0 && (
                          <Field label="Projects">
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {p.projects.map((pr) => (
                                <li key={pr.name} className="rounded-lg border bg-card p-3">
                                  <p className="text-[13px] font-medium text-foreground">{pr.name}</p>
                                  <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{pr.technologies.slice(0, 4).join(" · ")}</p>
                                  {pr.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pr.description}</p>}
                                </li>
                              ))}
                            </ul>
                          </Field>
                        )}
                        {p.education[0] && (
                          <p className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                            <GraduationCap className="size-3.5 text-muted-foreground" /> {p.education[0].institution}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </>
                )}

                {step === 1 && (
                  <>
                    <Heading title="Connect your work" body="We read your public GitHub repos and portfolio to find more projects and skills." />
                    <div className="grid gap-4">
                      <Input label="GitHub" placeholder="https://github.com/you" value={links.github} onChange={(e) => setLinks({ ...links, github: e.target.value })} />
                      <Input label="Portfolio" placeholder="https://you.dev" value={links.portfolio} onChange={(e) => setLinks({ ...links, portfolio: e.target.value })} />
                      <Input label="LinkedIn" placeholder="https://linkedin.com/in/you" value={links.linkedin} onChange={(e) => setLinks({ ...links, linkedin: e.target.value })} hint="Saved as a link. LinkedIn doesn't allow profile reading, so upload its PDF export in step 1 if you want those details." />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Heading title="Where are you in your career?" body="We use this to score jobs and pick the right people to email." />
                    <Field label="Experience">
                      <Chips options={["fresher", "experienced"] as const} value={[p.experienceLevel]} onChange={(v) => v.length && set("experienceLevel", v[v.length - 1])} labels={{ fresher: "Fresher / student", experienced: "Experienced" }} />
                    </Field>
                    {p.experienceLevel === "experienced" && <Input label="Years of experience" type="number" min={0} max={50} step={0.5} value={p.yearsExperience} onChange={(e) => set("yearsExperience", Number(e.target.value))} />}
                    <Field label="Roles you want">
                      <Chips options={TARGET_ROLES} value={p.targetRoles as TargetRole[]} onChange={(v) => set("targetRoles", v)} labels={ROLE_LABELS} />
                    </Field>
                    <Field label="Type of work">
                      <Chips options={EMPLOYMENT_TYPES} value={p.preferences.employmentTypes} onChange={(v) => setPref("employmentTypes", v)} labels={ET_LABELS} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Headline" placeholder="Full-stack developer (Next.js, Node.js)" value={p.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
                      <Input label="College" value={p.college ?? ""} onChange={(e) => set("college", e.target.value)} hint="Used to find alumni at companies for referrals" />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <Heading title="Preferences" body="Jobs outside these still show up, just lower in your feed." />
                    <Field label="Work mode">
                      <Chips options={WORK_MODES} value={p.preferences.workModes as WorkMode[]} onChange={(v) => setPref("workModes", v)} />
                    </Field>
                    <Field label="Cities">
                      <TagInput value={p.preferences.cities} onChange={(v) => setPref("cities", v)} placeholder="Bangalore, Pune, Berlin…" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label={p.preferences.employmentTypes.includes("internship") ? "Expected stipend" : "Expected CTC"}
                        type="number"
                        min={0}
                        value={p.preferences.expectedComp?.min ?? ""}
                        onChange={(e) => setPref("expectedComp", { currency: p.preferences.expectedComp?.currency ?? "INR", period: p.preferences.expectedComp?.period ?? "month", min: e.target.value ? Number(e.target.value) : undefined })}
                      />
                      <Select label="Currency" value={p.preferences.expectedComp?.currency ?? "INR"} onChange={(e) => setPref("expectedComp", { ...(p.preferences.expectedComp ?? { period: "month" }), currency: e.target.value } as never)}>
                        {["INR", "USD", "EUR", "GBP"].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                      <Select label="Per" value={p.preferences.expectedComp?.period ?? "month"} onChange={(e) => setPref("expectedComp", { ...(p.preferences.expectedComp ?? { currency: "INR" }), period: e.target.value as "month" | "year" } as never)}>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                      </Select>
                    </div>
                    <Field label="Company size">
                      <Chips options={COMPANY_SIZES} value={p.preferences.companySizes} onChange={(v) => setPref("companySizes", v)} labels={SIZE_LABELS} />
                    </Field>
                    <Field label="Industries">
                      <TagInput value={p.preferences.industries} onChange={(v) => setPref("industries", v)} placeholder="fintech, AI, devtools…" />
                    </Field>
                  </>
                )}

                {step === 4 && (
                  <>
                    <Heading title="How do you write?" body="Paste an email or message you wrote. Drafts will match your greeting, rhythm and sign-off." />
                    <Textarea aria-label="Writing sample" rows={8} value={p.writingSample ?? ""} onChange={(e) => set("writingSample", e.target.value)} placeholder={"Hi Priya,\n\nThanks for the quick reply! …\n\nCheers,\nAsha"} />
                    <div className="rounded-xl border bg-background/40 p-4">
                      <SwitchField label="Public profile page" description="A link you can put in emails and your bio. Shows your projects and skills, never your email." checked={p.publicVisible} onChange={(v) => set("publicVisible", v)} />
                      {p.publicVisible && user.publicSlug && (
                        <div className="mt-3">
                          <Badge tone="brand">/p/{user.publicSlug}</Badge>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {error && <ErrorNote>{error}</ErrorNote>}
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button variant="ghost" disabled={step === 0} onClick={() => go(step - 1)}>
                <ArrowLeft /> Back
              </Button>
              <Button loading={busy} onClick={saveAndNext} disabled={step === 0 && p.skills.length === 0 && !p.resumeFileName}>
                {step === STEPS.length - 1 ? "Finish and see my matches" : "Continue"}
                {!busy && <ArrowRight />}
              </Button>
            </div>
          </div>
          {step === 0 && (
            <p className="mt-3 text-center text-xs text-subtle-foreground">
              No resume handy?{" "}
              <button className="text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => go(2)}>
                Skip and add skills later
              </button>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
