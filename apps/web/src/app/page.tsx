import Link from "next/link";

const FEATURES = [
  { title: "Jobs that fit you", body: "Greenhouse, Lever, Ashby, Workable, YC, HN Who's Hiring, Remotive and RemoteOK in one feed, deduplicated, scam-checked and scored 0–100 against your profile with the reasons." },
  { title: "The right person, verified", body: "Finds founders, CTOs, hiring managers and recruiters, learns each company's email pattern, and checks MX/SMTP before anything is sent." },
  { title: "Emails that sound like you", body: "Each draft opens with something specific about them and ties your best-matching project to their product. Three tones, 3–5 subject lines, spam check." },
  { title: "Your inbox, your rules", body: "Sends from your own Gmail or Outlook at 10 AM their time, with day 3 / 7 / 14 follow-ups that stop the moment someone replies." },
  { title: "Replies, sorted", body: "Interested, referral, asked for resume, out-of-office, rejected. Each comes with a suggested reply and a booking link." },
  { title: "Tracker to offer", body: "A kanban from Found to Offer, notes and reminders, and an interview prep pack built from your real projects." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-bold text-brand-ink">J</span>
          <span className="text-lg font-semibold">JobPilot</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-lg px-3 py-2 text-ink-2 hover:bg-surface-2">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90">Get started free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8 md:pt-20">
        <p className="mb-4 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">For students, freshers and experienced engineers</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Stop applying into the void. Email the people who hire.</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">
          Upload your resume once. JobPilot finds roles that fit, finds the founder or hiring manager, writes a personal email that points to your most relevant project, and follows up for you.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-lg bg-brand px-5 py-3 font-medium text-brand-ink hover:opacity-90">Start with your resume</Link>
          <Link href="/login" className="rounded-lg border border-border bg-surface px-5 py-3 font-medium hover:bg-surface-2">I have an account</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Free", price: "$0", items: ["15 sends / day", "40 AI drafts / month", "Approval mode", "1 mailbox"] },
            { name: "Pro", price: "$12/mo", items: ["80 sends / day", "Autopilot + bulk campaigns", "A/B subject tests", "3 mailboxes, WhatsApp alerts"] },
            { name: "College", price: "Per seat", items: ["Placement-cell dashboard", "Invite codes for students", "Alumni referral finder", "Pro features for every student"] },
          ].map((p) => (
            <div key={p.name} className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <p className="text-sm font-medium text-ink-3">{p.name}</p>
              <p className="mt-1 text-3xl font-semibold">{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-2">
                {p.items.map((i) => (
                  <li key={i}>✓ {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-ink-3">JobPilot sends only from your own mailbox, at human pace. You approve every email unless you switch on autopilot.</footer>
    </div>
  );
}
