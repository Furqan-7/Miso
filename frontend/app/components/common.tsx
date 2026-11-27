"use client";

/**
 * App-level building blocks used by every page, built on the shadcn components in ./ui.
 * Keeps page code short: <PageHeader>, <Stat>, <Score>, <Empty>, labelled form fields, toasts.
 */
import { AlertCircle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Children, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import { Badge as UIBadge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { Button as UIButton, buttonVariants } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Input as UIInput } from "./ui/input";
import { Label } from "./ui/label";
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Toaster } from "./ui/sonner";
import { Tabs as UITabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea as UITextarea } from "./ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { TooltipProvider } from "./ui/tooltip";

export const cx = cn;

// ---------------------------------------------------------------- buttons
type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";
const variantMap = { primary: "default", secondary: "outline", ghost: "ghost", danger: "destructive", brand: "brand" } as const;

export function Button({ variant = "primary", size = "md", loading, children, ...rest }: React.ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return (
    <UIButton variant={variantMap[variant]} size={size === "md" ? "default" : size} disabled={rest.disabled || loading} {...rest}>
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </UIButton>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: variantMap[variant], size: size === "md" ? "default" : size }), className)}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------- surfaces
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <UICard className={cn("block", className)} {...rest}>
      {children}
    </UICard>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad" | "info" | "violet";
const toneMap = { neutral: "secondary", brand: "brand", ok: "success", warn: "warning", bad: "destructive", info: "brand", violet: "violet" } as const;
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <UIBadge variant={toneMap[tone]} className={className}>
      {children}
    </UIBadge>
  );
}

/** Status pill with a dot, like "• Assigned" in the activity list. */
export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const dot = { neutral: "bg-muted-foreground", brand: "bg-brand", ok: "bg-success", warn: "bg-warning", bad: "bg-destructive", info: "bg-info", violet: "bg-violet" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- form fields
function Field({ id, label, hint, children }: { id: string; label?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      {children}
      {hint && <p className="text-[11px] text-subtle-foreground">{hint}</p>}
    </div>
  );
}

function useFieldId(explicit?: string) {
  const auto = useId();
  return explicit ?? auto;
}

export function Input({ label, hint, className, ...rest }: React.ComponentProps<"input"> & { label?: string; hint?: string }) {
  const id = useFieldId(rest.id);
  return (
    <Field id={id} label={label} hint={hint}>
      <UIInput {...rest} id={id} className={className} />
    </Field>
  );
}

export function Textarea({ label, hint, className, ...rest }: React.ComponentProps<"textarea"> & { label?: string; hint?: string }) {
  const id = useFieldId(rest.id);
  return (
    <Field id={id} label={label} hint={hint}>
      <UITextarea {...rest} id={id} className={className} />
    </Field>
  );
}

/**
 * Radix Select with a native-like API: pass <option> children and an onChange that reads
 * e.target.value, so forms stay simple while rendering the shadcn menu.
 */
export function Select({
  label,
  hint,
  value,
  onChange,
  children,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  label?: string;
  hint?: string;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const id = useFieldId();
  const options = Children.toArray(children).filter(isValidElement) as ReactElement<{ value?: string | number; children: ReactNode; disabled?: boolean }>[];
  const EMPTY = "__empty__";
  const current = value === undefined || value === "" ? EMPTY : String(value);
  return (
    <Field id={id} label={label} hint={hint}>
      <UISelect value={current} disabled={disabled} onValueChange={(v) => onChange?.({ target: { value: v === EMPTY ? "" : v } })}>
        <SelectTrigger id={id} aria-label={ariaLabel ?? label} className={cn("w-full", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const v = o.props.value === undefined || o.props.value === "" ? EMPTY : String(o.props.value);
            return (
              <SelectItem key={v} value={v} disabled={o.props.disabled}>
                {o.props.children}
              </SelectItem>
            );
          })}
        </SelectContent>
      </UISelect>
    </Field>
  );
}

/** Multi-select as toggleable pills (shadcn ToggleGroup). */
export function Chips<T extends string>({ options, value, onChange, labels }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <ToggleGroup type="multiple" value={value} onValueChange={(v) => onChange(v as T[])}>
      {options.map((o) => (
        <ToggleGroupItem key={o} value={o} aria-label={labels?.[o] ?? o.replace(/_/g, " ")}>
          {labels?.[o] ?? o.replace(/_/g, " ")}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background/60 p-1.5 focus-within:border-brand/60 focus-within:ring-[3px] focus-within:ring-ring/25">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-secondary-foreground">
          {v}
          <button type="button" aria-label={`Remove ${v}`} className="text-subtle-foreground hover:text-destructive" onClick={() => onChange(value.filter((x) => x !== v))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 text-[13px] text-foreground placeholder:text-subtle-foreground focus:outline-none"
      />
    </div>
  );
}

/** shadcn Checkbox with a clickable label. */
export function CheckField({ label, checked, onChange, disabled, children }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled} />
      <Label htmlFor={id} className="text-[13px] font-normal text-secondary-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** shadcn Switch row with label + optional description. */
export function SwitchField({ label, description, checked, onChange, disabled }: { label: ReactNode; description?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ---------------------------------------------------------------- states
export function Spinner({ small }: { small?: boolean }) {
  return <LoaderCircle aria-hidden className={cn("animate-spin text-muted-foreground", small ? "size-3.5" : "size-4")} />;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label={label}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground">{icon}</div>}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {body && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Match score as a ring: green 75+, amber 50+, grey below. */
export function Score({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? 64 : size === "sm" ? 34 : 42;
  const stroke = size === "lg" ? 4 : 3;
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "var(--success)" : value >= 50 ? "var(--warning)" : "var(--subtle-foreground)";
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }} aria-label={`Match score ${value} out of 100`} role="img">
      <svg width={px} height={px} className="-rotate-90">
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center font-semibold tabular text-foreground", size === "lg" ? "text-lg" : size === "sm" ? "text-[11px]" : "text-[13px]")}>{value}</span>
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <UICard className="gap-0 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </UICard>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Underline tab bar (content is rendered by the page). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number; icon?: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <UITabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.icon}
            {t.label}
            {t.count !== undefined && <span className="rounded bg-muted px-1.5 text-[10px] tabular text-muted-foreground">{t.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </UITabs>
  );
}

// ---------------------------------------------------------------- toasts (sonner)
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}

export function useToast() {
  return (text: string, tone: "ok" | "bad" = "ok") => (tone === "ok" ? toast.success(text) : toast.error(text));
}

// ---------------------------------------------------------------- formatting
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const fut = s < 0;
  const a = Math.abs(s);
  const v = a < 60 ? `${Math.round(a)}s` : a < 3600 ? `${Math.round(a / 60)}m` : a < 86400 ? `${Math.round(a / 3600)}h` : `${Math.round(a / 86400)}d`;
  return fut ? `in ${v}` : `${v} ago`;
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
