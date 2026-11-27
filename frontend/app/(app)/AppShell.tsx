"use client";

import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  CircleHelp,
  Download,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Puzzle,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SquareKanban,
  UserPlus,
  UserRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initials, Loading, timeAgo, useToast } from "@/app/components/common";
import { CommandMenu } from "@/app/components/shell/CommandMenu";
import { LogoMark } from "@/app/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Kbd } from "@/app/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Progress } from "@/app/components/ui/progress";
import { Sheet, SheetContent, SheetTitle } from "@/app/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { api, post } from "@/app/services/api";
import type { Notification, Profile, User } from "@/app/types/api";

interface Session {
  user: User;
  profile: Profile;
  org: { id: string; name: string; inviteCode: string; seats: number } | null;
  reload: () => Promise<void>;
}
const SessionCtx = createContext<Session | null>(null);
export function useSession() {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("useSession outside Shell");
  return s;
}

export interface NavCounts {
  pendingApproval: number;
  unhandledReplies: number;
  stages: Record<string, number>;
  sentToday: number;
  dailySendLimit: number;
  mailboxes: number;
}

const RAIL = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tracker", label: "Tracker", icon: SquareKanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Jobs",
  companies: "Company",
  outreach: "Outreach",
  campaigns: "Campaigns",
  inbox: "Inbox",
  tracker: "Tracker",
  analytics: "Analytics",
  deliverability: "Deliverability",
  settings: "Settings",
  org: "Placement cell",
};

const STAGE_META = [
  { stage: "found", label: "Found", color: "text-muted-foreground" },
  { stage: "emailed", label: "Emailed", color: "text-brand" },
  { stage: "replied", label: "Replied", color: "text-success" },
  { stage: "interview", label: "Interview", color: "text-warning" },
  { stage: "offer", label: "Offer", color: "text-violet" },
  { stage: "rejected", label: "Closed", color: "text-destructive" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function avatarUrl(profile: Profile) {
  const gh = (profile.enrichment as { github?: { username?: string } }).github?.username;
  return gh ? `https://github.com/${gh}.png?size=96` : undefined;
}

// ------------------------------------------------------------------ rail
function Rail({ user, profile, onSignOut, unread, notifications, onOpenNotes, onHelp }: { user: User; profile: Profile; onSignOut: () => void; unread: number; notifications: Notification[]; onOpenNotes: () => void; onHelp: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden w-[52px] shrink-0 flex-col items-center gap-1 py-3 md:flex">
      <Link href="/dashboard" aria-label="JobPilot dashboard" className="mb-3">
        <LogoMark className="size-7" />
      </Link>
      {RAIL.map((r) => (
        <Tooltip key={r.href}>
          <TooltipTrigger asChild>
            <Link
              href={r.href}
              aria-label={r.label}
              className={cn("flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground", isActive(pathname, r.href) && "bg-accent text-foreground")}
            >
              <r.icon className="size-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{r.label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onHelp} aria-label="Help and shortcuts" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
              <CircleHelp className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Help &amp; shortcuts</TooltipContent>
        </Tooltip>
        <Popover onOpenChange={(o) => o && onOpenNotes()}>
          <PopoverTrigger asChild>
            <button aria-label="Notifications" className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-sidebar" />}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-80 p-0">
            <p className="border-b px-3 py-2.5 text-[13px] font-semibold">Notifications</p>
            <ul className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && <li className="px-3 py-8 text-center text-xs text-muted-foreground">You&apos;re all caught up</li>}
              {notifications.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <Link href={n.link ?? "#"} className="block px-3 py-2.5 hover:bg-accent">
                    <p className="text-[13px] text-foreground">{n.title}</p>
                    {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-subtle-foreground">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/settings" aria-label="Settings" className={cn("flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground", isActive(pathname, "/settings") && "bg-accent text-foreground")}>
              <Settings className="size-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account" className="mt-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8 border border-border-strong">
              <AvatarImage src={avatarUrl(profile)} alt="" />
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel className="normal-case tracking-normal">
              <p className="text-[13px] font-medium text-foreground">{user.name}</p>
              <p className="truncate text-[11px] font-normal text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.publicSlug && (
              <DropdownMenuItem asChild>
                <a href={`/p/${user.publicSlug}`} target="_blank" rel="noreferrer">
                  <UserRound /> Public profile
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

// ------------------------------------------------------------------ sidebar
function NavItem({ href, label, icon: Icon, count, onNavigate }: { href: string; label: string; icon: typeof Send; count?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground transition hover:bg-accent hover:text-foreground", active && "bg-accent font-medium text-foreground")}
    >
      <Icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
      {label}
      {!!count && <span className="ml-auto text-[11px] tabular text-muted-foreground">{count}</span>}
    </Link>
  );
}

function SidebarSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground hover:text-muted-foreground">
        {title}
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

function StageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4", className)} aria-hidden>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 1.6" />
      <circle cx="8" cy="8" r="2.4" fill="currentColor" />
    </svg>
  );
}

function Sidebar({ session, counts, onNavigate, onExtension }: { session: Session; counts: NavCounts | null; onNavigate?: () => void; onExtension: () => void }) {
  const { user } = session;
  const limit = counts?.dailySendLimit ?? 0;
  const used = counts?.sentToday ?? 0;
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 items-center justify-between px-3">
        <p className="text-[13px] font-semibold text-foreground">Workspace</p>
        <span className="text-[11px] text-subtle-foreground">{user.plan === "college" && session.org ? session.org.name : "Personal"}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <Link href="/campaigns/new" onClick={onNavigate} className={cn(buttonVariants({ variant: "outline" }), "mb-3 w-full justify-start gap-2 bg-transparent")}>
          <Plus /> New campaign
        </Link>
        <div className="flex flex-col gap-0.5">
          <NavItem href="/dashboard" label="Home" icon={LayoutDashboard} onNavigate={onNavigate} />
          <NavItem href="/jobs" label="Jobs" icon={Briefcase} onNavigate={onNavigate} />
          <NavItem href="/outreach" label="Needs approval" icon={Send} count={counts?.pendingApproval} onNavigate={onNavigate} />
          <NavItem href="/inbox" label="Inbox" icon={Inbox} count={counts?.unhandledReplies} onNavigate={onNavigate} />
          <NavItem href="/tracker" label="Tracker" icon={SquareKanban} onNavigate={onNavigate} />
        </div>
        <SidebarSection title="Workspace">
          <NavItem href="/campaigns" label="Campaigns" icon={Zap} onNavigate={onNavigate} />
          <NavItem href="/analytics" label="Analytics" icon={BarChart3} onNavigate={onNavigate} />
          <NavItem href="/deliverability" label="Deliverability" icon={ShieldCheck} onNavigate={onNavigate} />
          {user.orgRole === "admin" && <NavItem href="/org" label="Placement cell" icon={GraduationCap} onNavigate={onNavigate} />}
        </SidebarSection>
        <SidebarSection title="Pipeline">
          {STAGE_META.map((s) => (
            <Link key={s.stage} href="/tracker" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground transition hover:bg-accent hover:text-foreground">
              <StageIcon className={s.color} />
              {s.label}
              <span className="ml-auto text-[11px] tabular text-muted-foreground">{counts?.stages[s.stage] ?? 0}</span>
            </Link>
          ))}
        </SidebarSection>
        <SidebarSection title="Try">
          {counts && counts.mailboxes === 0 && (
            <Link href="/settings?tab=mailboxes" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground">
              <Mail className="size-4 text-muted-foreground" /> Connect Gmail or Outlook
            </Link>
          )}
          <button onClick={onExtension} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground">
            <Puzzle className="size-4 text-muted-foreground" /> Chrome extension
          </button>
          <Link href="/dashboard?recap=1" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground">
            <Zap className="size-4 text-muted-foreground" /> Weekly AI recap
          </Link>
        </SidebarSection>
      </div>
      <div className="m-2 rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Zap className="size-3.5 text-warning" /> {used} of {limit} sends today
          </p>
          <span className="rounded border border-border-strong px-1.5 py-px text-[10px] capitalize text-muted-foreground">{user.plan}</span>
        </div>
        <Progress value={limit ? Math.min(100, (used / limit) * 100) : 0} className="mt-2.5" />
        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <span className="text-subtle-foreground">Resets at 00:00 UTC</span>
          {user.plan === "free" ? (
            <Link href="/settings?tab=plan" className="font-medium text-foreground hover:underline">
              Upgrade
            </Link>
          ) : (
            <span className="text-muted-foreground">{session.user.sendingPaused ? "Paused" : "Sending on"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ top bar
function TopBar({ session, onMenu, onSearch }: { session: Session; onMenu: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const toast = useToast();
  const section = SECTION_TITLES[pathname.split("/")[1] ?? ""] ?? "";
  const { user, profile, org } = session;

  const exportCsv = async () => {
    const board = await api<{ columns: Record<string, { company: { name: string }; job: { title: string; url: string } | null; contact: { name: string } | null; stage: string; source: string; updatedAt: string }[]> }>("/crm/board");
    const rows = Object.values(board.columns).flat();
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["Company,Role,Contact,Stage,Source,Updated,Link", ...rows.map((r) => [r.company.name, r.job?.title ?? "", r.contact?.name ?? "", r.stage, r.source, r.updatedAt, r.job?.url ?? ""].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `jobpilot-pipeline-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} applications`);
  };
  const share = async () => {
    if (!profile.publicVisible || !user.publicSlug) {
      toast("Turn on your public profile in Settings to share it", "bad");
      return;
    }
    await navigator.clipboard.writeText(`${location.origin}/p/${user.publicSlug}`);
    toast("Profile link copied");
  };
  const invite = async () => {
    await navigator.clipboard.writeText(`${location.origin}/auth/signup?invite=${org!.inviteCode}`);
    toast("Student invite link copied");
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3 md:px-4">
      <button onClick={onMenu} aria-label="Open menu" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden">
        <Menu className="size-4" />
      </button>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] sm:flex">
        <span className="text-muted-foreground">JobPilot</span>
        <span className="text-subtle-foreground">/</span>
        <span className="truncate font-medium text-foreground">{section}</span>
      </nav>
      <button onClick={onSearch} className="mx-auto flex h-8 w-full max-w-[380px] items-center gap-2 rounded-lg border bg-card px-2.5 text-[13px] text-subtle-foreground transition hover:border-border-strong hover:text-muted-foreground">
        <Search className="size-3.5" />
        <span className="truncate">Search jobs, companies, people</span>
        <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
      </button>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" onClick={exportCsv} className="hidden bg-transparent md:inline-flex">
          <Download /> Export
        </Button>
        <Button variant="outline" onClick={share} className="hidden bg-transparent sm:inline-flex">
          <Share2 /> Share
        </Button>
        {user.orgRole === "admin" && org ? (
          <Button onClick={invite}>
            <UserPlus /> Invite
          </Button>
        ) : (
          <Link href="/campaigns/new" className={buttonVariants()}>
            <Plus /> <span className="hidden sm:inline">New campaign</span>
          </Link>
        )}
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ dialogs
function ExtensionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chrome extension</DialogTitle>
          <DialogDescription>One click on any careers page or profile finds the right email and drafts a message.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3 text-[13px] text-secondary-foreground">
          {["Run pnpm build:extension in the project (or use the extension/ folder as is).", "Open chrome://extensions, turn on Developer mode, and choose Load unpacked.", "Pick the extension folder, pin JobPilot, and sign in from its popup."].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] tabular text-foreground">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows = [
    ["⌘K", "Search jobs, companies and pages"],
    ["Pause all", "Live switch on the dashboard stops every send instantly"],
    ["Approval mode", "Every draft waits in Needs approval until you send it"],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help &amp; shortcuts</DialogTitle>
          <DialogDescription>A few things that make JobPilot faster.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
              <Kbd>{k}</Kbd>
              <span className="text-secondary-foreground">{v}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ shell
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Omit<Session, "reload"> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [extOpen, setExtOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // the path in the query makes these refresh on every navigation
  const counts = useApi<NavCounts>(`/nav-counts?at=${encodeURIComponent(pathname)}`);
  const notifications = useApi<{ items: Notification[]; unread: number }>(`/notifications?at=${encodeURIComponent(pathname)}`);

  const load = async () => {
    try {
      setSession(await api<Omit<Session, "reload">>("/auth/me"));
    } catch {
      /* api() sends you to the sign-in page on 401 */
    }
  };
  useEffect(() => {
    let alive = true;
    api<Omit<Session, "reload">>("/auth/me")
      .then((s) => {
        if (!alive) return;
        setSession(s);
        if (!s.user.onboardedAt) router.replace("/onboarding");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <Loading label="Loading your workspace…" />
        </div>
      </div>
    );
  }
  const full: Session = { ...session, reload: load };
  const signOut = async () => {
    await post("/auth/logout");
    router.push("/auth/signin");
  };
  const fullBleed = pathname === "/dashboard";
  const wide = pathname === "/tracker" || pathname === "/inbox";

  return (
    <SessionCtx.Provider value={full}>
      <div className="flex h-dvh overflow-hidden bg-[#050506] text-[13px] text-foreground md:p-1.5">
        <div className="flex min-w-0 flex-1 overflow-hidden bg-sidebar md:rounded-2xl md:border md:border-border">
          <Rail user={session.user} profile={session.profile} onSignOut={signOut} unread={notifications.data?.unread ?? 0} notifications={notifications.data?.items ?? []} onOpenNotes={() => notifications.data?.unread && void post("/notifications/read-all")} onHelp={() => setHelpOpen(true)} />
          <aside aria-label="Workspace" className="hidden w-[232px] shrink-0 border-r md:border-l lg:block">
            <Sidebar session={full} counts={counts.data} onExtension={() => setExtOpen(true)} />
          </aside>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="w-[264px] gap-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar session={full} counts={counts.data} onNavigate={() => setMenuOpen(false)} onExtension={() => setExtOpen(true)} />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            <TopBar session={full} onMenu={() => setMenuOpen(true)} onSearch={() => setSearchOpen(true)} />
            <main id="main" className="min-h-0 flex-1 overflow-y-auto">
              {fullBleed ? children : <div className={cn("mx-auto w-full px-4 py-6 md:px-8 md:py-8", !wide && "max-w-6xl")}>{children}</div>}
            </main>
          </div>
        </div>
      </div>
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} isAdmin={session.user.orgRole === "admin"} />
      <ExtensionDialog open={extOpen} onOpenChange={setExtOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </SessionCtx.Provider>
  );
}
