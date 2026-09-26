import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const contentDir = join(publicDir, "content");
const liveRoutes = new Set(["/"]);
const dynamicRoutes = new Set(["/robots.txt", "/sitemap.xml"]);
const issues = [];
const htmlRecords = [];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function issue(message) {
  issues.push(message);
}

function publicPathExists(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!cleanPath || cleanPath === "/") return true;
  if (liveRoutes.has(cleanPath) || dynamicRoutes.has(cleanPath) || cleanPath.startsWith("/api/")) return true;
  const filePath = normalize(join(publicDir, cleanPath.replace(/^\//, "")));
  return filePath.startsWith(publicDir) && existsSync(filePath);
}

function collectJsonStrings(value, strings = []) {
  if (Array.isArray(value)) value.forEach((item) => collectJsonStrings(item, strings));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectJsonStrings(item, strings));
  else if (typeof value === "string") strings.push(value);
  return strings;
}

for (const file of readdirSync(contentDir).filter((name) => name.endsWith(".json"))) {
  const fullPath = join(contentDir, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    issue(`${fullPath}: invalid JSON (${error.message})`);
    continue;
  }

  for (const value of collectJsonStrings(parsed)) {
    if (/^\/(?:media\/|Heartlink Logo\.png)/.test(value) && !publicPathExists(value)) {
      issue(`${fullPath}: missing public asset ${value}`);
    }
  }
}

for (const stale of ["public/content/impact.json", "public/content/methodology.json", "public/impact.html", "public/methodology.html"]) {
  if (existsSync(join(root, stale))) issue(`${stale}: stale redirect-era file should not be present`);
}

for (const file of walk(publicDir)) {
  const relative = file.replace(`${root}/`, "");
  const extension = extname(file);
  if (![".html", ".json", ".js"].includes(extension)) continue;
  const text = readFileSync(file, "utf8");

  if ([".html", ".json"].includes(extension) && /(TODO|FIXME|Placeholder anonymized|coming soon|Use this area|can be added here)/i.test(text)) {
    issue(`${relative}: contains draft or placeholder marker`);
  }

  if (extension === ".html") {
    const title = text.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "";
    const descriptionMatch = text.match(/<meta\s+name=(["'])description\1\s+content=(["'])(.*?)\2/i);
    const description = descriptionMatch?.[3]?.trim() || "";
    const canonical = text.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]?.trim() || "";
    const h1Count = (text.match(/<h1\b/gi) || []).length;
    const is404 = relative === "public/404.html";
    htmlRecords.push({ relative, title, description, canonical, is404 });

    if (!/<html\s+lang=["']en-IN["']/i.test(text)) issue(`${relative}: html language must be en-IN`);
    if (h1Count !== 1) issue(`${relative}: expected exactly one h1, found ${h1Count}`);
    if (!title || title.length > 65) issue(`${relative}: missing or overly long title (${title.length} characters)`);
    if (!is404 && (description.length < 80 || description.length > 170)) issue(`${relative}: meta description should be 80-170 characters (${description.length})`);
    if (!is404 && !/^https:\/\/heartlink\.in(?:\/|$)/.test(canonical)) issue(`${relative}: canonical must use the production https://heartlink.in origin`);
    if (!is404 && !/<meta\s+property=["']og:title["']/i.test(text)) issue(`${relative}: missing static Open Graph title`);
    if (!is404 && !/<meta\s+property=["']og:url["']/i.test(text)) issue(`${relative}: missing static Open Graph URL`);
    if (!is404 && !/<meta\s+name=["']twitter:card["']/i.test(text)) issue(`${relative}: missing static Twitter card metadata`);
    if (is404 && !/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(text)) issue(`${relative}: 404 page must be noindex`);
    if (!/\/styles\.css\?v=29/.test(text)) issue(`${relative}: stylesheet version is not current`);
    if (!/\/app\.js\?v=13/.test(text)) issue(`${relative}: app script version is not current`);

    for (const image of text.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt=["'][^"']*["']/i.test(image[0])) issue(`${relative}: image is missing an alt attribute`);
    }
    for (const external of text.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
      if (!/\brel=["'][^"']*noopener/i.test(external[0])) issue(`${relative}: target=_blank link is missing rel=noopener`);
    }

    for (const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(target)) continue;
      if (!target.startsWith("/")) continue;
      if (!publicPathExists(target)) issue(`${relative}: broken local reference ${target}`);
      if (/^\/(?:impact|methodology)(?:\.html)?(?:[#?]|$)/.test(target)) {
        issue(`${relative}: links to stale route ${target}`);
      }
    }
  }
}

for (const field of ["title", "description"]) {
  const seen = new Map();
  for (const record of htmlRecords.filter((item) => !item.is404)) {
    const value = record[field];
    if (!value) continue;
    if (seen.has(value)) issue(`${record.relative}: duplicate ${field} also used by ${seen.get(value)}`);
    else seen.set(value, record.relative);
  }
}

const siteSettings = JSON.parse(readFileSync(join(contentDir, "site.json"), "utf8"));
if (siteSettings.siteUrl !== "https://heartlink.in") issue("public/content/site.json: siteUrl must be https://heartlink.in");
if (!/^#[0-9a-f]{6}$/i.test(siteSettings.primaryColor || "")) issue("public/content/site.json: primaryColor must be a six-digit hex colour");
if (siteSettings.themeColor?.toUpperCase() !== "#38103F") issue("public/content/site.json: browser theme must use the current lighter plum #38103F");
if (siteSettings.primaryColor?.toUpperCase() !== "#38103F") issue("public/content/site.json: primary colour must use the current lighter plum #38103F");
if (siteSettings.secondaryAccentColor?.toUpperCase() !== "#5B2762") issue("public/content/site.json: secondary accent must use coordinated plum #5B2762");

const privacy = JSON.parse(readFileSync(join(contentDir, "privacy.json"), "utf8"));
if ((privacy.content?.sections || []).length < 6) issue("public/content/privacy.json: privacy notice must retain all launch sections");

const membership = JSON.parse(readFileSync(join(contentDir, "membership.json"), "utf8"));
if ((membership.steps || []).length > 5) issue("public/content/membership.json: service process has become too long");

const vercelConfigPath = join(root, "vercel.json");
if (!existsSync(vercelConfigPath)) {
  issue("vercel.json: missing Vercel static deployment configuration");
} else {
  try {
    const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
    if (vercelConfig.buildCommand !== "npm run audit") issue("vercel.json: buildCommand must run the deployment audit");
    if (vercelConfig.outputDirectory !== "public") issue("vercel.json: outputDirectory must be public");
    if (vercelConfig.cleanUrls !== true) issue("vercel.json: cleanUrls must remain enabled");
  } catch (error) {
    issue(`vercel.json: invalid JSON (${error.message})`);
  }
}
if (existsSync(join(root, "server.ts"))) issue("server.ts: root listener would route static pages through a Vercel function");
if (existsSync(join(root, "server.mjs"))) issue("server.mjs: root server entry could override the Vercel static deployment");
if (!existsSync(join(root, "api/submissions.mjs"))) issue("api/submissions.mjs: missing Vercel submission function");
if (!existsSync(join(publicDir, "robots.txt"))) issue("public/robots.txt: missing static crawler policy");
if (!existsSync(join(publicDir, "sitemap.xml"))) issue("public/sitemap.xml: missing static sitemap");

if (issues.length) {
  console.error(`Site audit failed with ${issues.length} issue(s):`);
  issues.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Site audit passed");
