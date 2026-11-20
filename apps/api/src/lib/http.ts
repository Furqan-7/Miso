import { config } from "../config";

export class OfflineError extends Error {
  constructor(url: string) {
    super(`network disabled (OFFLINE=true): ${url}`);
  }
}

const UA = "JobPilotBot/0.1 (+job-search assistant; respects robots.txt)";

/** fetch with timeout, a polite user agent, and an OFFLINE kill-switch for tests. */
export async function httpFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  if (config.OFFLINE) throw new OfflineError(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 15000);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "application/json, text/html;q=0.9, */*;q=0.8", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T = unknown>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const res = await httpFetch(url, init);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const res = await httpFetch(url, init);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Pause between requests to the same host. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
