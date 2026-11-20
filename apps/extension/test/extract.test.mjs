import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Runs the real in-page extractor against sample pages in a headless browser.
import { existsSync } from "node:fs";

const fnSource = readFileSync(new URL("../src/extract.js", import.meta.url), "utf8").replace("export function", "function");
const executablePath = "/opt/pw-browsers/chromium";

async function run(html, url) {
  const browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto(url);
  const result = await page.evaluate(`${fnSource}\nextractPage()`);
  await browser.close();
  return result;
}

test("extracts a Greenhouse-style job posting", async () => {
  const r = await run(`<html><head><title>Frontend Engineer at Acme</title><meta property="og:site_name" content="Acme"></head><body><main><h1>Frontend Engineer</h1><p>React and TypeScript</p></main></body></html>`, "https://boards.greenhouse.io/acme/jobs/1");
  assert.equal(r.kind, "job");
  assert.equal(r.job.title, "Frontend Engineer");
  assert.equal(r.job.company, "Acme");
});

test("extracts a LinkedIn profile", async () => {
  const r = await run(`<html><body><h1>Riya Kapoor</h1><div class="text-body-medium">Co-founder & CEO at PayNest</div></body></html>`, "https://www.linkedin.com/in/riya-kapoor/");
  assert.equal(r.kind, "profile");
  assert.equal(r.person.name, "Riya Kapoor");
  assert.equal(r.person.title, "Co-founder & CEO");
  assert.equal(r.person.company, "PayNest");
});

test("falls back to a company site", async () => {
  const r = await run(`<html><head><title>PayNest: checkout</title></head><body><p>Hello</p></body></html>`, "https://paynest.io/");
  assert.equal(r.kind, "company");
  assert.equal(r.companyWebsite, "https://paynest.io");
});
