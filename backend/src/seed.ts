import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";
import { ingestJobs, scoreJobsForUser } from "./ingest";
import { randomToken } from "./lib/crypto";
import { SAMPLE_CONTACTS, SAMPLE_JOBS } from "./fixtures";
import { db, pool, schema } from "db";
import { runMigrations } from "db/migrate";

/** Creates a demo account (demo@jobpilot.dev / demo12345) with a filled profile, jobs, contacts and a dev mailbox. */
export async function seed() {
  await runMigrations();
  const email = "demo@jobpilot.dev";
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({ email, name: "Asha Verma", passwordHash: await hashPassword("demo12345"), publicSlug: "asha-verma", onboardedAt: new Date() })
      .returning();
    await db.insert(schema.profiles).values({
      userId: user.id,
      headline: "Full-stack developer (Next.js, Node.js, PostgreSQL)",
      summary: "Final-year CS student who ships products end to end.",
      experienceLevel: "fresher",
      yearsExperience: 0,
      targetRoles: ["frontend", "fullstack", "ai_engineer"],
      skills: ["TypeScript", "JavaScript", "Next.js", "React", "Node.js", "Express", "PostgreSQL", "Redis", "Tailwind CSS", "Python", "LLMs"],
      projects: [
        { name: "ShopSmart", description: "An e-commerce storefront with Stripe payments and an admin dashboard.", technologies: ["Next.js", "TypeScript", "PostgreSQL", "Stripe", "Tailwind CSS"], url: "https://github.com/asha/shopsmart" },
        { name: "ChatDocs", description: "A RAG chatbot that answers questions over uploaded PDFs.", technologies: ["Python", "FastAPI", "LLMs", "RAG", "PostgreSQL"], url: "https://github.com/asha/chatdocs" },
        { name: "InvoiceFlow", description: "Invoice generator for freelancers with reminders and payment links.", technologies: ["React", "Node.js", "Express", "Redis"] },
      ],
      education: [{ institution: "National Institute of Technology, Trichy", degree: "B.Tech", field: "Computer Science", end: "2026" }],
      links: { github: "https://github.com/asha", portfolio: "https://asha.dev" },
      preferences: { workModes: ["remote", "hybrid"], cities: ["Bangalore", "Pune"], companySizes: ["startup"], industries: ["fintech", "ai"], employmentTypes: ["internship", "full_time"], expectedComp: { min: 30000, currency: "INR", period: "month" } },
      writingSample: "Hey! I'm Asha. I like building small, useful things fast and then polishing them.\n\nThanks,\nAsha",
      college: "National Institute of Technology, Trichy",
      timezone: "Asia/Kolkata",
      publicVisible: true,
    });
    await db.insert(schema.emailAccounts).values({ userId: user.id, provider: "dev", email, warmupEnabled: false, dailyLimit: 50 });
  }
  const r = await ingestJobs(SAMPLE_JOBS);
  const companies = await db.select().from(schema.companies);
  for (const c of companies) {
    for (const p of SAMPLE_CONTACTS[c.domain ?? ""] ?? []) {
      await db
        .insert(schema.contacts)
        .values({ companyId: c.id, name: p.name, title: p.title, email: p.email, emailStatus: "valid", emailConfidence: 93, role: /ceo|founder/i.test(p.title) ? "founder" : /cto|head of eng/i.test(p.title) ? "cto" : "hiring_manager", source: "seed", timezone: c.timezone })
        .onConflictDoNothing();
    }
    if (c.domain === "paynest.io") await db.update(schema.companies).set({ product: "checkout and invoicing for small online stores", techStack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"], size: "startup", teamSize: 18, industry: "fintech", recentNews: [{ title: "PayNest raises $4M seed round" }] }).where(eq(schema.companies.id, c.id));
    if (c.domain === "tallyhouse.app") await db.update(schema.companies).set({ size: "startup", teamSize: 6, product: "bookkeeping automation for small businesses" }).where(eq(schema.companies.id, c.id));
  }
  await scoreJobsForUser(user.id);
  await seedOutreachHistory(user.id);
  return { user, jobs: r };
}

const DAY = 86400000;

/** Extra demo companies so the dashboard and analytics have something to show. */
const DEMO_COMPANIES = [
  { name: "Northwind Labs", domain: "northwindlabs.io", size: "startup" as const, contact: ["Maya Chen", "Founder", "founder"] },
  { name: "Quill AI", domain: "quill.ai", size: "startup" as const, contact: ["Jon Park", "CTO", "cto"] },
  { name: "Brightside Health", domain: "brightside.health", size: "scaleup" as const, contact: ["Priya Nair", "Engineering Manager", "hiring_manager"] },
  { name: "Vertex Cloud", domain: "vertexcloud.com", size: "mnc" as const, contact: ["Alex Moreno", "Technical Recruiter", "recruiter"] },
  { name: "Orbit Logistics", domain: "orbitlogistics.com", size: "mnc" as const, contact: ["Hannah Lee", "Talent Partner", "recruiter"] },
  { name: "Lantern Labs", domain: "lanternlabs.dev", size: "startup" as const, contact: ["Omar Haddad", "Co-founder", "founder"] },
];

/**
 * A realistic two-week outreach history for the demo account: sends, opens, follow-ups,
 * replies of each kind, stage changes and reminders. Runs once (skipped if messages exist).
 */
async function seedOutreachHistory(userId: string) {
  const existing = await db.select({ id: schema.messages.id }).from(schema.messages).where(eq(schema.messages.userId, userId)).limit(1);
  if (existing.length) return;
  const [account] = await db.select().from(schema.emailAccounts).where(eq(schema.emailAccounts.userId, userId));
  if (!account) return;
  for (const c of DEMO_COMPANIES) {
    const [company] = await db
      .insert(schema.companies)
      .values({ name: c.name, domain: c.domain, website: `https://${c.domain}`, size: c.size, timezone: "America/New_York" })
      .onConflictDoNothing()
      .returning();
    if (!company) continue;
    await db.insert(schema.contacts).values({ companyId: company.id, name: c.contact[0], title: c.contact[1], role: c.contact[2], email: `${c.contact[0].split(" ")[0].toLowerCase()}@${c.domain}`, emailStatus: "valid", emailConfidence: 92, source: "seed", timezone: "America/New_York" }).onConflictDoNothing();
  }
  const companies = await db.select().from(schema.companies);
  const contacts = await db.select().from(schema.contacts);
  // [company, days ago sent, opened, reply category | null, follow-up sent?, final stage]
  const plan: [string, number, boolean, string | null, boolean, "emailed" | "replied" | "interview" | "rejected"][] = [
    ["PayNest", 2, true, "interested", false, "interview"],
    ["Tallyhouse", 4, true, "asked_for_resume", false, "replied"],
    ["Lumen AI", 6, true, null, true, "emailed"],
    ["PixelCraft", 9, false, null, true, "emailed"],
    ["Northwind Labs", 3, true, "interested", false, "replied"],
    ["Quill AI", 5, true, "referral", false, "replied"],
    ["Brightside Health", 8, true, null, true, "emailed"],
    ["Vertex Cloud", 10, false, "rejected", false, "rejected"],
    ["Orbit Logistics", 12, true, null, true, "emailed"],
    ["Lantern Labs", 1, false, null, false, "emailed"],
  ];
  const now = Date.now();
  for (const [name, daysAgo, opened, reply, followup, stage] of plan) {
    const company = companies.find((x) => x.name === name);
    const contact = contacts.find((x) => x.companyId === company?.id);
    if (!company || !contact?.email) continue;
    const sentAt = new Date(now - daysAgo * DAY - 3 * 3600000);
    const [app] = await db.insert(schema.applications).values({ userId, companyId: company.id, contactId: contact.id, stage, roleTitle: "Software Engineer", updatedAt: new Date(sentAt.getTime() + DAY) }).returning();
    const events: { type: string; payload: Record<string, unknown>; createdAt: Date }[] = [{ type: "created", payload: { source: "auto", stage: "found" }, createdAt: new Date(sentAt.getTime() - 3600000) }];
    const [msg] = await db
      .insert(schema.messages)
      .values({ userId, applicationId: app.id, contactId: contact.id, emailAccountId: account.id, toEmail: contact.email, step: 0, subject: `Engineer who built ShopSmart`, body: `Hi ${contact.name.split(" ")[0]},\n\nI built ShopSmart…`, tone: daysAgo % 2 ? "casual" : "founder", templateKey: "fallback:casual:step0", status: "sent", sentAt, scheduledAt: sentAt, trackingId: randomToken(12), openedAt: opened ? new Date(sentAt.getTime() + 2 * 3600000) : null, openCount: opened ? 2 : 0, providerThreadId: `seed-${app.id}`, rfcMessageId: `<seed-${app.id}@jobpilot.local>` })
      .returning();
    events.push({ type: "email_sent", payload: { messageId: msg.id, step: 0, subject: msg.subject, to: contact.email }, createdAt: sentAt });
    events.push({ type: "stage_changed", payload: { from: "found", to: "emailed", reason: "initial email sent" }, createdAt: sentAt });
    if (followup) {
      const fAt = new Date(sentAt.getTime() + 3 * DAY);
      if (fAt.getTime() < now) {
        await db.insert(schema.messages).values({ userId, applicationId: app.id, contactId: contact.id, emailAccountId: account.id, toEmail: contact.email, step: 1, subject: `Re: ${msg.subject}`, body: "Bumping this in case it got buried.", tone: msg.tone, templateKey: "fallback:casual:step1", status: "sent", sentAt: fAt, scheduledAt: fAt, trackingId: randomToken(12), providerThreadId: msg.providerThreadId });
        events.push({ type: "email_sent", payload: { step: 1, subject: `Re: ${msg.subject}`, to: contact.email }, createdAt: fAt });
      }
      const next = new Date(sentAt.getTime() + 7 * DAY);
      if (next.getTime() > now) await db.insert(schema.messages).values({ userId, applicationId: app.id, contactId: contact.id, emailAccountId: account.id, toEmail: contact.email, step: 2, subject: `Re: ${msg.subject}`, body: "One more idea…", tone: msg.tone, status: "scheduled", scheduledAt: next, trackingId: randomToken(12), providerThreadId: msg.providerThreadId });
    }
    if (reply) {
      const rAt = new Date(sentAt.getTime() + 20 * 3600000);
      const bodies: Record<string, string> = {
        interested: "Thanks for reaching out! Would love to chat. Are you free Thursday?",
        asked_for_resume: "Could you send over your resume? Happy to take a look.",
        referral: "I'm not the right person, but please reach out to dana@quill.ai who runs hiring.",
        rejected: "Unfortunately we're not hiring for this right now. Best of luck!",
      };
      const first = contact.name.split(" ")[0];
      const suggested: Record<string, string> = {
        interested: `Hi ${first},\n\nThanks so much for getting back to me! Thursday works well. I'm free between 11 AM and 4 PM your time, so pick whatever suits you best.\n\nLooking forward to it,\nAsha`,
        asked_for_resume: `Hi ${first},\n\nThank you! I've attached my resume. Happy to walk you through any of the projects on it.\n\nBest,\nAsha`,
        referral: `Hi ${first},\n\nThank you for pointing me in the right direction, I really appreciate it. I'll reach out to Dana and mention you suggested it, if that's okay.\n\nThanks again,\nAsha`,
        rejected: `Hi ${first},\n\nThanks for letting me know, and for taking the time to reply. If anything opens up later, I'd love to be considered.\n\nAsha`,
      };
      await db.update(schema.messages).set({ repliedAt: rAt }).where(eq(schema.messages.id, msg.id));
      await db.insert(schema.replies).values({ userId, messageId: msg.id, applicationId: app.id, fromEmail: contact.email, subject: `Re: ${msg.subject}`, body: bodies[reply], suggestedReply: suggested[reply], receivedAt: rAt, category: reply, confidence: 0.9, handled: reply === "rejected", providerMessageId: `seed-reply-${app.id}` });
      events.push({ type: "reply", payload: { category: reply, summary: bodies[reply].slice(0, 60) }, createdAt: rAt });
      if (stage !== "emailed") events.push({ type: "stage_changed", payload: { from: "emailed", to: stage === "interview" ? "replied" : stage, reason: `reply classified as ${reply}` }, createdAt: rAt });
      if (stage === "interview") events.push({ type: "stage_changed", payload: { from: "replied", to: "interview", reason: "meeting booked" }, createdAt: new Date(rAt.getTime() + 6 * 3600000) });
    }
    await db.insert(schema.applicationEvents).values(events.map((e) => ({ applicationId: app.id, ...e })));
    if (stage === "interview") await db.insert(schema.reminders).values({ userId, applicationId: app.id, text: `Interview with ${name}`, dueAt: new Date(now + DAY + 2 * 3600000) });
  }
  const [pix] = await db.select().from(schema.applications).innerJoin(schema.companies, eq(schema.applications.companyId, schema.companies.id)).where(eq(schema.companies.name, "PixelCraft"));
  if (pix) await db.insert(schema.reminders).values({ userId, applicationId: pix.applications.id, text: "Follow up with PixelCraft recruiter", dueAt: new Date(now + 2 * DAY) });
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed()
    .then(({ jobs }) => {
      console.log(`seeded: demo@jobpilot.dev / demo12345 (${jobs.inserted} new jobs, ${jobs.merged} merged)`);
      return pool.end();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
