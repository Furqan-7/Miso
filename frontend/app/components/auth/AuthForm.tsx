"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessage, post } from "@/app/services/api";
import type { User } from "@/app/types/api";
import { ErrorNote } from "../common";
import { Logo } from "../Logo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AuthShowcase } from "./AuthShowcase";

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: params.get("invite") ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const signin = mode === "signin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = signin ? { email: form.email, password: form.password } : { ...form, inviteCode: form.inviteCode || undefined };
      const { user } = await post<{ user: User }>(`/auth/${signin ? "login" : "signup"}`, body);
      const next = params.get("next");
      router.push(!signin || !user.onboardedAt ? "/onboarding" : next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" aria-label="JobPilot home" className="w-fit">
          <Logo />
        </Link>
        <motion.div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <h1 className="display text-[32px] text-foreground">{signin ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">{signin ? "Sign in to pick up where your search left off." : "Upload your resume next. Setup takes about three minutes."}</p>

          <form onSubmit={submit} className="mt-8 grid gap-4">
            {!signin && (
              <div className="grid gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={signin ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-10 pr-10"
                />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-subtle-foreground hover:text-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {!signin && <p className="text-[11px] text-subtle-foreground">At least 8 characters</p>}
            </div>
            {!signin && (
              <div className="grid gap-1.5">
                <Label htmlFor="invite">
                  College invite code <span className="font-normal text-subtle-foreground">(optional)</span>
                </Label>
                <Input id="invite" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} className="h-10" />
              </div>
            )}
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" size="lg" disabled={busy} className="mt-1 h-10 w-full">
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              {signin ? "Sign in" : "Create account"}
              {!busy && <ArrowRight />}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {signin ? (
              <>
                New to JobPilot?{" "}
                <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/auth/signup">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/auth/signin">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </motion.div>
        <p className="text-center text-[11px] text-subtle-foreground">Emails are only ever sent from mailboxes you connect.</p>
      </div>
      <AuthShowcase />
    </div>
  );
}
