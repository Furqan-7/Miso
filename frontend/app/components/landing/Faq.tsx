"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Reveal, SectionHeading } from "./motion";

const FAQ = [
  ["Does JobPilot send email from its own servers?", "No. You connect your own Gmail or Outlook with OAuth and every email goes out from your mailbox, at a human pace, with daily limits and random gaps between sends."],
  ["Will my account get flagged as spam?", "JobPilot checks your SPF, DKIM and DMARC records, warms new mailboxes up gradually, verifies every address before sending, removes bounces automatically and lets you pause everything in one click."],
  ["How does it find the right person's email?", "It reads the company's team pages, public GitHub activity and job posts, learns the company's email pattern (like first@ or f.last@), then checks the mailbox exists before suggesting it, with a confidence score."],
  ["Do I have to approve every email?", "By default, yes. You can edit any draft, rewrite it in another tone, or switch a campaign to autopilot on Pro once you're happy with the drafts."],
  ["Does it work without AI keys?", "Yes. Matching, drafting, reply sorting and prep packs all have a rule-based mode. Add a Claude API key and every AI feature gets sharper."],
  ["What about LinkedIn?", "LinkedIn doesn't allow automated access, so JobPilot doesn't scrape it. The Chrome extension captures the job or profile you're looking at, and connection notes are written for you to send yourself."],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-6 py-28 md:grid-cols-[1fr_1.4fr]">
      <SectionHeading align="left" eyebrow="FAQ" title="Questions, answered." body="Anything else? The README in the repo covers setup and every environment variable." />
      <Reveal>
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
