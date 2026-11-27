"use client";

import { Building, Copy, Ellipsis, GraduationCap, KeyRound, RotateCw, Trophy, UserMinus, Users, Video } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSession } from "@/app/(app)/AppShell";
import { Badge, Button, Card, CardHeader, ErrorNote, initials, Input, Loading, PageHeader, useToast } from "@/app/components/common";
import { Button as UIButton } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Progress } from "@/app/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/app/lib/utils";
import { errorMessage, post } from "@/app/services/api";

interface Students {
  org: { id: string; name: string; inviteCode: string; seats: number };
  students: { id: string; name: string; email: string; orgRole: string; onboardedAt: string | null; pipeline: Record<string, number>; sent30d: number; replies30d: number }[];
  totals: { students: number; offers: number; interviews: number };
}

/** Pipeline stages in order, with the same colours as the tracker and dashboard. */
const STAGES = [
  { id: "found", label: "Found", color: "var(--muted-foreground)" },
  { id: "emailed", label: "Emailed", color: "var(--chart-1)" },
  { id: "replied", label: "Replied", color: "var(--success)" },
  { id: "interview", label: "Interview", color: "var(--warning)" },
  { id: "offer", label: "Offer", color: "var(--violet)" },
  { id: "rejected", label: "Closed", color: "var(--destructive)" },
];

function Tile({ label, value, icon, children }: { label: string; value: ReactNode; icon: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-secondary-foreground">{label}</span>
        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>
      {children}
    </div>
  );
}

/** One stacked bar per student: how their applications split across stages. */
function PipelineBar({ pipeline }: { pipeline: Record<string, number> }) {
  const total = STAGES.reduce((a, s) => a + (pipeline[s.id] ?? 0), 0);
  if (!total) return <span className="text-[11px] text-subtle-foreground">No applications</span>;
  return (
    <div className="flex h-2 w-44 gap-[2px]" role="img" aria-label={STAGES.map((s) => `${s.label} ${pipeline[s.id] ?? 0}`).join(", ")}>
      {STAGES.filter((s) => pipeline[s.id]).map((s) => (
        <Tooltip key={s.id}>
          <TooltipTrigger asChild>
            <span className="h-full rounded-[3px]" style={{ width: `${((pipeline[s.id] ?? 0) / total) * 100}%`, background: s.color, minWidth: 4 }} />
          </TooltipTrigger>
          <TooltipContent>
            {s.label}: {pipeline[s.id]}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function AdminView() {
  const toast = useToast();
  const { data, loading, reload } = useApi<Students>("/org/students");
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const invite = typeof window !== "undefined" ? `${location.origin}/auth/signup?invite=${data.org.inviteCode}` : "";
  return (
    <>
      <PageHeader title={data.org.name} subtitle="Placement-cell dashboard: every student's pipeline in one place. Emails stay private to each student." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Students" value={`${data.totals.students} / ${data.org.seats}`} icon={<Users />}>
          <Progress value={(data.totals.students / Math.max(data.org.seats, 1)) * 100} className="mt-3 h-1" />
        </Tile>
        <Tile label="Interviews" value={data.totals.interviews} icon={<Video />} />
        <Tile label="Offers" value={data.totals.offers} icon={<Trophy />} />
        <Tile label="Invite code" value={<span className="font-mono text-[20px]">{data.org.inviteCode}</span>} icon={<KeyRound />}>
          <div className="mt-2.5 flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(invite);
                toast("Invite link copied");
              }}
            >
              <Copy /> Copy link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await post("/org/rotate-invite");
                await reload();
                toast("New code generated");
              }}
            >
              <RotateCw /> Rotate
            </Button>
          </div>
        </Tile>
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Students"
          action={
            <div className="hidden flex-wrap gap-3 text-[11px] text-muted-foreground md:flex">
              {STAGES.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          }
        />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Student</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead className="text-right">Interviews</TableHead>
              <TableHead className="text-right">Offers</TableHead>
              <TableHead className="text-right">Sent 30d</TableHead>
              <TableHead className="text-right">Replies 30d</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold text-secondary-foreground">{initials(s.name)}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        {s.name} {s.orgRole === "admin" && <Badge tone="brand">Admin</Badge>}
                      </p>
                      <p className="text-xs text-subtle-foreground">
                        {s.email}
                        {!s.onboardedAt ? " · not onboarded" : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <PipelineBar pipeline={s.pipeline} />
                </TableCell>
                <TableCell className="text-right tabular">{s.pipeline.interview ?? 0}</TableCell>
                <TableCell className={cn("text-right tabular", (s.pipeline.offer ?? 0) > 0 && "font-semibold text-violet")}>{s.pipeline.offer ?? 0}</TableCell>
                <TableCell className="text-right tabular text-secondary-foreground">{s.sent30d}</TableCell>
                <TableCell className="text-right tabular text-secondary-foreground">{s.replies30d}</TableCell>
                <TableCell className="pr-4">
                  {s.orgRole !== "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <UIButton size="icon-sm" variant="ghost" aria-label={`Actions for ${s.name}`}>
                          <Ellipsis />
                        </UIButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" onSelect={() => setRemoving({ id: s.id, name: s.name })}>
                          <UserMinus className="text-destructive" /> Remove from {data.org.name}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing?.name}?</DialogTitle>
            <DialogDescription>They keep their account and data but move back to the Free plan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!removing) return;
                setBusy(true);
                try {
                  await post(`/org/students/${removing.id}/remove`);
                  toast(`${removing.name} removed`);
                  setRemoving(null);
                  await reload();
                } catch (e) {
                  toast(errorMessage(e), "bad");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function OrgPage() {
  const { user, org, reload } = useSession();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(100);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (user.orgRole === "admin") return <AdminView />;
  if (org)
    return (
      <>
        <PageHeader title={org.name} />
        <Card className="flex items-start gap-3 p-5">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-[13px] leading-relaxed text-secondary-foreground">You&apos;re part of {org.name}. Your placement cell can see your pipeline stats, never your emails.</p>
        </Card>
      </>
    );
  const run = async (what: string, fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(what);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHeader title="College / placement cell" subtitle="One admin manages many students. Students get Pro features." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Building className="size-4 text-muted-foreground" /> Create an organization
          </p>
          <Input label="College or placement cell name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Seats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          <Button disabled={name.length < 2} loading={busy === "create"} onClick={() => run("create", () => post("/org", { name, seats }))}>
            Create
          </Button>
        </Card>
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <KeyRound className="size-4 text-muted-foreground" /> Join with an invite code
          </p>
          <Input label="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="secondary" disabled={!code} loading={busy === "join"} onClick={() => run("join", () => post("/org/join", { inviteCode: code }))}>
            Join
          </Button>
        </Card>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </>
  );
}
