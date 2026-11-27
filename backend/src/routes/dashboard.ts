import { computeInsights, effectiveDailyLimit, groupRates, PLAN_LIMITS, STAGES } from "shared";
import { and, asc, desc, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "db";
import { me } from "../lib/auth";
import { outreachRecords } from "../services/analytics";

export const dashboardRouter = Router();

const DAY = 86400000;

function startOfUtcDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Monday 00:00 UTC of the current week. */
function startOfWeek(d = new Date()) {
  const x = startOfUtcDay(d);
  const dow = (x.getUTCDay() + 6) % 7;
  return new Date(x.getTime() - dow * DAY);
}

async function count(q: Promise<{ n: number }[]>) {
  const [r] = await q;
  return r?.n ?? 0;
}

/** Sidebar badges: approvals waiting, unhandled replies, pipeline by stage, today's sends. */
dashboardRouter.get("/nav-counts", async (req, res) => {
  const user = me(req);
  const pendingApproval = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.userId, user.id), eq(schema.messages.status, "pending_approval"))));
  const unhandledReplies = await count(
    db.select({ n: sql<number>`count(*)::int` }).from(schema.replies).where(and(eq(schema.replies.userId, user.id), eq(schema.replies.handled, false), ne(schema.replies.category, "out_of_office"))),
  );
  const stageRows = await db.select({ stage: schema.applications.stage, n: sql<number>`count(*)::int` }).from(schema.applications).where(eq(schema.applications.userId, user.id)).groupBy(schema.applications.stage);
  const sentToday = await count(
    db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.userId, user.id), gte(schema.messages.sentAt, startOfUtcDay()))),
  );
  const mailboxes = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.emailAccounts).where(and(eq(schema.emailAccounts.userId, user.id), eq(schema.emailAccounts.status, "active"))));
  res.json({
    pendingApproval,
    unhandledReplies,
    stages: Object.fromEntries(STAGES.map((s) => [s, stageRows.find((r) => r.stage === s)?.n ?? 0])),
    sentToday,
    dailySendLimit: PLAN_LIMITS[user.plan].dailySends,
    mailboxes,
  });
});

dashboardRouter.get("/dashboard", async (req, res) => {
  const user = me(req);
  const { days } = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) }).parse(req.query);
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const prevSince = new Date(since.getTime() - days * DAY);

  // ---- overview
  const sentIn = (from: Date, to: Date) =>
    count(db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.userId, user.id), inArray(schema.messages.status, ["sent", "bounced"]), gte(schema.messages.sentAt, from), lt(schema.messages.sentAt, to))));
  const repliesIn = (from: Date, to: Date) =>
    count(db.select({ n: sql<number>`count(*)::int` }).from(schema.replies).where(and(eq(schema.replies.userId, user.id), ne(schema.replies.category, "out_of_office"), gte(schema.replies.receivedAt, from), lt(schema.replies.receivedAt, to))));
  const matchesIn = (from: Date, to: Date) =>
    count(db.select({ n: sql<number>`count(*)::int` }).from(schema.jobMatches).where(and(eq(schema.jobMatches.userId, user.id), gte(schema.jobMatches.score, 50), gte(schema.jobMatches.createdAt, from), lt(schema.jobMatches.createdAt, to))));
  const [sent, sentPrev, replies, repliesPrev, matches, matchesToday] = await Promise.all([
    sentIn(since, now),
    sentIn(prevSince, since),
    repliesIn(since, now),
    repliesIn(prevSince, since),
    matchesIn(since, now),
    matchesIn(new Date(now.getTime() - DAY), now),
  ]);
  const needAction = await count(
    db.select({ n: sql<number>`count(*)::int` }).from(schema.replies).where(and(eq(schema.replies.userId, user.id), eq(schema.replies.handled, false), ne(schema.replies.category, "out_of_office"))),
  );

  // ---- workload: pipeline stages with a few company names each
  const apps = await db
    .select({ stage: schema.applications.stage, company: schema.companies.name, updatedAt: schema.applications.updatedAt })
    .from(schema.applications)
    .innerJoin(schema.companies, eq(schema.applications.companyId, schema.companies.id))
    .where(eq(schema.applications.userId, user.id))
    .orderBy(desc(schema.applications.updatedAt));
  const workload = STAGES.map((stage) => {
    const rows = apps.filter((a) => a.stage === stage);
    return { stage, count: rows.length, companies: [...new Set(rows.map((r) => r.company))].slice(0, 3), updatedAt: rows[0]?.updatedAt ?? null };
  });
  const active = apps.filter((a) => a.stage !== "rejected" && a.stage !== "offer").length;

  // ---- sending capacity today (same limit the sender enforces)
  const accounts = await db.select().from(schema.emailAccounts).where(and(eq(schema.emailAccounts.userId, user.id), eq(schema.emailAccounts.status, "active")));
  const limit = accounts.reduce(
    (sum, a) => sum + effectiveDailyLimit({ planLimit: PLAN_LIMITS[user.plan].dailySends, accountLimit: a.dailyLimit, warmupEnabled: a.warmupEnabled, warmupStartedAt: a.warmupStartedAt, healthScore: a.healthScore, now }),
    0,
  );
  const cappedLimit = Math.min(limit, PLAN_LIMITS[user.plan].dailySends);
  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart.getTime() + DAY);
  const sentToday = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.userId, user.id), gte(schema.messages.sentAt, dayStart))));
  const scheduledToday = await count(
    db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.userId, user.id), eq(schema.messages.status, "scheduled"), lte(schema.messages.scheduledAt, dayEnd))),
  );
  const capacity = {
    limit: cappedLimit,
    sent: sentToday,
    scheduled: Math.min(scheduledToday, Math.max(0, cappedLimit - sentToday)),
    free: Math.max(0, cappedLimit - sentToday - scheduledToday),
    mailboxes: accounts.length,
    resetsInHours: Math.ceil((dayEnd.getTime() - now.getTime()) / 3600000),
    paused: user.sendingPaused,
  };

  // ---- performance by audience (90-day window so the chart has enough data)
  const records = await outreachRecords(user.id, 90);
  const delivered = records.filter((r) => !r.bounced);
  const performance = {
    overallReplyRate: delivered.length ? delivered.filter((r) => r.replied).length / delivered.length : 0,
    companySize: groupRates(records, (r) => r.companySize),
    contactRole: groupRates(records, (r) => r.contactRole),
    tone: groupRates(records, (r) => r.tone),
    step: groupRates(records, (r) => (r.step === 0 ? "initial" : `follow-up ${r.step}`)),
  };

  // ---- recent activity across all applications
  const activity = await db
    .select({
      id: schema.applicationEvents.id,
      type: schema.applicationEvents.type,
      payload: schema.applicationEvents.payload,
      createdAt: schema.applicationEvents.createdAt,
      applicationId: schema.applications.id,
      roleTitle: schema.applications.roleTitle,
      companyId: schema.companies.id,
      company: schema.companies.name,
      contact: schema.contacts.name,
    })
    .from(schema.applicationEvents)
    .innerJoin(schema.applications, eq(schema.applicationEvents.applicationId, schema.applications.id))
    .innerJoin(schema.companies, eq(schema.applications.companyId, schema.companies.id))
    .leftJoin(schema.contacts, eq(schema.applications.contactId, schema.contacts.id))
    .where(and(eq(schema.applications.userId, user.id), inArray(schema.applicationEvents.type, ["email_sent", "reply", "stage_changed", "note", "manual_apply", "interview_scheduled", "bounced", "out_of_office", "created"])))
    .orderBy(desc(schema.applicationEvents.createdAt))
    .limit(30);

  // ---- upcoming: open reminders + next scheduled follow-ups
  const reminders = await db
    .select({ id: schema.reminders.id, text: schema.reminders.text, dueAt: schema.reminders.dueAt, applicationId: schema.reminders.applicationId })
    .from(schema.reminders)
    .where(and(eq(schema.reminders.userId, user.id), eq(schema.reminders.done, false)))
    .orderBy(asc(schema.reminders.dueAt))
    .limit(5);
  const nextSends = await db
    .select({ id: schema.messages.id, step: schema.messages.step, scheduledAt: schema.messages.scheduledAt, company: schema.companies.name, applicationId: schema.messages.applicationId })
    .from(schema.messages)
    .leftJoin(schema.contacts, eq(schema.messages.contactId, schema.contacts.id))
    .leftJoin(schema.companies, eq(schema.contacts.companyId, schema.companies.id))
    .where(and(eq(schema.messages.userId, user.id), eq(schema.messages.status, "scheduled")))
    .orderBy(asc(schema.messages.scheduledAt))
    .limit(3);
  const upcoming = [
    ...reminders.map((r) => ({ id: r.id, kind: /interview/i.test(r.text) ? "interview" : "reminder", title: r.text, at: r.dueAt, applicationId: r.applicationId })),
    ...nextSends.map((m) => ({ id: m.id, kind: "send", title: `${m.step === 0 ? "Email" : `Follow-up ${m.step}`} to ${m.company ?? "contact"}`, at: m.scheduledAt, applicationId: m.applicationId })),
  ]
    .sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime())
    .slice(0, 5);

  // ---- weekly goal + recap
  const weekStart = startOfWeek(now);
  const sentThisWeek = await sentIn(weekStart, new Date(now.getTime() + 1000));
  const weekRecords = records.filter((r) => r.sentAt >= new Date(now.getTime() - 7 * DAY));
  const interviews = await count(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.applicationEvents)
      .innerJoin(schema.applications, eq(schema.applicationEvents.applicationId, schema.applications.id))
      .where(and(eq(schema.applications.userId, user.id), eq(schema.applicationEvents.type, "stage_changed"), sql`${schema.applicationEvents.payload}->>'to' = 'interview'`, gte(schema.applicationEvents.createdAt, new Date(now.getTime() - 7 * DAY)))),
  );

  res.json({
    days,
    overview: {
      sent: { value: sent, previous: sentPrev },
      replies: { value: replies, previous: repliesPrev, needAction },
      matches: { value: matches, today: matchesToday },
    },
    workload,
    activeApplications: active,
    capacity,
    performance,
    activity,
    upcoming,
    weekly: { goal: user.weeklyGoal, sent: sentThisWeek },
    recap: {
      sent: weekRecords.length,
      replies: weekRecords.filter((r) => r.replied).length,
      positive: weekRecords.filter((r) => r.positive).length,
      interviews,
      insight: computeInsights(records)[0]?.text ?? null,
    },
  });
});
