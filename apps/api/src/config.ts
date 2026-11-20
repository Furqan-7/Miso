import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/jobpilot"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("dev-secret-change-me-please-32chars"),
  ENCRYPTION_KEY: z.string().default("dev-encryption-key-change-me-32bytes!"),
  APP_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:4000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  AI_DISABLED: z.coerce.boolean().default(false),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_PUBSUB_TOPIC: z.string().optional(), // projects/<id>/topics/<name>
  GOOGLE_PUBSUB_VERIFICATION_TOKEN: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT: z.string().default("common"),
  OUTLOOK_WEBHOOK_CLIENT_STATE: z.string().default("jobpilot-outlook"),

  GITHUB_TOKEN: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  HUNTER_API_KEY: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(), // e.g. whatsapp:+14155238886

  CAL_COM_LINK: z.string().optional(),
  SMTP_VERIFY_FROM: z.string().default("verify@example.com"),
  SMTP_VERIFY_ENABLED: z.coerce.boolean().default(true),
  DISCOVERY_COMPANIES: z.string().optional(), // comma list like greenhouse:stripe,lever:netflix
  OFFLINE: z.coerce.boolean().default(false), // skip all outbound network calls (tests)
  RUN_SCHEDULER_INLINE: z.coerce.boolean().default(false), // run ticks in the API process when no worker
});

export const config = Env.parse(process.env);
export type Config = typeof config;

export const aiEnabled = () => Boolean(config.ANTHROPIC_API_KEY) && !config.AI_DISABLED && !config.OFFLINE;
