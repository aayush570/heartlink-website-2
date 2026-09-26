import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import vercelSubmissionHandler from "../api/submissions.mjs";

const port = 44000 + (process.pid % 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["scripts/local-server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), NODE_ENV: "development" },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invokeVercelFunction({ method = "POST", body, ip = "203.0.113.10" } = {}) {
  const request = Readable.from([]);
  request.method = method;
  request.body = body;
  request.headers = {
    host: "heartlink.in",
    origin: "https://heartlink.in",
    "content-type": "application/json",
    "x-forwarded-for": ip,
    "x-forwarded-host": "heartlink.in"
  };
  request.socket = { remoteAddress: ip };

  const chunks = [];
  const response = {
    statusCode: 200,
    headers: {},
    writeHead(status, headers = {}) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.from(chunk));
    }
  };
  await vercelSubmissionHandler(request, response);
  return {
    status: response.statusCode,
    headers: response.headers,
    body: Buffer.concat(chunks).toString("utf8")
  };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local server did not start. ${serverOutput.trim()}`);
}

try {
  await waitForServer();

  for (const route of ["/"]) {
    const response = await fetch(`${origin}${route}`);
    const html = await response.text();
    assert(response.status === 200, `${route} returned ${response.status}`);
    assert(response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), `${route} is missing the security policy`);
    assert(/<title>[^<]+<\/title>/i.test(html), `${route} is missing a title`);
    assert(/<meta property="og:title"/i.test(html), `${route} is missing server-rendered Open Graph metadata`);
    assert(/<link rel="canonical" href="https:\/\/heartlink\.in/i.test(html), `${route} is missing a production canonical`);
  }

  const missing = await fetch(`${origin}/not-a-real-page`);
  const missingHtml = await missing.text();
  assert(missing.status === 404, `404 route returned ${missing.status}`);
  assert(/noindex, nofollow/i.test(missingHtml), "404 page is not marked noindex");

  for (const [route, destination] of [
    ["/about", "/#about"], ["/membership", "/#services"],
    ["/partnerships", "/#partners"], ["/careers", "/#careers"],
    ["/apply", "/#contact"], ["/contact", "/#contact"],
    ["/privacy", "/#privacy"], ["/methodology", "/#process"]
  ]) {
    const redirect = await fetch(`${origin}${route}`, { redirect: "manual" });
    assert(redirect.status === 301, `${route} returned redirect status ${redirect.status}`);
    assert(redirect.headers.get("location") === destination, `${route} redirect target is incorrect`);
  }

  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert(robots.includes("Disallow: /api/"), "robots.txt does not protect API routes");
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert(sitemap.includes(`<loc>${origin}/</loc>`), "sitemap is missing the single homepage route");
  assert(!sitemap.includes(`${origin}/apply</loc>`), "sitemap still lists retired standalone pages");

  const invalidSubmission = await fetch(`${origin}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ type: "contact" })
  });
  assert(invalidSubmission.status === 422, `invalid form submission returned ${invalidSubmission.status}`);

  const honeypotSubmission = await fetch(`${origin}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ type: "contact", website: "bot.example" })
  });
  assert(honeypotSubmission.status === 202, `honeypot submission returned ${honeypotSubmission.status}`);

  const vercelInvalid = await invokeVercelFunction({ body: { type: "contact" }, ip: "203.0.113.11" });
  assert(vercelInvalid.status === 422, `Vercel function invalid submission returned ${vercelInvalid.status}`);
  assert(vercelInvalid.headers["Cache-Control"] === "no-store", "Vercel function response is cacheable");

  const vercelHoneypot = await invokeVercelFunction({ body: { type: "contact", website: "bot.example" }, ip: "203.0.113.12" });
  assert(vercelHoneypot.status === 202, `Vercel function honeypot returned ${vercelHoneypot.status}`);

  const vercelMethod = await invokeVercelFunction({ method: "GET", ip: "203.0.113.13" });
  assert(vercelMethod.status === 405, `Vercel function GET returned ${vercelMethod.status}`);

  const deliveryKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "HEARTLINK_NOTIFICATION_EMAIL", "HEARTLINK_FROM_EMAIL", "HEARTLINK_APPLICATION_WEBHOOK", "VERCEL"];
  const savedDeliveryEnvironment = Object.fromEntries(deliveryKeys.map((key) => [key, process.env[key]]));
  deliveryKeys.forEach((key) => { delete process.env[key]; });
  process.env.VERCEL = "1";
  try {
    const vercelWithoutDelivery = await invokeVercelFunction({
      body: {
        type: "contact",
        name: "Deployment Test",
        email: "deployment-test@example.com",
        phone: "+91 99999 99999",
        enquiryRole: "For myself",
        consent: "yes"
      },
      ip: "203.0.113.14"
    });
    assert(vercelWithoutDelivery.status === 503, `Vercel function without delivery configuration returned ${vercelWithoutDelivery.status}`);
  } finally {
    deliveryKeys.forEach((key) => {
      if (savedDeliveryEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = savedDeliveryEnvironment[key];
    });
  }

  console.log("Runtime smoke test passed");
} finally {
  server.kill("SIGTERM");
}
