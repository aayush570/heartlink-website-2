import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 4173);
const publicDir = join(process.cwd(), "public");
const isProduction = process.env.NODE_ENV === "production";
const submissionAttempts = new Map();
const rateWindowMs = 10 * 60 * 1000;
const maxSubmissionsPerWindow = 6;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const pageRoutes = new Map([
  ["/", "index.html"],
  ["/about", "about.html"],
  ["/membership", "membership.html"],
  ["/partnerships", "partnerships.html"],
  ["/careers", "careers.html"],
  ["/apply", "apply.html"],
  ["/contact", "contact.html"],
  ["/privacy", "privacy.html"]
]);

const redirectRoutes = new Map([
  ["/impact", "/about#trust"],
  ["/impact.html", "/about#trust"],
  ["/methodology", "/membership#process"],
  ["/methodology.html", "/membership#process"]
]);

const liveRoutes = ["/", "/about", "/membership", "/partnerships", "/careers", "/apply", "/contact", "/privacy"];
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
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
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ""
  ].join("\n");
}

function sitemapXml(baseUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = liveRoutes.map((route) => `  <url><loc>${baseUrl}${route}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function requestOriginAllowed(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(raw || request.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const current = submissionAttempts.get(key) || { count: 0, resetAt: now + rateWindowMs };
  if (current.resetAt <= now) {
    submissionAttempts.set(key, { count: 1, resetAt: now + rateWindowMs });
    return false;
  }
  current.count += 1;
  submissionAttempts.set(key, current);
  return current.count > maxSubmissionsPerWindow;
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 50_000) throw new Error("Payload too large");
  }
  return JSON.parse(body);
}

const submissionRequirements = {
  application: ["applicantName", "age", "address", "designation", "company", "school", "undergraduate", "linkedinProfile", "instagramProfile", "fatherProfession", "fatherCompany", "motherProfession", "motherCompany", "familyResidence", "contactName", "relationship", "email", "phone", "consent"],
  contact: ["name", "email", "phone", "enquiryRole", "consent"],
  partnership: ["name", "practice", "email", "phone", "partnershipType", "consent"]
};

const allowedFields = {
  application: new Set(["type", "applyingFor", "contactName", "relationship", "email", "phone", "applicantName", "age", "address", "company", "designation", "school", "undergraduate", "postgraduate", "instagramProfile", "linkedinProfile", "introduction", "fatherName", "fatherProfession", "fatherCompany", "motherName", "motherProfession", "motherCompany", "familyResidence", "familyValues", "membershipInterest", "consent", "submittedFrom"]),
  contact: new Set(["type", "name", "email", "phone", "enquiryRole", "message", "consent", "submittedFrom"]),
  partnership: new Set(["type", "name", "practice", "email", "phone", "partnerWebsite", "partnershipType", "message", "consent", "submittedFrom"])
};

function validSubmission(data) {
  const required = submissionRequirements[data.type];
  return required &&
    required.every((key) => typeof data[key] === "boolean" ? data[key] : String(data[key] || "").trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    String(data.phone).replace(/\D/g, "").length >= 7;
}

function cleanSubmission(data) {
  const type = typeof data.type === "string" ? data.type : "";
  const allowed = allowedFields[type];
  if (!allowed) return data;
  return Object.fromEntries(Object.entries(data)
    .filter(([key]) => allowed.has(key))
    .map(([key, value]) => [key, typeof value === "string" ? value.trim().slice(0, 2000) : value]));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function submissionRows(submission) {
  return Object.entries(submission)
    .filter(([key]) => !["consent"].includes(key))
    .map(([key, value]) => `<tr><th style="padding:8px;text-align:left;vertical-align:top">${escapeHtml(key)}</th><td style="padding:8px">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`)
    .join("");
}

async function storeInSupabase(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(record)
  });
  if (!response.ok) throw new Error("Database delivery failed");
  return true;
}

async function sendNotification(record) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.HEARTLINK_NOTIFICATION_EMAIL;
  const sender = process.env.HEARTLINK_FROM_EMAIL;
  if (!apiKey || !recipient || !sender) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      reply_to: record.payload.email,
      subject: `HeartLink ${record.submission_type} submission · ${record.reference}`,
      html: `<h1>New HeartLink submission</h1><p><strong>Reference:</strong> ${escapeHtml(record.reference)}</p><table style="border-collapse:collapse">${submissionRows(record.payload)}</table>`
    })
  });
  if (!response.ok) throw new Error("Email notification failed");
  return true;
}

async function handleSubmission(request, response) {
  try {
    const contentType = request.headers["content-type"] || "";
    if (!String(contentType).includes("application/json")) {
      return sendJson(response, 415, { message: "Please submit this enquiry again from the HeartLink website." });
    }
    if (!requestOriginAllowed(request)) {
      return sendJson(response, 403, { message: "Please submit this enquiry again from the HeartLink website." });
    }
    if (rateLimited(request)) {
      return sendJson(response, 429, { message: "Too many attempts. Please wait a few minutes before trying again." });
    }

    const rawSubmission = await readBody(request);
    if (rawSubmission.website) {
      return sendJson(response, 202, {
        message: "Your private enquiry has been received.",
        reference: `HL-${new Date().getUTCFullYear()}-REVIEW`
      });
    }

    const submission = cleanSubmission(rawSubmission);
    if (!validSubmission(submission)) {
      return sendJson(response, 422, { message: "Please complete every required field with valid contact details." });
    }

    const reference = `HL-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    const record = {
      reference,
      submission_type: submission.type,
      submitted_at: submittedAt,
      payload: submission
    };
    const webhook = process.env.HEARTLINK_APPLICATION_WEBHOOK;
    const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.HEARTLINK_NOTIFICATION_EMAIL && process.env.HEARTLINK_FROM_EMAIL);

    if (webhook) {
      const delivery = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
      if (!delivery.ok) throw new Error("Application delivery failed");
    }

    const [stored, notified] = await Promise.all([
      storeInSupabase(record),
      sendNotification(record)
    ]);
    console.info(JSON.stringify({
      event: "heartlink_submission_delivery",
      reference,
      type: submission.type,
      stored,
      notified,
      webhook: Boolean(webhook),
      submittedAt
    }));

    if (isProduction && !webhook && (!hasSupabase || !hasResend || !stored || !notified)) {
      console.warn(JSON.stringify({
        event: "heartlink_submission_delivery_incomplete",
        reference,
        type: submission.type,
        stored,
        notified,
        hasSupabase,
        hasResend
      }));
      return sendJson(response, 503, { message: "The private desk is temporarily unavailable. Please try again shortly." });
    }

    return sendJson(response, 202, {
      message: submission.type === "application" ? "Your private application has been received." : "Your private enquiry has been received.",
      reference
    });
  } catch (error) {
    const status = error.message === "Payload too large" ? 413 : 400;
    console.warn(JSON.stringify({
      event: "heartlink_submission_error",
      status,
      message: error.message
    }));
    return sendJson(response, status, { message: "We could not receive this enquiry. Please review the details and try again." });
  }
}

async function serveFile(request, response, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not found");
    const data = await readFile(filePath);
    const extension = extname(filePath);
    const cache = [".html", ".json", ".css", ".js"].includes(extension) ? "no-cache" : "public, max-age=604800";
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

createServer(async (request, response) => {
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
}).listen(port, () => {
  console.log(`HeartLink private site listening at http://localhost:${port}`);
});
