import { FileUp, MailCheck, Radar, Reply } from "lucide-react";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "./motion";

const STEPS = [
  { icon: FileUp, title: "Upload your resume", body: "Skills, projects, experience and education are pulled out in seconds. Add GitHub and your portfolio for more." },
  { icon: Radar, title: "Get a daily feed", body: "New roles from ten sources, deduplicated and scored against you. Scams are filtered before you see them." },
  { icon: MailCheck, title: "Approve or autopilot", body: "Review each personal email, or let a campaign send at a safe pace from your own inbox." },
  { icon: Reply, title: "Handle replies", body: "Replies are sorted and come with a drafted answer, a booking link, and an interview prep pack." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 border-y border-border/70 bg-sidebar/60 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="How it works" title="Set up in three minutes." body="Then JobPilot runs in the background. You only step in when someone answers." />
        <Stagger className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
          {STEPS.map((s, i) => (
            <StaggerItem key={s.title} className="bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-foreground">
                  <s.icon className="size-4" />
                </span>
                <span className="text-[12px] tabular text-subtle-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-[15px] font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 grid gap-4 text-center sm:grid-cols-3">
          {[
            ["10", "job sources, checked every 6 hours"],
            ["0", "shared sending servers"],
            ["4", "follow-up steps that stop on reply"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-2xl border bg-card px-6 py-6">
              <p className="display text-[40px] text-foreground">{n}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
