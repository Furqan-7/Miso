import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { buttonVariants } from "../ui/button";
import { Reveal } from "./motion";

export function Cta() {
  return (
    <section className="px-6 pb-28">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border bg-card px-6 py-20 text-center">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(50%_70%_at_50%_100%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(76,141,255,0.3),transparent)] blur-2xl" />
        <h2 className="display relative mx-auto max-w-2xl text-[36px] text-foreground sm:text-[52px]">Stop applying into the void.</h2>
        <p className="relative mx-auto mt-4 max-w-md text-[15px] text-muted-foreground">Email the people who hire, with a message they&apos;ll actually read.</p>
        <Link href="/auth/signup" className={cn(buttonVariants({ size: "lg" }), "relative mt-8 rounded-full px-7")}>
          Start free with your resume
        </Link>
      </Reveal>
    </section>
  );
}
