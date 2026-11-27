import Link from "next/link";
import { Logo } from "../Logo";

const COLS = [
  { title: "Product", links: [["Features", "#product"], ["How it works", "#how"], ["Pricing", "#pricing"], ["FAQ", "#faq"]] },
  { title: "Account", links: [["Sign in", "/auth/signin"], ["Create account", "/auth/signup"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">Sends only from your own mailbox, at human pace. You approve every email unless you switch on autopilot.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-[12px] font-medium text-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([l, h]) => (
                <li key={l}>
                  <Link href={h} className="text-[13px] text-muted-foreground transition hover:text-foreground">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 py-6 text-center text-[12px] text-subtle-foreground">© {new Date().getFullYear()} JobPilot</div>
    </footer>
  );
}
