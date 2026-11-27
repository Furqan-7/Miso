import { PLAN_LIMITS } from "shared";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { buttonVariants } from "../ui/button";
import { SectionHeading, Stagger, StaggerItem } from "./motion";

const free = PLAN_LIMITS.free;
const pro = PLAN_LIMITS.pro;
const college = PLAN_LIMITS.college;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    note: "forever",
    blurb: "For trying it on a handful of companies.",
    cta: "Start free",
    items: [`${free.dailySends} sends a day`, `${free.monthlyAiDrafts} AI drafts a month`, "Approval mode", `${free.mailboxes} mailbox`, "Daily job feed + scoring"],
  },
  {
    name: "Pro",
    price: `$${pro.priceMonthlyUsd}`,
    note: "per month",
    blurb: "For a serious, steady search.",
    cta: "Go Pro",
    featured: true,
    items: [`${pro.dailySends} sends a day`, "Autopilot + bulk campaigns", "A/B subject tests", `${pro.mailboxes} mailboxes`, "WhatsApp reply alerts"],
  },
  {
    name: "College",
    price: "Per seat",
    note: "for placement cells",
    blurb: "One admin, every student's pipeline.",
    cta: "Set up your college",
    items: ["Pro features for each student", "Invite codes", "Alumni referral finder", "Placement dashboard", `Up to ${college.seats} seats`],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when it works." body="Every plan sends from your own inbox and protects it with the same safety limits." />
      <Stagger className="mt-14 grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <StaggerItem
            key={t.name}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6",
              t.featured && "border-transparent [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(160deg,rgba(76,141,255,0.7),rgba(164,139,255,0.35)_40%,var(--border)_70%)_border-box]",
            )}
          >
            {t.featured && <span className="absolute right-5 top-5 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">Most popular</span>}
            <p className="text-[13px] font-medium text-secondary-foreground">{t.name}</p>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="display text-[40px] text-foreground">{t.price}</span>
              <span className="text-[13px] text-muted-foreground">{t.note}</span>
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">{t.blurb}</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {t.items.map((i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] text-secondary-foreground">
                  <Check className="size-3.5 text-foreground" /> {i}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className={cn(buttonVariants({ variant: t.featured ? "default" : "outline", size: "lg" }), "mt-8 w-full rounded-full")}>
              {t.cta}
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
