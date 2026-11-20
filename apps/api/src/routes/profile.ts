import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  guessTimezone,
  normalizeSkills,
  TARGET_ROLES,
  WORK_MODES,
  type Project,
} from "@jobpilot/shared";
import { eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { me } from "../auth";
import { config } from "../config";
import { db, schema } from "../db";
import { badRequest } from "../lib/errors";
import { scoreJobsForUser } from "../services/discovery";
import { analyzeWritingStyle, enrichGithub, enrichPortfolio, githubReposToProjects, linkedinNote } from "../services/enrich";
import { parseResume } from "../services/resume";

export const profileRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads");

const ProjectZ = z.object({ name: z.string(), description: z.string().default(""), technologies: z.array(z.string()).default([]), url: z.string().optional(), highlights: z.array(z.string()).optional() });

const ProfilePatch = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  targetRoles: z.array(z.enum(TARGET_ROLES)).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(ProjectZ).optional(),
  experience: z.array(z.object({ company: z.string(), title: z.string(), start: z.string().optional(), end: z.string().optional(), description: z.string().optional(), technologies: z.array(z.string()).optional() })).optional(),
  education: z.array(z.object({ institution: z.string(), degree: z.string().optional(), field: z.string().optional(), start: z.string().optional(), end: z.string().optional(), grade: z.string().optional() })).optional(),
  links: z.object({ github: z.string().optional(), linkedin: z.string().optional(), portfolio: z.string().optional() }).optional(),
  preferences: z
    .object({
      workModes: z.array(z.enum(WORK_MODES)).default([]),
      cities: z.array(z.string()).default([]),
      expectedComp: z.object({ min: z.number().optional(), max: z.number().optional(), currency: z.string(), period: z.enum(["month", "year"]) }).optional(),
      companySizes: z.array(z.enum(COMPANY_SIZES)).default([]),
      industries: z.array(z.string()).default([]),
      employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).default([]),
    })
    .optional(),
  writingSample: z.string().max(10000).optional(),
  college: z.string().optional(),
  timezone: z.string().optional(),
  publicVisible: z.boolean().optional(),
  resumeUrl: z.string().url().optional().or(z.literal("")),
});

profileRouter.get("/", async (req, res) => {
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, me(req).id));
  res.json({ profile });
});

profileRouter.put("/", async (req, res) => {
  const user = me(req);
  const body = ProfilePatch.parse(req.body);
  const { name, phone, ...p } = body;
  if (name || phone !== undefined) await db.update(schema.users).set({ ...(name ? { name } : {}), ...(phone !== undefined ? { phone } : {}) }).where(eq(schema.users.id, user.id));
  const patch: Partial<typeof schema.profiles.$inferInsert> = { ...p, updatedAt: new Date() };
  if (p.skills) patch.skills = normalizeSkills(p.skills);
  if (p.resumeUrl === "") patch.resumeUrl = null;
  if (p.writingSample) patch.writingStyle = await analyzeWritingStyle(p.writingSample);
  if (p.preferences?.cities?.length && !p.timezone) patch.timezone = guessTimezone(p.preferences.cities[0], "UTC");
  const [profile] = await db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, user.id)).returning();
  if (p.skills || p.targetRoles || p.preferences || p.experienceLevel || p.projects) await scoreJobsForUser(user.id);
  res.json({ profile });
});

/** Upload a PDF resume (or LinkedIn "Save to PDF" export): AI extracts skills, projects, experience, education. */
profileRouter.post("/resume", upload.single("file"), async (req, res) => {
  const user = me(req);
  const text = typeof req.body?.text === "string" ? req.body.text : undefined;
  if (!req.file && !text) throw badRequest("Attach a PDF as 'file' or send 'text'");
  if (req.file && req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) throw badRequest("Only PDF resumes are supported");
  const { resume, text: extracted, source } = await parseResume({ pdf: req.file?.buffer, text });
  let resumeUrl: string | undefined;
  if (req.file) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const fname = `${user.id}.pdf`;
    await writeFile(path.join(UPLOAD_DIR, fname), req.file.buffer);
    resumeUrl = `${config.API_URL}/api/public/resume/${user.publicSlug}.pdf`;
  }
  const [current] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const mergeReplace = req.query.mode !== "merge";
  const [profile] = await db
    .update(schema.profiles)
    .set({
      headline: resume.headline ?? current.headline,
      summary: resume.summary ?? current.summary,
      skills: normalizeSkills(mergeReplace ? resume.skills : [...current.skills, ...resume.skills]),
      projects: mergeReplace ? resume.projects : [...current.projects, ...resume.projects],
      experience: resume.experience,
      education: resume.education,
      links: { ...current.links, ...Object.fromEntries(Object.entries(resume.links).filter(([, v]) => v)) },
      yearsExperience: resume.yearsExperience,
      experienceLevel: resume.yearsExperience >= 1 ? "experienced" : current.experienceLevel,
      college: current.college ?? resume.education[0]?.institution ?? null,
      resumeText: extracted.slice(0, 50000),
      resumeFileName: req.file?.originalname ?? current.resumeFileName,
      resumeUrl: resumeUrl ?? current.resumeUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, user.id))
    .returning();
  if (resume.name && user.name !== resume.name && user.name.length < 3) await db.update(schema.users).set({ name: resume.name }).where(eq(schema.users.id, user.id));
  res.json({ profile, parsed: resume, source });
});

/** Connect GitHub / portfolio / LinkedIn to enrich the profile. */
profileRouter.post("/enrich", async (req, res) => {
  const user = me(req);
  const body = z.object({ github: z.string().optional(), portfolio: z.string().optional(), linkedin: z.string().optional() }).parse(req.body);
  const [current] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const enrichment: Record<string, unknown> = { ...current.enrichment };
  let skills = [...current.skills];
  let projects: Project[] = [...current.projects];
  const errors: string[] = [];
  if (body.github) {
    const gh = await enrichGithub(body.github);
    if (gh) {
      enrichment.github = gh;
      skills = normalizeSkills([...skills, ...gh.skills]);
      const known = new Set(projects.map((p) => p.name.toLowerCase()));
      projects = [...projects, ...githubReposToProjects(gh).filter((p) => !known.has(p.name.toLowerCase()))];
    } else errors.push("Couldn't read that GitHub profile");
  }
  if (body.portfolio) {
    const pf = await enrichPortfolio(body.portfolio);
    if (pf) {
      enrichment.portfolio = pf;
      skills = normalizeSkills([...skills, ...pf.skills]);
      const known = new Set(projects.map((p) => p.name.toLowerCase()));
      projects = [...projects, ...pf.projects.filter((p) => !known.has(p.name.toLowerCase()))];
    } else errors.push("Couldn't read that portfolio site");
  }
  if (body.linkedin) enrichment.linkedin = linkedinNote(body.linkedin);
  const [profile] = await db
    .update(schema.profiles)
    .set({ enrichment, skills, projects, links: { ...current.links, ...Object.fromEntries(Object.entries(body).filter(([, v]) => v)) }, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, user.id))
    .returning();
  res.json({ profile, errors });
});

profileRouter.post("/complete-onboarding", async (req, res) => {
  const user = me(req);
  await db.update(schema.users).set({ onboardedAt: new Date() }).where(eq(schema.users.id, user.id));
  const scored = await scoreJobsForUser(user.id);
  res.json({ ok: true, scored });
});
