import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { handleSubmission } from "../lib/submissions.mjs";

const port = Number(process.env.PORT || 4173);
const publicDir = join(process.cwd(), "public");
const isProduction = process.env.NODE_ENV === "production";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const pageRoutes = new Map([
  ["/", "index.html"]
]);

const redirectRoutes = new Map([
  ["/about", "/#about"], ["/about.html", "/#about"],
  ["/membership", "/#services"], ["/membership.html", "/#services"],
  ["/partnerships", "/#partners"], ["/partnerships.html", "/#partners"],
  ["/careers", "/#careers"], ["/careers.html", "/#careers"],
  ["/apply", "/#contact"], ["/apply.html", "/#contact"],
  ["/contact", "/#contact"], ["/contact.html", "/#contact"],
  ["/privacy", "/#privacy"], ["/privacy.html", "/#privacy"],
  ["/impact", "/#about"], ["/impact.html", "/#about"],
  ["/methodology", "/#process"], ["/methodology.html", "/#process"]
]);

const liveRoutes = new Map([
  ["/", { priority: "1.0", changefreq: "weekly" }]
]);
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  ...(isProduction ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {})
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders
  });
  response.end(JSON.stringify(body));
}

function requestBaseUrl(request) {
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost";
  return `${String(protocol).split(",")[0]}://${String(host).split(",")[0]}`;
}

function sendRedirect(response, location, permanent = true) {
  response.writeHead(permanent ? 301 : 302, {
    Location: location,
    "Cache-Control": "public, max-age=3600",
    ...securityHeaders
  });
  response.end();
}

function sendText(response, status, body, contentType) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
    ...securityHeaders
  });
  response.end(body);
}

function robotsTxt(baseUrl) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /content/",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ""
  ].join("\n");
}

function sitemapXml(baseUrl) {
  const urls = [...liveRoutes.entries()].map(([route, settings]) => `  <url><loc>${baseUrl}${route}</loc><changefreq>${settings.changefreq}</changefreq><priority>${settings.priority}</priority></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function htmlMetadata(html) {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "HeartLink";
  const descriptionMatch = html.match(/<meta\s+name=(["'])description\1\s+content=(["'])(.*?)\2/i);
  const description = descriptionMatch?.[3]?.trim() || "";
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]?.trim() || "https://heartlink.in/";
  const image = "https://heartlink.in/media/heartlink-heritage-invitation.png";
  const tags = [
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:image", image],
    ["property", "og:url", canonical],
    ["property", "og:type", "website"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image]
  ];
  const additions = tags
    .filter(([attribute, key, value]) => value && !new RegExp(`<meta\\s+${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html))
    .map(([attribute, key, value]) => `  <meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}">`)
    .join("\n");
  return additions ? html.replace("</head>", `${additions}\n</head>`) : html;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function serveFile(request, response, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not found");
    let data = await readFile(filePath);
    const extension = extname(filePath);
    if (extension === ".html") data = Buffer.from(htmlMetadata(data.toString("utf8")));
    const cache = [".html", ".json"].includes(extension)
      ? "public, max-age=0, must-revalidate"
      : [".css", ".js"].includes(extension)
        ? "public, max-age=604800, stale-while-revalidate=86400"
        : "public, max-age=2592000, stale-while-revalidate=604800";
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": cache,
      ...securityHeaders
    });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    const fallback = await readFile(join(publicDir, "404.html"));
    response.writeHead(404, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      ...securityHeaders
    });
    response.end(request.method === "HEAD" ? undefined : fallback);
  }
}

export const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host}`);
  } catch {
    return sendJson(response, 400, { message: "Bad request" });
  }

  if (request.method === "POST" && ["/api/submissions", "/api/applications"].includes(url.pathname)) {
    return handleSubmission(request, response);
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  const redirectLocation = redirectRoutes.get(url.pathname);
  if (redirectLocation) return sendRedirect(response, redirectLocation);

  if (url.pathname === "/robots.txt") {
    return sendText(response, 200, robotsTxt(requestBaseUrl(request)), "text/plain; charset=utf-8");
  }

  if (url.pathname === "/sitemap.xml") {
    return sendText(response, 200, sitemapXml(requestBaseUrl(request)), "application/xml; charset=utf-8");
  }

  let relativePath = pageRoutes.get(url.pathname);
  if (!relativePath) {
    try {
      relativePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]/, "");
    } catch {
      return sendJson(response, 400, { message: "Bad request" });
    }
  }

  const filePath = join(publicDir, relativePath || "index.html");
  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`)) {
    return serveFile(request, response, join(publicDir, "404.html"));
  }
  return serveFile(request, response, filePath);
});

export function startServer() {
  if (server.listening) return server;
  return server.listen(port, () => {
    console.log(`HeartLink private site listening at http://localhost:${port}`);
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) startServer();
