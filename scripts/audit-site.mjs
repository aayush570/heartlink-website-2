import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const contentDir = join(publicDir, "content");
const liveRoutes = new Set(["/", "/about", "/membership", "/partnerships", "/careers", "/apply", "/contact", "/privacy"]);
const dynamicRoutes = new Set(["/robots.txt", "/sitemap.xml"]);
const issues = [];

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

if (issues.length) {
  console.error(`Site audit failed with ${issues.length} issue(s):`);
  issues.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Site audit passed");
