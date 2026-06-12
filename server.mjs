import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const publicDir = join(process.cwd(), "public");
const isProduction = process.env.NODE_ENV === "production";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const pageRoutes = new Map([
  ["/", "index.html"],
  ["/about", "about.html"],
  ["/methodology", "methodology.html"],
  ["/membership", "membership.html"],
  ["/impact", "impact.html"],
  ["/careers", "careers.html"],
  ["/apply", "apply.html"]
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 50_000) throw new Error("Payload too large");
  }
  return JSON.parse(body);
}

function validApplication(data) {
  const required = ["name", "email", "phone", "city", "linkedin", "instagram", "consent"];
  return required.every((key) => data[key]) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    /^https?:\/\/(www\.)?linkedin\.com\//i.test(data.linkedin) &&
    /^https?:\/\/(www\.)?instagram\.com\//i.test(data.instagram);
}

async function handleApplication(request, response) {
  try {
    const application = await readBody(request);
    if (!validApplication(application)) {
      return sendJson(response, 422, { message: "Please complete every required field with valid profile URLs." });
    }

    const reference = `HL-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const webhook = process.env.HEARTLINK_APPLICATION_WEBHOOK;

    if (webhook) {
      const delivery = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...application, reference, submittedAt: new Date().toISOString() })
      });
      if (!delivery.ok) throw new Error("Application delivery failed");
    } else if (isProduction) {
      return sendJson(response, 503, { message: "The private desk is temporarily unavailable. Please try again shortly." });
    }

    return sendJson(response, 202, {
      message: "Your private introduction has been received.",
      reference
    });
  } catch (error) {
    const status = error.message === "Payload too large" ? 413 : 400;
    return sendJson(response, status, { message: "We could not receive this application. Please review and try again." });
  }
}

async function serveFile(response, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not found");
    const data = await readFile(filePath);
    const extension = extname(filePath);
    const cache = [".html", ".json"].includes(extension) ? "no-cache" : "public, max-age=604800";
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    });
    response.end(data);
  } catch {
    const fallback = await readFile(join(publicDir, "404.html"));
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && url.pathname === "/api/applications") {
    return handleApplication(request, response);
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  let relativePath = pageRoutes.get(url.pathname);
  if (!relativePath) {
    relativePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]/, "");
  }

  const filePath = join(publicDir, relativePath || "index.html");
  if (!filePath.startsWith(publicDir)) return serveFile(response, join(publicDir, "404.html"));
  return serveFile(response, filePath);
}).listen(port, () => {
  console.log(`HeartLink private site listening at http://localhost:${port}`);
});
