import { ArrowUpRight, Briefcase, Code, FileText, Globe, GraduationCap, Link2, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/app/components/Logo";

interface PublicProfile {
  name: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  projects: { name: string; description: string; technologies: string[]; url?: string }[];
  experience: { company: string; title: string; start?: string; end?: string }[];
  education: { institution: string; degree?: string; field?: string; end?: string }[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  hasResume: boolean;
  tailoredFor: string | null;
}

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3001").replace(/\/+$/, "");

async function load(slug: string, forJob?: string): Promise<PublicProfile | null> {
  const qs = forJob ? `?for=${encodeURIComponent(forJob)}` : "";
  const res = await fetch(`${BACKEND_URL}/api/public/${encodeURIComponent(slug)}${qs}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.name, description: p.headline ?? undefined } : { title: "Profile" };
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

const linkBtn = "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-accent [&_svg]:size-3.5 [&_svg]:text-muted-foreground";

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground [&_svg]:size-3.5">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Public link-in-bio page. `?for=<jobId>` puts the most relevant projects first for that role. */
export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ for?: string }> }) {
  const { slug } = await params;
  const { for: forJob } = await searchParams;
  const p = await load(slug, forJob);
  if (!p) notFound();
  return (
    <div className="min-h-dvh bg-background text-[13px]">
      <div className="relative h-44 overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,#f5a6d6_0%,#a48bff_38%,#3987e5_70%,#0a0a0b_100%)] opacity-90">
        <div className="dot-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>
      <main className="relative mx-auto -mt-16 max-w-2xl px-4 pb-16">
        <span className="flex size-24 items-center justify-center rounded-2xl border-4 border-background bg-card text-2xl font-semibold text-foreground shadow-xl shadow-black/40">{initials(p.name)}</span>
        <h1 className="display mt-4 text-[32px] font-semibold text-foreground">{p.name}</h1>
        {p.headline && <p className="mt-1 text-[15px] text-secondary-foreground">{p.headline}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {p.hasResume && (
            <a className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 [&_svg]:size-3.5" href={`/backend/public/resume/${p.slug}.pdf`}>
              <FileText /> Resume (PDF)
            </a>
          )}
          {p.links.github && (
            <a className={linkBtn} href={p.links.github} target="_blank" rel="noreferrer">
              <Code /> GitHub
            </a>
          )}
          {p.links.portfolio && (
            <a className={linkBtn} href={p.links.portfolio} target="_blank" rel="noreferrer">
              <Globe /> Portfolio
            </a>
          )}
          {p.links.linkedin && (
            <a className={linkBtn} href={p.links.linkedin} target="_blank" rel="noreferrer">
              <Link2 /> LinkedIn
            </a>
          )}
        </div>
        {p.tailoredFor && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand">
            <Target className="size-3.5" /> Projects ordered for: {p.tailoredFor}
          </p>
        )}
        {p.summary && <p className="mt-6 text-[14px] leading-relaxed text-secondary-foreground">{p.summary}</p>}

        {p.skills.length > 0 && (
          <Section title="Skills" icon={<Code />}>
            <div className="flex flex-wrap gap-1.5">
              {p.skills.map((s) => (
                <span key={s} className="rounded-md border bg-card px-2 py-1 text-xs text-secondary-foreground">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}
        {p.projects.length > 0 && (
          <Section title="Projects" icon={<Briefcase />}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.projects.map((pr) => (
                <li key={pr.name} className="group relative flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-border-strong">
                  <p className="flex items-start justify-between gap-2 text-[14px] font-medium text-foreground">
                    {pr.url ? (
                      <a href={pr.url} target="_blank" rel="noreferrer" className="after:absolute after:inset-0 hover:underline">
                        {pr.name}
                      </a>
                    ) : (
                      pr.name
                    )}
                    {pr.url && <ArrowUpRight className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />}
                  </p>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{pr.description}</p>
                  {pr.technologies.length > 0 && <p className="mt-3 text-[11px] text-subtle-foreground">{pr.technologies.join(" · ")}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {p.experience.length > 0 && (
          <Section title="Experience" icon={<Briefcase />}>
            <ol className="divide-y rounded-xl border bg-card">
              {p.experience.map((e) => (
                <li key={e.company + e.title} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.company}</p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular text-subtle-foreground">{[e.start, e.end].filter(Boolean).join(" – ")}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}
        {p.education.length > 0 && (
          <Section title="Education" icon={<GraduationCap />}>
            <ol className="divide-y rounded-xl border bg-card">
              {p.education.map((e) => (
                <li key={e.institution} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.institution}</p>
                    {(e.degree || e.field) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {e.degree}
                        {e.field ? `${e.degree ? " in " : ""}${e.field}` : ""}
                      </p>
                    )}
                  </div>
                  {e.end && <span className="shrink-0 text-[11px] tabular text-subtle-foreground">{e.end}</span>}
                </li>
              ))}
            </ol>
          </Section>
        )}
        <Link href="/" className="mx-auto mt-14 flex w-fit items-center gap-2 text-xs text-subtle-foreground transition-colors hover:text-muted-foreground">
          <LogoMark className="size-4" /> Made with JobPilot
        </Link>
      </main>
    </div>
  );
}
