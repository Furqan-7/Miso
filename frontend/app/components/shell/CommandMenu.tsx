"use client";

import { BarChart3, Briefcase, Building2, GraduationCap, Inbox, LayoutDashboard, Pause, Play, Plus, Send, Settings, ShieldCheck, SquareKanban, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, post } from "@/app/services/api";
import type { Company, Job } from "@/app/types/api";
import { useToast } from "../common";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "../ui/command";

const PAGES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/campaigns", label: "Campaigns", icon: Zap },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tracker", label: "Tracker", icon: SquareKanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/deliverability", label: "Deliverability", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** ⌘K: jump to a page, run an action, or find a job / company by name. */
export function CommandMenu({ open, onOpenChange, isAdmin }: { open: boolean; onOpenChange: (o: boolean) => void; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      Promise.all([api<{ items: Job[] }>(`/jobs?q=${encodeURIComponent(query)}`), api<{ items: Company[] }>(`/companies?q=${encodeURIComponent(query)}`)])
        .then(([j, c]) => {
          if (!alive) return;
          setJobs(j.items.slice(0, 6));
          setCompanies(c.items.slice(0, 5));
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };
  const matches = (label: string) => !query || label.toLowerCase().includes(query.toLowerCase());
  const pages = [...PAGES, ...(isAdmin ? [{ href: "/org", label: "Placement cell", icon: GraduationCap }] : [])].filter((p) => matches(p.label));
  const showResults = query.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search jobs, companies, pages…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results for “{query}”</CommandEmpty>
        {showResults && jobs.length > 0 && (
          <CommandGroup heading="Jobs">
            {jobs.map((j) => (
              <CommandItem key={j.id} value={`job-${j.id}`} onSelect={() => go(`/jobs/${j.id}`)}>
                <Briefcase />
                <span className="truncate text-foreground">{j.title}</span>
                <span className="truncate text-muted-foreground">{j.companyName}</span>
                {j.match && <CommandShortcut>{j.match.score}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showResults && companies.length > 0 && (
          <CommandGroup heading="Companies">
            {companies.map((c) => (
              <CommandItem key={c.id} value={`company-${c.id}`} onSelect={() => go(`/companies/${c.id}`)}>
                <Building2 />
                <span className="text-foreground">{c.name}</span>
                {c.domain && <span className="text-muted-foreground">{c.domain}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {pages.length > 0 && (
          <CommandGroup heading="Go to">
            {pages.map((p) => (
              <CommandItem key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)}>
                <p.icon />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        {(matches("new campaign") || matches("pause") || matches("resume")) && (
          <CommandGroup heading="Actions">
            {matches("new campaign") && (
              <CommandItem value="action-new-campaign" onSelect={() => go("/campaigns/new")}>
                <Plus /> New campaign
              </CommandItem>
            )}
            {matches("pause") && (
              <CommandItem
                value="action-pause"
                onSelect={async () => {
                  await post("/sending/pause");
                  toast("All sending paused");
                  onOpenChange(false);
                }}
              >
                <Pause /> Pause all sending
              </CommandItem>
            )}
            {matches("resume") && (
              <CommandItem
                value="action-resume"
                onSelect={async () => {
                  await post("/sending/resume");
                  toast("Sending resumed");
                  onOpenChange(false);
                }}
              >
                <Play /> Resume sending
              </CommandItem>
            )}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
